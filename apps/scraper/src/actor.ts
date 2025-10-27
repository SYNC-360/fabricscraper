// Apify Actor - requires @apify/sdk in production
// For local development, run: pnpm start:scrape instead
import { logger } from '@packages/utils';
import { PlaywrightCrawler } from 'crawlee';
import { Product, ProductSchema } from '@packages/schemas';
import {
  exportShopify,
  exportWooCommerce,
  exportWPAllImport,
} from '@packages/exporters';
import { logger } from '@packages/utils';
import {
  loginToSite,
  parsePDP,
  acceptCookies,
  stats,
} from './crawler.js';
import { selectors } from './selectors.js';

interface ActorInput {
  startUrls?: string[];
  brandFilter?: string;
  respectRobotsTxt?: boolean;
  maxPages?: number;
  concurrency?: number;
  ufEmail?: string;
  ufPassword?: string;
}

let productsMap = new Map<string, Product>();
let listingPageCount = 0;

async function runActor() {
  await Actor.init();

  const input = (await Actor.getInput()) as ActorInput;
  log.info('Actor input:', input);

  // Override config from input if provided
  const email = input?.ufEmail || process.env.UF_EMAIL || '';
  const password = input?.ufPassword || process.env.UF_PASSWORD || '';
  const startUrls = input?.startUrls || [process.env.UF_START_LISTING || 'https://www.unitedfabrics.com/fabric/'];
  const maxPages = input?.maxPages || Number(process.env.MAX_PAGES || 0);
  const concurrency = input?.concurrency || Number(process.env.CONCURRENCY || 3);
  const respectRobots = input?.respectRobotsTxt || process.env.RESPECT_ROBOTS_TXT === 'true';

  if (!email || !password) {
    throw new Error('UF_EMAIL and UF_PASSWORD are required');
  }

  log.info({ startUrls, maxPages, concurrency }, 'Starting Apify Actor');

  let isLoggedIn = false;

  const crawler = new PlaywrightCrawler(
    {
      requestHandlerTimeoutSecs: 180,
      maxRequestsPerCrawl: maxPages > 0 ? maxPages : undefined,
      maxConcurrency: concurrency,
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
          gotoOptions.timeout = 45000;
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
        log.debug(`Crawling: ${url}`);

        // Login once per run
        if (!isLoggedIn) {
          isLoggedIn = await loginToSite(page);
          if (!isLoggedIn) {
            log.warning('Login failed, continuing without auth');
          }
        }

        if (url.includes('/product/')) {
          // PDP
          const product = await parsePDP(page, url);
          if (product) {
            try {
              ProductSchema.parse(product);
              productsMap.set(url, product);
              stats.productsParsed++;
              log.info(`Product parsed: ${product.sku}`);
            } catch (err) {
              log.warning(`Invalid product schema: ${String(err)}`);
            }
          }
        } else {
          // Listing
          stats.pagesCrawled++;
          log.info(`Listing page ${stats.pagesCrawled} crawled`);

          try {
            await enqueueLinks({
              selector: selectors.listing.productTiles.join(','),
            });
          } catch (err) {
            log.warning(`Failed to enqueue product links: ${String(err)}`);
          }

          // Next page
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
              // noop
            }
          }

          if (nextPageUrl && !nextPageUrl.includes('#')) {
            log.debug(`Enqueueing next page: ${nextPageUrl}`);
            await crawler.addRequests([{ url: nextPageUrl }]);
          }
        }
      },

      failedRequestHandler: async ({ request, error }) => {
        log.error(`Request failed: ${request.url}`, error);
        stats.errors.push({ url: request.url, error: String(error) });
      },
    }
  );

  try {
    await crawler.run(startUrls);
  } catch (err) {
    log.error('Crawler error:', err);
  }

  // Save products to KV store
  const products = Array.from(productsMap.values());
  const datasetId = (await Actor.openDataset()).id;

  for (const product of products) {
    try {
      ProductSchema.parse(product);
      await Actor.pushData(product);
    } catch (err) {
      log.warning(`Invalid product: ${String(err)}`);
    }
  }

  // Generate CSVs and save to KV store
  try {
    const kvStore = await Actor.openKeyValueStore();

    // Shopify
    const shopifyPath = 'shopify_products.csv';
    const shopifyBuffer = await generateShopifyCSV(products);
    await kvStore.setValue('shopify_products.csv', shopifyBuffer);

    // WooCommerce
    const wooPath = 'woocommerce_products.csv';
    const wooBuffer = await generateWooCommerceCSV(products);
    await kvStore.setValue('woocommerce_products.csv', wooBuffer);

    // WPAI
    const wpaiPath = 'wp_all_import.csv';
    const wpaiBuffer = await generateWPAICSV(products);
    await kvStore.setValue('wp_all_import.csv', wpaiBuffer);

    log.info('CSVs saved to KV store');
  } catch (err) {
    log.error('Failed to save CSVs:', err);
  }

  // Save run summary
  const summary = {
    timestamp: new Date().toISOString(),
    productsScraped: stats.productsParsed,
    productsExported: stats.productsValid,
    pagesCrawled: stats.pagesCrawled,
    errors: stats.errors.length,
  };

  await Actor.setValue('last-run-summary', summary);
  log.info('Actor completed:', summary);

  await Actor.exit();
}

