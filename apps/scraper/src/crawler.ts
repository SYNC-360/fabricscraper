import { PlaywrightCrawler, CheerioCrawler, HttpCrawler } from 'crawlee';
import { Page } from 'playwright';
import { Product } from '@packages/schemas';
import { logger, computePrices, normalizeSpecKey, computeProductHash } from '@packages/utils';
import { config } from './config.js';
import { selectors } from './selectors.js';

interface CrawlStats {
  productsParsed: number;
  productsValid: number;
  pagesCrawled: number;
  errors: Array<{ url: string; error: string }>;
}

const stats: CrawlStats = {
  productsParsed: 0,
  productsValid: 0,
  pagesCrawled: 0,
  errors: [],
};

/**
 * Try multiple selectors until one works
 */
async function selectFirst(page: Page, selectors: string[]): Promise<string | null> {
  for (const selector of selectors) {
    try {
      const el = await page.$(selector);
      if (el) return selector;
    } catch (err) {
      // selector failed, try next
    }
  }
  return null;
}

/**
 * Extract text from first matching selector
 */
async function extractText(page: Page, selectorList: string[]): Promise<string> {
  const selector = await selectFirst(page, selectorList);
  if (!selector) return '';
  try {
    return (await page.$eval(selector, (el) => el.textContent || ''))
      .trim()
      .replace(/\s+/g, ' ');
  } catch {
    return '';
  }
}

/**
 * Extract attribute from first matching selector
 */
async function extractAttr(
  page: Page,
  selectorList: string[],
  attr: string
): Promise<string> {
  const selector = await selectFirst(page, selectorList);
  if (!selector) return '';
  try {
    return (
      (await page.$eval(selector, (el, attr) => el.getAttribute(attr), attr)) || ''
    ).trim();
  } catch {
    return '';
  }
}

/**
 * Parse product detail page
 */
export async function parsePDP(page: Page, url: string): Promise<Product | null> {
  try {
    const title = await extractText(page, selectors.pdp.title);
    const skuText = await extractText(page, selectors.pdp.sku);
    let sku = skuText.replace(/^sku:\s*|^sku\s*/i, '').trim();

    // Fallback: extract from HTML or meta
    if (!sku) {
      sku = await extractAttr(page, selectors.pdp.sku, 'data-sku');
    }
    if (!sku) {
      sku = `UF-${Date.now()}`;
    }

    if (!title) {
      logger.warn({ url }, 'Could not extract title from PDP');
      return null;
    }

    // Extract description
    const descriptionHtml = await extractAttr(page, selectors.pdp.description, 'innerHTML');

    // Extract images (prefer <a href> for full-res)
    const images: Product['images'] = [];
    try {
      const imageLinks = await page.locator(selectors.pdp.gallery.join(',')).all();
      for (let i = 0; i < Math.min(imageLinks.length, 20); i++) {
        const href = await imageLinks[i].getAttribute('href');
        if (href) {
          images.push({
            src: href,
            position: i + 1,
            alt: title,
          });
        }
      }
    } catch (err) {
      logger.debug({ url, error: String(err) }, 'Failed to extract gallery links');
    }

    // Fallback to img src if no links
    if (images.length === 0) {
      try {
        const imgElements = await page.locator(selectors.pdp.galleryImages.join(',')).all();
        for (let i = 0; i < Math.min(imgElements.length, 20); i++) {
          const src = await imgElements[i].getAttribute('src');
          if (src && (src.includes('.jpg') || src.includes('.png') || src.includes('.webp'))) {
            // Clean up -scaled, -thumb suffixes if present
            const cleanUrl = src.replace(/-scaled|-thumb|-small/gi, '').split('?')[0];
            images.push({
              src: cleanUrl,
              position: i + 1,
              alt: title,
            });
          }
        }
      } catch (err) {
        logger.debug({ url, error: String(err) }, 'Failed to extract gallery images');
      }
    }

    // Parse specifications
    const details: Product['details'] = {};
    try {
      const specTable = await page.$(selectors.pdp.specifications[0]);
      if (specTable) {
        const rows = await page.locator(`${selectors.pdp.specifications[0]} ${selectors.pdp.specRows[0]}`).all();
        for (const row of rows) {
          try {
            const cells = await row.locator('td, th').all();
            if (cells.length >= 2) {
              const keyText = (await cells[0].textContent()).trim().toLowerCase();
              const valText = (await cells[1].textContent()).trim();

              const canonicalKey = normalizeSpecKey(keyText);
              if (canonicalKey) {
                details[canonicalKey as keyof Product['details']] = valText;
              }
            }
          } catch (err) {
            // skip this row
          }
        }
      }
    } catch (err) {
      logger.debug({ url, error: String(err) }, 'Failed to parse specs');
    }

    // Extract color and collection from title or DOM
    let color = '';
    let collection = '';
    try {
      // Try meta tags or data attributes
      color = await extractAttr(page, ['.color'], 'data-color');
      collection = await extractAttr(page, ['.collection'], 'data-collection');
    } catch {
      // fallback to defaults
    }

    // Check stock status
    const inStockSelector = await selectFirst(page, selectors.pdp.inStock);
    const inStock = !!inStockSelector;

    // Extract wholesale price (if visible after login)
    let wholesalePrice: number | null = null;
    try {
      const priceText = await extractText(page, selectors.pdp.price);
      const priceMatch = priceText.match(/\$?([\d.]+)/);
      if (priceMatch) {
        wholesalePrice = parseFloat(priceMatch[1]);
      }
    } catch {
      // no price available
    }

    const { salePrice, retailPrice } = computePrices(wholesalePrice);

    const product: Product = {
      url,
      sku,
      title,
      color: color || undefined,
      collection: collection || undefined,
      brand: 'United Fabrics',
      descriptionHtml: descriptionHtml || undefined,
      details,
      categories: [],
      tags: [],
      wholesalePrice,
      salePrice,
      retailPrice,
      images,
      inStock,
      lastSeen: new Date().toISOString(),
    };

    stats.productsValid++;
    return product;
  } catch (err) {
    logger.error({ url, error: String(err) }, 'Error parsing PDP');
    stats.errors.push({ url, error: String(err) });
    return null;
  }
}

