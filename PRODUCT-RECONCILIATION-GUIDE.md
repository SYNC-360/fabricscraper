# Product Reconciliation & Availability Checking Guide

## Overview

This guide explains how to identify and manage discontinued products, missing products, and sync issues between your vendor (United Fabrics) and retail stores (WordPress and Shopify).

## What Gets Checked

### 1. Vendor Availability (United Fabrics)
Checks if products are still available at the source:
- Product page loads successfully
- Product is not marked as discontinued
- Product is in stock (0 yards indicates out of stock but active)

**Script:** `check-product-availability.js`

### 2. WordPress Sync (bestupholsteryfabric.com)
Checks if products from your catalog exist on your WordPress site:
- Searches for products by SKU
- Verifies product is published/active
- Identifies missing products that need import

**Script:** `check-wordpress-products.js`

### 3. Shopify Sync (upholsteryfabricbytheyard.com)
Checks if products from your catalog exist on your Shopify store:
- Searches for products by name
- Verifies product is active
- Identifies missing products that need import

**Script:** `check-shopify-products.js`

## How to Run

### Option A: Run All Checks (Recommended)
```bash
node run-full-reconciliation.js
```

This will run all three checks sequentially and generate a comprehensive report.

**Estimated Time:** 30-60 minutes

### Option B: Run Individual Checks

```bash
# Check vendor availability only
node check-product-availability.js

# Check WordPress only
node check-wordpress-products.js

# Check Shopify only
node check-shopify-products.js

# Generate reconciliation report (after running checks)
node generate-reconciliation-report.js
```

## Output Files

All reports are saved to the `output/` directory:

### 1. vendor-availability-report.json
Contains detailed vendor status for each product
```json
{
  "available": [...],
  "discontinued": [...],
  "errors": [...],
  "summary": {
    "active": 20,
    "discontinued": 0,
    "errors": 0
  }
}
```

### 2. wordpress-sync-report.json
Shows which products are on WordPress and which are missing
```json
{
  "foundOnWP": [...],
  "missingFromWP": [...],
  "summary": {
    "foundOnWP": 18,
    "missingFromWP": 2
  }
}
```

### 3. shopify-sync-report.json
Shows which products are on Shopify and which are missing

### 4. product-reconciliation-report.json
Master report combining all three checks with recommended actions

### 5. RECONCILIATION-REPORT.txt
Human-readable summary with action items

## Understanding the Results

### Products to Remove
Products that are discontinued by the vendor. You should:
1. Archive the product on WordPress
2. Archive the product on Shopify
3. Mark as discontinued in your inventory system

**Action Items:**
- Review discontinued reason
- Notify customers if applicable
- Determine replacement products (if any)

### Products to Add
Products from your catalog that don't exist on one or both retail sites. You should:
1. Import to WordPress using `wp_all_import_products.csv`
2. Import to Shopify using `shopify_products_full.csv`

**Action Items:**
- Use WordPress All Import plugin
- Use Shopify Product Import CSV
- Verify prices and inventory after import

### Products to Update
Products that exist on retail sites but have outdated information.

**Action Items:**
- Update pricing in WordPress
- Update inventory in Shopify
- Sync product descriptions and images

## Workflow Example

### Week 1: Initial Reconciliation
```bash
node run-full-reconciliation.js
```
Review the `RECONCILIATION-REPORT.txt` file to see what needs action.

### Week 2: Process Removals
For each discontinued product:
1. Go to WordPress admin → Products
2. Search for product by SKU
3. Move to trash (or mark discontinued)
4. Repeat for Shopify

### Week 3: Process Additions
1. Use WordPress All Import to import missing products
2. Use Shopify Product CSV import for missing products
3. Verify inventory and pricing

### Week 4: Ongoing Monitoring
Run reconciliation monthly to catch new issues:
```bash
# Quick check of current status
node check-product-availability.js
node generate-reconciliation-report.js
```

## Troubleshooting

### Script Timing Out
If a script times out, individual site checks may be slow. Run them separately:
```bash
node check-product-availability.js  # Just check vendor
# Wait for this to complete, then...
node check-wordpress-products.js
# etc.
```

### Reports Not Generated
Make sure all three checkers run first:
```bash
node check-product-availability.js
node check-wordpress-products.js
node check-shopify-products.js
# Only then...
node generate-reconciliation-report.js
```

### Search Not Finding Products
The scripts use product titles and SKUs for searching. If products exist but aren't found:
- Check product is published (not draft)
- Verify SEO/search settings are enabled
- Try searching manually to confirm product exists

## Advanced Usage

### Custom SKU Matching
To match products by custom SKU instead of search:

Edit `check-wordpress-products.js`:
```javascript
// Change from search-based to direct URL lookup
const productUrl = `${wpSite}/product/${product.slug}/`;
// or
const productUrl = `${wpSite}/?sku=${product.sku}`;
```

### Filter Specific Products
To check only a subset of products:

Edit the script and modify:
```javascript
const productsToCheck = catalogData.products.filter(p => 
  p.title.includes('Sunbrella') // Only check Sunbrella products
);
```

### Automated Scheduling
To run reconciliation weekly:

```bash
# Add to crontab (runs every Monday at 2 AM)
0 2 * * 1 cd /path/to/fabric-scraper && node run-full-reconciliation.js >> logs/reconciliation.log 2>&1
```

## Integration with WordPress All Import

Once you have the list of missing products from the report:

1. Create a filtered CSV with just missing products:
```bash
node -e "
const report = require('./output/product-reconciliation-report.json');
const skus = report.actions.productsToAdd.map(p => p.sku);
// Use these SKUs to filter wp_all_import_products.csv
"
```

2. Use WordPress All Import with these settings:
   - Import Type: Update and Create
   - Match By: SKU
   - Import Images: Yes
   - Update All Data: Yes

## Next Steps

1. **Run Initial Reconciliation:**
   ```bash
   node run-full-reconciliation.js
   ```

2. **Review Report:**
   - Check `RECONCILIATION-REPORT.txt`
   - Review JSON reports for details

3. **Take Action:**
   - Remove discontinued products
   - Import missing products
   - Update outdated information

4. **Schedule Regular Checks:**
   - Monthly or quarterly reconciliation
   - Immediate check when vendor updates

## Support

For issues or questions:
- Check individual report files for detailed error messages
- Review browser DevTools if scripts fail
- Verify site URLs are correct and accessible
