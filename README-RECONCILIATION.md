# Product Reconciliation System

## Quick Navigation

### Get Started in 2 Minutes
- **Start here:** [`QUICK-RECONCILIATION-REFERENCE.txt`](QUICK-RECONCILIATION-REFERENCE.txt)
- **Time to read:** 2-3 minutes
- **Contains:** Commands, scenarios, quick troubleshooting

### Full Documentation
- **Read first:** [`PRODUCT-RECONCILIATION-GUIDE.md`](PRODUCT-RECONCILIATION-GUIDE.md)
- **Time to read:** 10-15 minutes
- **Contains:** Complete workflows, advanced usage, examples

### Project Overview
- **Executive summary:** [`RECONCILIATION-SYSTEM-SUMMARY.txt`](RECONCILIATION-SYSTEM-SUMMARY.txt)
- **Time to read:** 5-10 minutes
- **Contains:** What was built, how to use, features

---

## One-Command Quick Start

```bash
node run-full-reconciliation.js
```

**What it does:** Checks vendor + WordPress + Shopify, generates complete reconciliation report.

**Time:** 30-60 minutes  
**Output:** `output/RECONCILIATION-REPORT.txt` (read this for action items)

---

## The 3 Main Commands

### 1. Check Vendor Availability
```bash
node check-product-availability.js
```
✓ Checks if products still exist on United Fabrics  
✓ Identifies discontinued products  
✓ Duration: 10-20 minutes  
Output: `output/vendor-availability-report.json`

### 2. Check WordPress Sync
```bash
node check-wordpress-products.js
```
✓ Searches bestupholsteryfabric.com for products  
✓ Identifies missing products  
✓ Duration: 5-10 minutes  
Output: `output/wordpress-sync-report.json`

### 3. Check Shopify Sync
```bash
node check-shopify-products.js
```
✓ Searches upholsteryfabricbytheyard.com for products  
✓ Identifies missing products  
✓ Duration: 5-10 minutes  
Output: `output/shopify-sync-report.json`

---

## Common Workflows

### First Time: Full Reconciliation (45-60 min)
```bash
node run-full-reconciliation.js
cat output/RECONCILIATION-REPORT.txt
```

### Monthly: Vendor Check Only (10-20 min)
```bash
node check-product-availability.js
cat output/vendor-availability-report.json
```

### Before Import: Check Missing Products (5-10 min)
```bash
node check-wordpress-products.js
cat output/wordpress-sync-report.json
```

---

## Understanding the Output

### Reports Generated

| File | Type | Purpose |
|------|------|---------|
| `vendor-availability-report.json` | JSON | Which products are available/discontinued on vendor site |
| `wordpress-sync-report.json` | JSON | Which products found/missing on WordPress |
| `shopify-sync-report.json` | JSON | Which products found/missing on Shopify |
| `product-reconciliation-report.json` | JSON | Master report with action items |
| `RECONCILIATION-REPORT.txt` | TEXT | **READ THIS** - Human-readable recommendations |

### What Each Report Contains

**vendor-availability-report.json**
```json
{
  "available": [...],
  "discontinued": [...],
  "summary": { "active": 19, "discontinued": 1, "errors": 0 }
}
```

**wordpress-sync-report.json**
```json
{
  "foundOnWP": [...],
  "missingFromWP": [...],
  "summary": { "foundOnWP": 18, "missingFromWP": 2, "coverage": "90.0%" }
}
```

**RECONCILIATION-REPORT.txt** (Read this!)
```
Products to Remove: 1 (discontinued items)
Products to Add: 2 (missing from sites)
Products to Update: 0
```

---

## Typical Action Items

### If Product is Discontinued
1. Find in vendor report
2. Remove from WordPress admin
3. Remove from Shopify admin
4. Update inventory records

### If Product is Missing from WordPress
1. Find in WordPress report
2. Filter `wp_all_import_products.csv` to that SKU
3. Use WordPress All Import plugin
4. Verify product appears correctly

### If Product is Missing from Shopify
1. Find in Shopify report
2. Use `shopify_products_full.csv` for import
3. Import via Shopify admin
4. Verify product appears correctly

---

## Troubleshooting

### Scripts not running?
```bash
node --version              # Check Node.js installed
npm list playwright         # Check Playwright installed
cd /path/to/Fabric\ Scraper # Make sure you're in right directory
```

### Reports not generating?
```bash
# Make sure all three checks ran first
node check-product-availability.js
node check-wordpress-products.js
node check-shopify-products.js
# Then generate report
node generate-reconciliation-report.js
```

### Products not found on sites?
- Verify product is published (not draft)
- Check product is indexed by search
- Try searching manually in browser
- May need to publish product first

---

## Scheduling (Optional)

Run reconciliation weekly:

```bash
# Add to crontab (Monday 2 AM)
0 2 * * 1 cd /path/to/fabric-scraper && node check-product-availability.js >> logs/vendor-check.log 2>&1
```

---

## File Structure

```
Fabric Scraper/
├── check-product-availability.js          # Check vendor
├── check-wordpress-products.js           # Check WordPress
├── check-shopify-products.js             # Check Shopify
├── generate-reconciliation-report.js     # Combine reports
├── run-full-reconciliation.js            # Master script
│
├── PRODUCT-RECONCILIATION-GUIDE.md       # Full documentation
├── QUICK-RECONCILIATION-REFERENCE.txt   # Quick start
├── RECONCILIATION-SYSTEM-SUMMARY.txt    # Overview
├── README-RECONCILIATION.md             # This file
│
└── output/
    ├── vendor-availability-report.json
    ├── wordpress-sync-report.json
    ├── shopify-sync-report.json
    ├── product-reconciliation-report.json
    └── RECONCILIATION-REPORT.txt
```

---

## Key Features

✓ **Comprehensive** - Checks vendor + both retail platforms  
✓ **Automated** - Single command runs everything  
✓ **Actionable** - Clear recommendations on what to do  
✓ **Detailed** - Both JSON (machines) and text (humans)  
✓ **Fast** - Individual checks only take minutes  
✓ **Flexible** - Run all or individual scripts  
✓ **Safe** - Local-only, no external APIs  
✓ **Documented** - Multiple guides available  

---

## Next Steps

1. **Read:** `QUICK-RECONCILIATION-REFERENCE.txt` (2 minutes)
2. **Run:** `node run-full-reconciliation.js` (30-60 minutes)
3. **Review:** `output/RECONCILIATION-REPORT.txt`
4. **Take action** on items listed in report

---

## Support

**Quick questions?**  
→ Read `QUICK-RECONCILIATION-REFERENCE.txt`

**Detailed help?**  
→ Read `PRODUCT-RECONCILIATION-GUIDE.md`

**Need overview?**  
→ Read `RECONCILIATION-SYSTEM-SUMMARY.txt`

---

**Status:** Ready for use  
**Last updated:** October 27, 2025