/**
 * Login to United Fabrics
 */
export async function loginToSite(page: Page): Promise<boolean> {
  try {
    logger.info('Attempting login...');
    await page.goto(config.loginUrl, { waitUntil: 'domcontentloaded' });

    // Fill email
    const emailSelector = await selectFirst(page, selectors.login.emailInput);
    if (!emailSelector) {
      logger.warn('Could not find email input');
      return false;
    }
    await page.fill(emailSelector, config.email);

    // Fill password
    const passwordSelector = await selectFirst(page, selectors.login.passwordInput);
    if (!passwordSelector) {
      logger.warn('Could not find password input');
      return false;
    }
    await page.fill(passwordSelector, config.password);

    // Submit
    const submitSelector = await selectFirst(page, selectors.login.submitButton);
    if (submitSelector) {
      await page.click(submitSelector);
    }

    // Wait for account header to indicate successful login
    const accountHeaderSelector = await selectFirst(page, selectors.login.accountHeader);
    if (accountHeaderSelector) {
      await page.waitForSelector(accountHeaderSelector, { timeout: 15000 }).catch(() => {
        logger.warn('Account header not visible after login');
      });
    }

    logger.info('Login flow completed');
    return true;
  } catch (err) {
    logger.error({ error: String(err) }, 'Login failed');
    return false;
  }
}

/**
 * Accept cookies if banner present
 */
export async function acceptCookies(page: Page): Promise<void> {
  try {
    const cookieSelector = await selectFirst(page, selectors.cookieBanner);
    if (cookieSelector) {
      await page.click(cookieSelector).catch(() => {
        // ignore if already dismissed
      });
      await page.waitForTimeout(500);
    }
  } catch (err) {
    logger.debug({ error: String(err) }, 'Cookie acceptance failed (non-critical)');
  }
}

/**
 * Create and configure the Playwright crawler
 */
export function createCrawler(handlePageFunction: (args: any) => Promise<void>) {
  const crawler = new PlaywrightCrawler(
    {
      requestHandlerTimeoutSecs: 180,
      maxRequestsPerCrawl: config.maxPages > 0 ? config.maxPages : undefined,
      maxRequestsPerMinute: 30,
      maxConcurrency: config.concurrency,
      useSessionPool: true,
      sessionPoolOptions: {
        maxPoolSize: config.concurrency,
      },
      preNavigationHooks: [
        async ({ request }, gotoOptions) => {
          gotoOptions.waitUntil = 'domcontentloaded';
          gotoOptions.timeout = config.requestTimeoutMs;
        },
      ],
      postNavigationHooks: [
        async ({ page }) => {
          await acceptCookies(page);
        },
      ],
      headless: true,
      launchContext: {
        launchOptions: {
          args: [
            '--disable-blink-features=AutomationControlled',
            '--disable-dev-shm-usage',
          ],
        },
        // @ts-expect-error Crawlee types
        useChrome: true,
      },
    },
    {
      handlePageFunction,
      failedRequestHandler: async ({ request, error }) => {
        logger.error({ url: request.url, error: String(error) }, 'Request failed');
        stats.errors.push({ url: request.url, error: String(error) });
      },
    }
  );

  return crawler;
}

export { stats };
