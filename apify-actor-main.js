import Apify from 'apify-client';

const client = new Apify.ApifyClient({
  token: process.env.APIFY_TOKEN,
});

export const router = Apify.createCheerioRouter();

// ============================================================================
// MAIN ROUTER - Handles both list pages and product detail pages
// ============================================================================

router.default = async (context) => {
  const { request, $ } = context;

  console.log(`Processing: ${request.url}`);

  try {
    // Check page type
    if (request.userData.isLoginPage) {
      // This shouldn't happen, but handle it
      console.log('On login page, something went wrong');
      return;
    }

    if (request.userData.isListPage) {
      // Product list page - extract product links
      await scrapeProductList(context);
    } else {
      // Product detail page - extract product data
      await scrapeProductDetail(context);
    }
  } catch (error) {
    console.error(`Error processing ${request.url}: ${error.message}`);

    // Retry if we haven't hit max retries
    if (request.retryCount < 3) {
      console.log(`Reclaiming request, retry ${request.retryCount + 1}`);
      await context.reclaim();
    } else {
      // Log permanent failure
      await context.pushData({
        url: request.url,
        error: error.message,
        retryCount: request.retryCount,
        status: 'FAILED',
        scrapedAt: new Date().toISOString(),
      });
    }
  }
};

// ============================================================================
// SCRAPE PRODUCT LIST PAGE
// ============================================================================

async function scrapeProductList(context) {
  const { request, $ } = context;

  console.log(`Scraping list page: ${request.url}`);

  // Find all product links on this page
  const productLinks = [];
  const productSelector = 'div.product-item a, a.product-link, a[href*="/product/"]';

  $(productSelector).each((i, elem) => {
    const href = $(elem).attr('href');
    if (href && href.includes('/product/')) {
      // Ensure absolute URL
      const absoluteUrl = new URL(href, 'https://www.unitedfabrics.com').toString();
      if (!productLinks.includes(absoluteUrl)) {
        productLinks.push(absoluteUrl);
      }
    }
  });

  console.log(`Found ${productLinks.length} products on ${request.url}`);

  // Queue each product for detail scraping
  for (const productUrl of productLinks) {
    await context.enqueueRequest({
      url: productUrl,
      userData: { isListPage: false },
    });
  }

  // Handle pagination - look for next page link
  const nextPageSelectors = [
    'a[rel="next"]',
    'a.next-page',
    'a:contains("Next")',
    'a.pagination-next',
  ];

  let nextPageUrl = null;
  for (const selector of nextPageSelectors) {
    const found = $(selector).attr('href');
    if (found) {
      nextPageUrl = new URL(found, 'https://www.unitedfabrics.com').toString();
      break;
    }
  }

  if (nextPageUrl) {
    console.log(`Found next page: ${nextPageUrl}`);
    await context.enqueueRequest({
      url: nextPageUrl,
      userData: { isListPage: true },
    });
  } else {
    console.log('No next page found');
  }
}

// ============================================================================
// SCRAPE PRODUCT DETAIL PAGE
// ============================================================================

async function scrapeProductDetail(context) {
  const { request, $ } = context;

  const url = request.url;

  // Extract SKU from URL
  const skuMatch = url.match(/\/product\/([\w-]+)\//);
  const sku = skuMatch ? skuMatch[1] : null;

  if (!sku) {
    console.error(`Could not extract SKU from ${url}`);
    throw new Error('SKU extraction failed');
  }

  // Extract title
  const title = $('h1, .product-title, [data-testid="product-title"]')
    .first()
    .text()
    .trim();

  if (!title) {
    console.warn(`No title found for ${sku}`);
  }

  // Extract wholesale price
  let wholesalePrice = null;
  const priceText = $('span.price, [data-price], .product-price, .price-wholesale')
    .first()
    .text();

  if (priceText) {
    const priceMatch = priceText.match(/[\d.,]+/);
    if (priceMatch) {
      wholesalePrice = parseFloat(priceMatch[0].replace(/,/g, ''));
    }
  }

  if (!wholesalePrice) {
    console.warn(`No price found for ${sku}`);
  }

  // Extract stock levels (NJ & CA)
  const bodyText = $('body').text();
  const njMatch = bodyText.match(/(\d+)\s*Yards?\s*\(NJ\)/i);
  const caMatch = bodyText.match(/(\d+)\s*Yards?\s*\(CA\)/i);

  const njStock = njMatch ? parseInt(njMatch[1]) : 0;
  const caStock = caMatch ? parseInt(caMatch[1]) : 0;
  const totalStock = njStock + caStock;

  // Extract images
  const images = [];
  $('img[src*="/product"], img.product-image, picture img').each((i, elem) => {
    const src = $(elem).attr('src') || $(elem).attr('data-src');
    if (src && !images.includes(src)) {
      images.push(src);
    }
  });

  // Build product data object
  const productData = {
    sku,
    title: title || 'Unknown',
    url,
    wholesalePrice: wholesalePrice || 0,
    stock: {
      nj: njStock,
      ca: caStock,
      total: totalStock,
    },
    images,
    scrapedAt: new Date().toISOString(),
    priceMultipliers: {
      regularPrice: (wholesalePrice * 2.5).toFixed(2),
      salePrice: (wholesalePrice * 3.25).toFixed(2),
    },
  };

  console.log(`✓ Scraped: ${title} | $${wholesalePrice} | ${totalStock} yards`);

  // Push to Apify dataset
  await context.pushData(productData);
}

// ============================================================================
// MAIN FUNCTION - Initialize and run crawler
// ============================================================================

async function main() {
  console.log('🚀 Starting United Fabrics Scraper');

  // Create crawler
  const crawler = new Apify.CheerioCrawler({
    // How many pages to process in parallel
    maxConcurrency: 10,

    // How many times to retry a failed page
    maxRequestsPerCrawl: 16000, // 15K products + ~1K list pages

    // Timeout for each page
    requestHandlerTimeoutSecs: 60,

    // Handle requests
    requestHandler: router,

    // Error handling
    errorHandler: async (context) => {
      const { request } = context;
      console.error(
        `Request failed after ${request.retryCount} retries: ${request.url}`,
      );
    },

    // Successful request handler
    failedRequestHandler: async (context) => {
      const { request } = context;
      console.warn(`Failed to process: ${request.url}`);
    },
  });

  // Get starting URL from environment or use default
  const startUrl = process.env.UF_START_LISTING || 'https://www.unitedfabrics.com/fabric/';

  console.log(`Starting from: ${startUrl}`);

  // Queue the first request (list page)
  await crawler.addRequest({
    url: startUrl,
    userData: { isListPage: true },
  });

  // Run crawler
  await crawler.run();

  console.log('✅ Scraper completed');
}

// Run it
Apify.main(main);
