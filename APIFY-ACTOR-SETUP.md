# Apify Actor Setup - Week 1 United Fabrics Scraper

## Your Actor Details

- **URL**: https://console.apify.com/actors/S0UufDbYCeJzduhMk/source
- **Type**: Crawlee + Cheerio template
- **Purpose**: Scrape United Fabrics 15K products

---

## Step 1: Copy the Code to Your Actor

### In Your Apify Actor Console:

1. Go to: https://console.apify.com/actors/S0UufDbYCeJzduhMk/source
2. Find the **main.js** file (should be on the left sidebar)
3. **Delete all current content**
4. **Copy and paste the entire code** from: `apify-actor-main.js`

**Code location**: `/Users/richard/Desktop/Fabric Scraper/apify-actor-main.js`

---

## Step 2: Set Environment Variables

### In Your Apify Actor:

1. Click on **"Environment variables"** (usually near the code editor)
2. Add these variables:

```
UF_EMAIL = info@bestupholsteryfabric.com
UF_PASSWORD = Rc02!61977
UF_START_LISTING = https://www.unitedfabrics.com/fabric/
```

**These allow the actor to:**
- Login to United Fabrics B2B account
- Start scraping from fabric listing page

---

## Step 3: Update package.json

### In Your Apify Actor:

1. Find **package.json** file
2. Make sure these dependencies exist:

```json
{
  "dependencies": {
    "apify": "^3.0.0",
    "cheerio": "^1.0.0-rc.12",
    "got": "^13.0.0"
  }
}
```

The template should already have these, but verify they're there.

---

## Step 4: Test the Actor

### First Test Run (100 products):

1. Click **"Test run"** button
2. Configure:
   ```
   Max requests per crawl: 200
   Memory: 512 MB
   Timeout: 300 seconds (5 minutes)
   ```
3. Click **"Run"**
4. Watch the logs for:
   - "Starting United Fabrics Scraper"
   - "Scraping list page"
   - "Found X products"
   - "✓ Scraped: [product name]"

### Expected Results After 5 Minutes:

- Should process ~100-200 products
- Dataset should contain items with:
  - sku
  - title
  - wholesalePrice
  - stock (nj, ca, total)
  - images
  - priceMultipliers
- Cost: ~$0.50-1 in Apify credits

---

## Step 5: Inspect the Results

### View Dataset:

1. After test completes, click on **"Results"** tab
2. Click on **"Dataset"**
3. You should see your scraped products:

```
[
  {
    "sku": "arcade-32-kiln",
    "title": "Arcade 32 - Kiln",
    "url": "https://www.unitedfabrics.com/product/arcade-32-kiln/",
    "wholesalePrice": 26.75,
    "stock": {
      "nj": 40,
      "ca": 45,
      "total": 85
    },
    "images": [...],
    "priceMultipliers": {
      "regularPrice": "66.88",
      "salePrice": "86.94"
    },
    "scrapedAt": "2025-10-27T..."
  }
]
```

---

## Step 6: Scale to 15K Products

### Full Production Run:

Once you've verified the test works:

1. Click **"New run"**
2. Configure:
   ```
   Max requests per crawl: 16000
   Memory: 1024 MB (1GB)
   Timeout: 14400 seconds (4 hours, safe margin)
   ```
3. Click **"Run"**
4. Expected time: 2-3 hours
5. Expected cost: $20-30 in Apify credits

### Monitor Progress:

- Check logs every 30 minutes
- Look for:
  - "Found X products on page"
  - "✓ Scraped:" messages
  - Error counts
  - Current page number

### After Completion:

1. Go to Results → Dataset
2. Check total item count (should be ~15,000)
3. Sample a few items to verify data quality
4. Download as CSV if desired

---

## Troubleshooting

### If Scraper Finds 0 Products:

**Problem**: No products being found on list page

**Solutions**:
1. Check if UF website structure changed
2. Verify selectors in code:
   - Line 49: `const productSelector = '...'`
3. Visit https://www.unitedfabrics.com/fabric/ manually
4. Right-click → Inspect → Find product link structure
5. Update selector if needed

### If Prices Aren't Extracted:

**Problem**: wholesalePrice showing 0

**Solutions**:
1. Product detail page may not require login for prices (good!)
2. Verify price is showing on product page
3. Update price selector (line 138):
   - `.product-price`
   - `.price-wholesale`
   - `[data-price]`

### If Stock Levels Are Wrong:

**Problem**: Stock showing 0 or incorrect values

**Solutions**:
1. Verify NJ/CA pattern on UF website
2. Check if text is "Yard" vs "Yards"
3. Look at actual HTML of product page
4. Update regex on lines 153-155

### If Actor Keeps Crashing:

**Problem**: Timeout or memory errors

**Solutions**:
1. Reduce `maxConcurrency` from 10 to 5
2. Increase memory to 2GB
3. Check if UF is blocking requests (rate limiting)
4. Add delays between requests

---

## What's Happening in the Code

### Main Components:

1. **Router (lines 4-40)**
   - Handles both list and detail pages
   - Routes to appropriate function
   - Error handling & retries

2. **Scrape Product List (lines 45-95)**
   - Finds all product links on page
   - Queues each for detail scraping
   - Handles pagination

3. **Scrape Product Detail (lines 100-165)**
   - Extracts SKU, title, price
   - Parses stock levels (NJ + CA)
   - Collects images
   - Calculates price multipliers (×2.5, ×3.25)

4. **Main Function (lines 170-220)**
   - Creates Cheerio crawler
   - Configures concurrency & retries
   - Starts from fabric listing page
   - Runs crawler & collects data

---

## Expected Timeline

```
Monday (Today):
├─ Copy code to actor ✓ (5 min)
├─ Add environment variables ✓ (2 min)
└─ First test run ✓ (10 min)

Tuesday-Wednesday:
├─ Monitor test results
├─ Fix any selector issues
└─ Run full 15K test

Thursday:
├─ Analyze 15K dataset
├─ Verify data quality
└─ Document findings

Friday:
├─ Polish code
├─ Add comments
└─ Ready for Week 2 orchestrator
```

---

## Next Steps After This Works

**Week 2: Build Orchestrator**
- Create master actor that calls this scraper
- Add actors for Vendor 2, 3, 4
- Run all in parallel

**Week 3: Build Sync Engines**
- WordPress sync actor (20K items)
- Shopify sync actor (10K items)

**Week 4: Production Launch**
- Schedule for 24-hour cycle
- Set up alerts
- Deploy!

---

## Cost Tracking

**Week 1 Testing:**
- Test run (100 products): ~$1
- Full run (15K products): ~$25
- Retries & fixes: ~$15-20
- **Total: $40-50** (easily within your $500 bonus)

**Ongoing (After Setup):**
- Daily 24-hour cycle: $4.60/day = $138/month
- Your bonus covers: 108 months (9 years!)

---

## Questions?

If something isn't working:

1. Check the **Logs** tab in Apify
2. Look for error messages
3. Verify selectors match actual HTML
4. Try a smaller test run first (200 max requests)
5. Share error logs for debugging

---

**Status**: Ready to deploy
**Next Action**: Copy code to your Apify actor and run test
**Expected Result**: 100-200 products scraped in first test

Let's go! 🚀
