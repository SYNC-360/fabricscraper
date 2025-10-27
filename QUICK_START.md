# 🚀 Quick Start Guide - Fabric Scraper

## Current Status: ✅ PRODUCTION READY

All 20 United Fabrics products are scraped, priced, and ready for WordPress import!

---

## 📦 What You Have

### Generated CSV Files (Ready to Use)
1. **wp_all_import_products.csv** ← **Use this for WordPress All Import**
   - 20 products
   - 35 columns (complete WordPress format)
   - All pricing applied
   - All specifications included

2. **woocommerce_products_full.csv** ← For WooCommerce direct import
3. **shopify_products_full.csv** ← For Shopify direct import

### Pricing Data Files
- **PRICING_TEMPLATE.csv** - Current wholesale prices (editable)
- **full-scrape-details.json** - Complete product data with all details

---

## 💰 Pricing Overview

| Metric | Value |
|--------|-------|
| **Total Wholesale Value** | $508.00 |
| **Total Sale Value** | $1,270.00 |
| **Total Retail Value** | $1,651.00 |
| **Average Price per Product** | $25.40 (wholesale) |
| **Profit Margin** | 225% (3.25x retail multiplier) |

---

## 📋 All 20 Products with Current Pricing

```
1.  Arcade              $35 → $87.50  → $113.75
2.  Chessie             $42 → $105.00 → $136.50
3.  Martha              $28 → $70.00  → $91.00
4.  Trellis             $26 → $65.00  → $84.50
5.  Tucker              $18 → $45.00  → $58.50
6.  Yardly              $32 → $80.00  → $104.00
7.  Elias               $22 → $55.00  → $71.50
8.  Pike                $24 → $60.00  → $78.00
9.  Sierra              $20 → $50.00  → $65.00
10. Teton               $19 → $47.50  → $61.75
11. Canvas              $36 → $90.00  → $117.00
12. Beatrix             $25 → $62.50  → $81.25
13. Carver              $21 → $52.50  → $68.25
14. Clara               $26 → $65.00  → $84.50
15. Cottage Check       $23 → $57.50  → $74.75
16. Field Stripe        $18 → $45.00  → $58.50
17. Gingham             $22 → $55.00  → $71.50
18. Keswick             $24 → $60.00  → $78.00
19. Margot              $27 → $67.50  → $87.75
20. Prairie Plaid       $20 → $50.00  → $65.00
```

**Legend:** Wholesale → Sale Price (×2.5) → Retail Price (×3.25)

---

## 🎯 How to Import to WordPress

### Quick Steps (5 minutes)

1. **Install WP All Import Plugin**
   - WordPress Dashboard → Plugins → Add New
   - Search "WP All Import" → Install & Activate

2. **Create New Import**
   - All Import → New Import
   - Select: `/Users/richard/Desktop/Fabric Scraper/output/wp_all_import_products.csv`
   - Choose: "WooCommerce Product" import type

3. **Map Columns** (Match these fields)
   - Name → Name
   - SKU → SKU
   - Sale Price → Sale Price
   - Retail Price → Retail Price
   - Image1 → Product Images
   - Content → Product Description

4. **Import**
   - Preview to verify
   - Click "Import" to add all 20 products

---

## 🔄 How to Update Prices

### If You Want to Change Wholesale Prices

1. **Edit the pricing file:**
   ```bash
   # Open in Excel/Google Sheets:
   /Users/richard/Desktop/Fabric Scraper/output/PRICING_TEMPLATE.csv
   ```

2. **Update wholesale prices** (column 3) for any products

3. **Regenerate the WordPress CSV:**
   ```bash
   cd /Users/richard/Desktop/Fabric\ Scraper
   node apply_pricing.js
   ```

4. **Use the new CSV for import:**
   - `wp_all_import_products.csv` will be updated automatically

---

## 📊 What Data is Included

For each product, the CSV contains:

- **Basic Info:** Brand, Name, SKU, Full Name, Color
- **Pricing:** Wholesale Price, Sale Price, Retail Price
- **Images:** Up to 3 product images + gallery
- **Specifications (18+):**
  - Content (fabric material)
  - Weight & Width
  - Backing material
  - Finish/Topcoat
  - Application (indoor/outdoor)
  - Origin & Collection
  - Performance metrics (abrasion, pilling, crocking, etc.)
  - Color fastness & flammability

---

## 🛠️ File Locations

```
/Users/richard/Desktop/Fabric Scraper/
├── output/
│   ├── wp_all_import_products.csv          ✅ USE THIS
│   ├── woocommerce_products_full.csv       (Alternative)
│   ├── shopify_products_full.csv           (Alternative)
│   ├── PRICING_TEMPLATE.csv                (Edit this for prices)
│   └── full-scrape-details.json            (Raw data)
├── apply_pricing.js                        (Update prices)
├── full-scrape.js                          (Re-scrape if needed)
├── PRICING_COMPLETE_SUMMARY.md             (Full details)
└── QUICK_START.md                          (This file)
```

---

## ✅ Verification Checklist

Before importing:
- [ ] WordPress All Import plugin is installed & active
- [ ] CSV file location verified
- [ ] Preview shows all 20 products
- [ ] Prices look correct
- [ ] Images are loading
- [ ] No import errors shown

---

## 🔗 CSV Format Specifications

- **Format:** UTF-8 CSV
- **Delimiter:** Comma (,)
- **Text Qualifier:** Double quotes (")
- **Header Row:** Yes (included)
- **Data Rows:** 20 products
- **Columns:** 35 (matches WordPress All Import standard)

---

## 📞 Troubleshooting

| Issue | Solution |
|-------|----------|
| "File not found" | Check exact path: `/Users/richard/Desktop/Fabric Scraper/output/wp_all_import_products.csv` |
| Prices not updating | Run: `node apply_pricing.js` from project directory |
| Images not loading | Verify URLs are accessible; may need to download and host locally |
| Specifications empty | Check that `full-scrape-details.json` contains spec data |
| CSV won't open in Excel | Use "Open with" → Excel, ensure UTF-8 encoding |

---

## 🎓 Understanding the Pricing Formula

```
Wholesale × 2.5 = Sale Price
Wholesale × 3.25 = Retail Price
```

**Example:** Arcade fabric at $35 wholesale
- Sale Price: $35 × 2.5 = $87.50
- Retail Price: $35 × 3.25 = $113.75
- Your profit (wholesale → retail): $78.75 per unit
- Margin: 225%

---

## 📝 Important Notes

- ✅ All products are fully scraped with 18+ specification fields
- ✅ Color/variant data is extracted from product swatches
- ✅ Product images are hosted on United Fabrics servers
- ✅ Pricing can be easily updated by editing PRICING_TEMPLATE.csv
- ✅ Formula ensures consistent 225% margin across all products
- ✅ CSV is in WordPress All Import standard format (35 columns)
- ✅ Ready for immediate production import

---

**Last Updated:** 2025-10-27  
**Status:** ✅ PRODUCTION READY  
**Products:** 20/20 Complete  
**Pricing:** All applied ✓

Need more info? See **PRICING_COMPLETE_SUMMARY.md** for full documentation.
