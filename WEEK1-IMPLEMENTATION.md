# Week 1 Implementation Plan: Build United Fabrics Scraper

## Overview

**Goal**: Build a working Apify actor that scrapes 15,000 United Fabrics products with accurate prices and inventory.

**Timeline**: 5 days
**Cost**: ~$50-100 in Apify credits (testing runs)
**Sync Frequency**: 24-hour cycle (1 sync/day at 6 AM UTC)
**Expected Outcome**: Full scraper ready to scale

---

## Schedule

```
Monday: Setup & exploration
├─ Apify account setup
├─ Understand UF site structure
└─ Build scraper skeleton

Tuesday-Wednesday: Development
├─ Implement login
├─ Implement product scraping
├─ Implement pagination
└─ Test with 100 products

Thursday: Full-scale testing
├─ Scale to 15,000 products
├─ Verify all data captured
└─ Run full overnight test

Friday: Polish & documentation
├─ Error handling
├─ Logging setup
├─ Document for Week 2
└─ Prepare for orchestrator integration
```

---

## Day 1: Monday - Setup & Exploration

### Task 1: Apify Account Setup
```
1. Log into Apify account (you already have Creator plan)
2. Go to: https://apify.com/my-actors
3. Click "Create new actor"
4. Select: "JavaScript + Cheerio" template (for HTML parsing)
5. Name: "United Fabrics Scraper"
6. Save (creates basic actor structure)
```

### Task 2: Understand Site Structure
**Goal**: Know what we're scraping

```bash
# Visit these pages manually to understand:
1. https://www.unitedfabrics.com/products
   └─ How products are displayed
   └─ Pagination structure
   └─ Product list layout

2. https://www.unitedfabrics.com/product/arcade-32-kiln/
   └─ Product detail page structure
   └─ Price selectors
   └─ Stock level selectors
   └─ Image URLs

3. Product category pages
   └─ How to find all 15K products
   └─ Are they organized by category?
   └─ How many pages total?
```

### Task 3: Map Product URLs
**Goal**: Get a list of all 15,000 product URLs

```javascript
// From your existing scraper:
// You know United Fabrics has products at:
// https://www.unitedfabrics.com/product/[product-slug]/

// Week 1 will generate the list from the website
// Check if there's a product feed or sitemap:
// - https://www.unitedfabrics.com/sitemap.xml
// - https://www.unitedfabrics.com/products (with pagination)
```

### Task 4: Gather HTML Selectors
**Goal**: Know exactly what to scrape

Using browser dev tools, find these CSS selectors:

**On Product List Page**:
```html
<!-- Product items -->
.product-item
.product-card
.product-tile

<!-- Product links -->
a.product-link
a[href*="/product/"]

<!-- Pagination -->
a.next-page
a[rel="next"]
```

**On Product Detail Page**:
```html
<!-- Price -->
.price-wholesale
.wholesale-price
[data-price="wholesale"]

<!-- Stock (NJ)-->
Contains text: "Yards (NJ)" or similar

<!-- Stock (CA) -->
Contains text: "Yards (CA)" or similar

<!-- Images -->
img.product-image
img[alt*="product"]
picture img
```

---

## Day 2-3: Tuesday-Wednesday - Development

### Task 1: Create Apify Actor Code

**File**: `main.js` in your Apify actor

