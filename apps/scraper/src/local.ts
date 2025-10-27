import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { PlaywrightCrawler } from 'crawlee';
import { Product, ProductSchema } from '@packages/schemas';
import {
  exportShopify,
  exportWooCommerce,
  exportWPAllImport,
} from '@packages/exporters';
import { logger } from '@packages/utils';
import { config } from './config.js';
import {
  loginToSite,
  parsePDP,
  acceptCookies,
  createCrawler,
  stats,
} from './crawler.js';
import { selectors } from './selectors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.join(__dirname, '../../..', 'output');
const logsDir = path.join(outputDir, 'logs');

let productsMap = new Map<string, Product>();
let listingPageCount = 0;

async function ensureDirectories() {
  try {
    await fs.mkdir(outputDir, { recursive: true });
    await fs.mkdir(logsDir, { recursive: true });
  } catch (err) {
    logger.error({ error: String(err) }, 'Failed to create output directories');
  }
}

async function saveRawProducts() {
  const products = Array.from(productsMap.values());
  const jsonlPath = path.join(outputDir, 'raw-products.jsonl');
  try {
    const lines = products.map((p) => JSON.stringify(p)).join('\n');
    await fs.writeFile(jsonlPath, lines + '\n');
    logger.info({ path: jsonlPath, count: products.length }, 'Raw products saved');
  } catch (err) {
    logger.error({ error: String(err) }, 'Failed to save raw products');
  }
}

async function saveLastRunStatus() {
  const lastRun = {
    timestamp: new Date().toISOString(),
    productsScraped: stats.productsParsed,
    productsExported: stats.productsValid,
    pagesCrawled: stats.pagesCrawled,
    errors: stats.errors.length,
    errorDetails: stats.errors.slice(0, 50),
  };

  const statusPath = path.join(outputDir, 'last-run.json');
  try {
    await fs.writeFile(statusPath, JSON.stringify(lastRun, null, 2));
    logger.info({ path: statusPath }, 'Last run status saved');
  } catch (err) {
    logger.error({ error: String(err) }, 'Failed to save last run status');
  }
}

async function runScraper() {
  const startTime = Date.now();

  await ensureDirectories();
  logger.info({ config }, 'Starting United Fabrics scraper (local mode)');

  let isLoggedIn = false;

  const crawler = new PlaywrightCrawler(
    {
      requestHandlerTimeoutSecs: 180,
      maxRequestsPerCrawl: config.maxPages > 0 ? config.maxPages : undefined,
      maxConcurrency: config.concurrency,
      headless: true,
      launchContext: {
        launchOptions: {
          args: [
            '--disable-blink-features=AutomationControlled',
            '--disable-dev-shm-usage',
          ],
        },
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
    },
    {
      handlePageFunction: async ({ request, page, enqueueLinks }) => {
        const url = request.url;
        logger.debug({ url }, 'Crawling...');

        // Login once
        if (!isLoggedIn) {
          isLoggedIn = await loginToSite(page);
          if (!isLoggedIn) {
            logger.warn('Login failed, continuing without authentication');
          }
        }

        // Determine if this is a listing or PDP
        if (url.includes('/product/')) {
          // PDP
          const product = await parsePDP(page, url);
          if (product) {
            // Validate schema
            try {
              ProductSchema.parse(product);
              productsMap.set(url, product);
              stats.productsParsed++;
              logger.info({ sku: product.sku, title: product.title }, 'Product parsed');
            } catch (err) {
              logger.warn({ url, error: String(err) }, 'Invalid product schema');
            }
          }
        } else {
          // Listing page
          stats.pagesCrawled++;
          logger.info({ page: stats.pagesCrawled }, 'Listing page crawled');

          // Enqueue product links
          try {
            await enqueueLinks({
              selector: selectors.listing.productTiles.join(','),
              requestHandler: undefined, // use default
            });
          } catch (err) {
            logger.warn({ url, error: String(err) }, 'Failed to enqueue product links');
          }

          // Try to find and click next page
          let nextPageUrl: string | null = null;
          for (const selector of selectors.listing.nextButton) {
            try {
              const nextBtn = await page.$(selector);
              if (nextBtn) {
                const href = await nextBtn.getAttribute('href');
                if (href) {
                  nextPageUrl = new URL(href, url).toString();
                  break;
                }
              }
            } catch {
              // selector didn't work
            }
          }

          if (nextPageUrl && !nextPageUrl.includes('#')) {
            logger.debug({ nextPageUrl }, 'Enqueueing next listing page');
            await crawler.addRequests([{ url: nextPageUrl }]);
          }
        }
      },

      failedRequestHandler: async ({ request, error }) => {
        logger.error({ url: request.url, error: String(error) }, 'Request failed');
        stats.errors.push({ url: request.url, error: String(error) });
      },
    }
  );

  // Start crawl
  try {
    await crawler.run([config.startListing]);
  } catch (err) {
    logger.error({ error: String(err) }, 'Crawler error');
  }

  // Save outputs
  await saveRawProducts();
  const products = Array.from(productsMap.values());

  try {
    const shopifyPath = path.join(outputDir, 'shopify_products.csv');
    await exportShopify(products, shopifyPath, 'retailPrice');
    logger.info({ path: shopifyPath }, 'Shopify export complete');
  } catch (err) {
    logger.error({ error: String(err) }, 'Shopify export failed');
  }

  try {
    const wooPath = path.join(outputDir, 'woocommerce_products.csv');
    await exportWooCommerce(products, wooPath);
    logger.info({ path: wooPath }, 'WooCommerce export complete');
  } catch (err) {
    logger.error({ error: String(err) }, 'WooCommerce export failed');
  }

  try {
    const wpaiPath = path.join(outputDir, 'wp_all_import.csv');
    await exportWPAllImport(products, wpaiPath);
    logger.info({ path: wpaiPath }, 'WP All Import export complete');
  } catch (err) {
    logger.error({ error: String(err) }, 'WP All Import export failed');
  }

  await saveLastRunStatus();

  const duration = Date.now() - startTime;
  logger.info(
    {
      duration,
      productsScraped: stats.productsParsed,
      productsExported: stats.productsValid,
      errors: stats.errors.length,
    },
    'Scraper completed'
  );
}

// Run
runScraper().catch((err) => {
  logger.fatal({ error: String(err) }, 'Fatal error');
  process.exit(1);
});