// Helper to generate CSVs in memory (simplified)
async function generateShopifyCSV(products: Product[]): Promise<Buffer> {
  const lines = ['Handle,Title,Body (HTML),Vendor,Product Category,Tags,Published,Option1 Name,Option1 Value,Variant SKU,Variant Price,Variant Requires Shipping,Variant Taxable,Image Src,Image Position,Status'];

  for (const p of products) {
    try {
      ProductSchema.parse(p);
      const handle = p.title.toLowerCase().replace(/\s+/g, '-').substring(0, 100);
      const price = p.retailPrice || 0;

      if (p.images.length > 0) {
        for (const img of p.images) {
          lines.push(
            `"${handle}","${p.title.replace(/"/g, '""')}","${(p.descriptionHtml || '').replace(/"/g, '""')}","United Fabrics","Upholstery Fabric","${p.tags.join(',')}","TRUE","Default Title","Default Title","${p.sku}","${price}","TRUE","TRUE","${img.src}","${img.position}","active"`
          );
        }
      } else {
        lines.push(
          `"${handle}","${p.title.replace(/"/g, '""')}","${(p.descriptionHtml || '').replace(/"/g, '""')}","United Fabrics","Upholstery Fabric","${p.tags.join(',')}","TRUE","Default Title","Default Title","${p.sku}","${price}","TRUE","TRUE","","0","active"`
        );
      }
    } catch (err) {
      // skip
    }
  }

  return Buffer.from(lines.join('\n'));
}

async function generateWooCommerceCSV(products: Product[]): Promise<Buffer> {
  const lines = ['Type,SKU,Name,Published,Visibility in catalog,Short description,Description,Tax status,In stock?,Regular price,Sale price,Categories,Images,Attributes'];

  for (const p of products) {
    try {
      ProductSchema.parse(p);
      const imageUrls = p.images.map((img) => img.src).join('|');
      const shortDesc = (p.descriptionHtml || '').split(/<[^>]+>/)[0].slice(0, 120).trim();

      lines.push(
        `"simple","${p.sku}","${p.title.replace(/"/g, '""')}","1","visible","${shortDesc.replace(/"/g, '""')}","${(p.descriptionHtml || '').replace(/"/g, '""')}","taxable","${p.inStock ? '1' : '0'}","${p.retailPrice || 0}","${p.salePrice || ''}","Upholstery > United Fabrics","${imageUrls}","Brand|United Fabrics; Collection|${p.collection || ''}; Color|${p.color || ''}"`
      );
    } catch (err) {
      // skip
    }
  }

  return Buffer.from(lines.join('\n'));
}

async function generateWPAICSV(products: Product[]): Promise<Buffer> {
  const lines = ['post_title,post_content,sku,regular_price,sale_price,images,brand,collection,color,categories,tags,meta_width,meta_abrasion,meta_pattern_repeat,meta_backing,meta_fire_rating,meta_country_of_origin,meta_cleaning_code,meta_railroaded,meta_usage,meta_content'];

  for (const p of products) {
    try {
      ProductSchema.parse(p);
      const imageUrls = p.images.map((img) => img.src).join('\n');

      lines.push(
        `"${p.title.replace(/"/g, '""')}","${(p.descriptionHtml || '').replace(/"/g, '""')}","${p.sku}","${p.retailPrice || 0}","${p.salePrice || ''}","${imageUrls.replace(/"/g, '""')}","United Fabrics","${p.collection || ''}","${p.color || ''}","${p.categories.join(',')}","${p.tags.join(',')}","${p.details.width || ''}","${p.details.abrasion || ''}","${p.details.patternRepeat || ''}","${p.details.backing || ''}","${p.details.fireRating || ''}","${p.details.countryOfOrigin || ''}","${p.details.cleaningCode || ''}","${p.details.railroaded || ''}","${(p.details.usage || []).join(',')}","${p.details.content || ''}"`
      );
    } catch (err) {
      // skip
    }
  }

  return Buffer.from(lines.join('\n'));
}

// Run actor
runActor().catch((err) => {
  log.error('Fatal error:', err);
  process.exit(1);
});