```javascript
import Apify from 'apify-client';
import { chromium } from 'playwright';

const client = new Apify.ApifyClient({
  token: process.env.APIFY_TOKEN,
});

export const router = Apify.createCheerioRouter();

// Main handler
router.default = async (context) => {
  const { request, $ } = context;

  // Start by getting product list
  if (request.userData.isListPage) {
    await scrapeProductList(context);
  } else {
    // Scrape individual product
    await scrapeProductDetail(context);
  }
};

async function scrapeProductList(context) {
  const { request, $ } = context;
  const { pushData } = context;

  // Find all product links
  const productLinks = [];
  $('a[href*="/product/"]').each((i, el) => {
    const url = $(el).attr('href');
    if (url && !productLinks.includes(url)) {
      productLinks.push(url);
    }
  });

  console.log(`Found ${productLinks.length} products on this page`);

  // Queue each product for detail scraping
  for (const url of productLinks) {
    await context.enqueueRequest({
      url,
      userData: { isListPage: false }
    });
  }

  // Handle pagination
  const nextPageUrl = $('a[rel="next"]').attr('href');
  if (nextPageUrl) {
    await context.enqueueRequest({
      url: nextPageUrl,
      userData: { isListPage: true }
    });
  }
}

async function scrapeProductDetail(context) {
  const { request, $ } = context;
  const { pushData } = context;

  const url = request.url;
  const sku = url.match(/\/product\/([\w-]+)\//)?.[1];

  // Extract data
  const title = $('h1.product-title').text().trim();
  const wholesalePrice = parseFloat(
    $('.price-wholesale').text().match(/[\d.]+/)?.[0]
  );

  // Stock levels
  const stockText = $('body').text();
  const njMatch = stockText.match(/(\d+)\s*Yards?\s*\(NJ\)/i);
  const caMatch = stockText.match(/(\d+)\s*Yards?\s*\(CA\)/i);
  const njStock = njMatch ? parseInt(njMatch[1]) : 0;
  const caStock = caMatch ? parseInt(caMatch[1]) : 0;
  const totalStock = njStock + caStock;

  // Images
  const images = [];
  $('img.product-image').each((i, el) => {
    const src = $(el).attr('src');
    if (src) images.push(src);
  });

  const productData = {
    sku,
    title,
    url,
    wholesalePrice,
    stock: {
      nj: njStock,
      ca: caStock,
      total: totalStock
    },
    images,
    scrapedAt: new Date().toISOString()
  };

  console.log(`Scraped: ${title} - $${wholesalePrice} - ${totalStock} yards`);

  // Push to Apify dataset
  await pushData(productData);
}

// Main entry point
async function main() {
  // If need login, use Playwright
  if (process.env.NEED_LOGIN === 'true') {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Login
    await page.goto('https://www.unitedfabrics.com/user/login/');
    await page.fill('#email_address', process.env.UF_EMAIL);
    await page.fill('#password', process.env.UF_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    // Get auth cookie
    const cookies = await page.context().cookies();
    console.log('Logged in, got cookies');

    await browser.close();
  }

  // Queue initial product list page
  const crawler = new Apify.CheerioCrawler({
    // ... crawler config
  });

  await crawler.addRequest({
    url: 'https://www.unitedfabrics.com/products',
    userData: { isListPage: true }
  });

  await crawler.run();
}

Apify.main(main);
```

### Task 2: Set Apify Environment Variables

In Apify actor settings, add:

```
UF_EMAIL = your-email@example.com
UF_PASSWORD = your-password
NEED_LOGIN = true (if pricing requires login)
```

### Task 3: Initial Test (100 Products)

```
1. In Apify UI, go to actor page
2. Click "Test run"
3. Configure:
   ├─ Max pages to scrape: 2-3 (for 100 products)
   ├─ Memory: 512 MB
   └─ Timeout: 300 seconds
4. Click "Run"
5. Watch logs for:
   ├─ Login success
   ├─ Products found
   ├─ Data being pushed
   └─ No errors
```

---

## Day 4: Thursday - Full-Scale Testing

### Task 1: Scale to 15,000 Products

```javascript
// Update actor code:

const crawler = new Apify.CheerioCrawler({
  maxRequests: 15100, // 15K products + ~100 list pages
  maxRequestsPerCrawl: 15100,
  maxConcurrency: 10, // Parallel requests
  maxPageRetries: 3, // Retry failed pages
  handledRequestFunction: router,
});
```

### Task 2: Run Overnight Test

```
1. Click "Run"
2. Configure:
   ├─ Max pages: UNLIMITED
   ├─ Memory: 1 GB (for caching data)
   ├─ Timeout: 14400 seconds (4 hours, safe margin)
   └─ Wait: Monitor first 30 min, then let it run
3. Expected:
   ├─ Should find all 15K products
   ├─ Should complete in 2-3 hours
   ├─ Dataset should have 15K items
   └─ Cost: ~$20-30 for this run
4. After completion:
   ├─ Check dataset for all products
   ├─ Verify prices extracted
   ├─ Verify stock levels extracted
   ├─ Check for any errors in logs
```

---

## Day 5: Friday - Polish & Documentation

### Task 1: Error Handling

Add to actor code:

```javascript
router.default = async (context) => {
  try {
    const { request, $ } = context;

    if (!$) {
      throw new Error('Page failed to load');
    }

    if (request.userData.isListPage) {
      await scrapeProductList(context);
    } else {
      await scrapeProductDetail(context);
    }
  } catch (error) {
    console.error(`Error on ${context.request.url}: ${error.message}`);

    // Retry this request
    if (context.request.retryCount < 3) {
      await context.reclaim();
    } else {
      // Log permanent failures
      await context.pushData({
        url: context.request.url,
        error: error.message,
        status: 'FAILED'
      });
    }
  }
};
```

### Task 2: Logging Setup

```javascript
// Add structured logging
const log = Apify.utils.log;

log.info(`Starting scrape of ${totalProducts} products`);
log.debug(`Login successful, cookies obtained`);
log.warning(`Retry #${retryCount} for ${url}`);
log.error(`Failed to extract price from ${url}`);
```

### Task 3: Verify Dataset Output

```
In Apify actor results:
1. Go to "Results" tab
2. Check Dataset:
   ├─ Count items: Should be ~15,000
   ├─ Sample items: Verify data looks correct
   ├─ Export: Download CSV to verify
   └─ Fields: sku, title, url, wholesalePrice, stock, images
3. If missing items:
   ├─ Check error logs
   ├─ See which URLs failed
   ├─ Plan to retry in Week 2
```

### Task 4: Document for Week 2

Create `WEEK1-RESULTS.md`:

```markdown
# Week 1 Results: United Fabrics Scraper

## Completion Status
- [x] Base scraper built
- [x] Login implemented
- [x] Product list scraping
- [x] Product detail scraping
- [x] Data extraction (title, price, stock, images)
- [x] 15,000 products scraped

## Metrics
- Total products: 15,000
- Success rate: X%
- Failed products: X
- Total runtime: X hours
- Cost: $X

## Data Quality
- Prices extracted: X%
- Stock levels extracted: X%
- Images captured: X%

## Next Steps
- Week 2: Build vendors 2, 3, 4 scrapers
- Week 2: Create orchestrator actor
- Week 3: Build sync engines
```

---

## What You Need From You

Before I start, I need:

### 1. Apify Actor Repository Link
```
After you create the actor, send me:
- Actor ID (from URL: apify.com/my-actors/[ID])
- or Direct link to the actor
```

### 2. Confirm Login Requirements
```
Question: Does United Fabrics require login to see prices?
- YES: I'll implement B2B login with your credentials
- NO: I'll use public scraping
```

### 3. Product URL Pattern
```
Confirm the URL structure:
- Single product: /product/[slug]/ ?
- Multiple pages? How many pages total?
- Are products in categories?
```

### 4. HTML Structure
```
Can you provide:
- Screenshot of product list page (what element is the product?)
- Screenshot of product detail page (where is price?)
- Screenshot showing stock info (NJ & CA locations)
```

---

## Cost Estimate for Week 1

```
Testing runs (all at 24-hour frequency):
├─ Setup tests: 5 runs × $0.50 = $2.50
├─ 100-product test: 3 runs × $1.50 = $4.50
├─ 1K-product test: 2 runs × $5 = $10
├─ 15K full run: 1 run × $4.60 = $4.60
└─ Retries/fixes: ~$15

TOTAL ESTIMATED: $36-50 in Apify credits
(Your $500 bonus covers this easily)

Note: One 24-hour cycle costs $4.60
- Daily: $4.60
- Monthly: $138
- Your bonus covers: 108 months (9 years!)
```

---

## Success Criteria

**Week 1 is successful when:**

✅ Actor created and running in Apify
✅ Login working (if required)
✅ Product list pages being parsed
✅ 15,000 products queued for scraping
✅ Product detail pages being scraped
✅ Prices extracted correctly
✅ Stock levels (NJ + CA) extracted correctly
✅ Images captured
✅ Dataset contains all 15,000 items
✅ Ready for orchestrator integration in Week 2

---

## Week 1 Deliverables

By Friday end of day:

1. **Working Apify Actor**
   - Hosted in Apify platform
   - Can be run via API or UI

2. **Dataset with 15,000 Products**
   - All fields: sku, title, price, stock, images
   - Ready for export/sync

3. **Documentation**
   - Actor code with comments
   - Selector mapping for UF site
   - Any quirks/issues found

4. **Ready for Week 2**
   - Base architecture proven
   - Multi-vendor scraping ready
   - Orchestrator integration ready

---

## Questions for You

1. **Can you log in to United Fabrics?** (I'll need to test the login)
2. **What email/password should I use for scraping?** (Will be stored encrypted in Apify)
3. **Any product categories I should focus on first?** (Or should I scrape all?)
4. **Do you want me to start immediately?** (I can begin Monday morning)

---

## Ready to Start Week 1?

**Say "YES" and I'll begin implementing:**

1. Create Apify actor
2. Build scraper code
3. Test with 100 products
4. Scale to 15,000
5. Have working dataset by Friday

This will be our foundation for multi-vendor scraping and automated sync.

Let's build this! 🚀
