# ⚡ Quick Start Guide

Get up and running in 5 minutes.

## Step 1: Install (1 min)

```bash
cd sync360-united-fabrics-scraper
pnpm install
pnpm build
```

## Step 2: Configure (1 min)

```bash
cp .env.example .env
```

Edit `.env`:
```env
UF_EMAIL=your-email@example.com
UF_PASSWORD=your-secure-password
MAX_PAGES=3        # For testing; use 0 for all
```

Save and close.

## Step 3: Run (1 min)

```bash
pnpm start:scrape
```

Watch the console output. Once complete, check:

```bash
ls -la output/
```

You should see:
- ✅ `shopify_products.csv`
- ✅ `woocommerce_products.csv`
- ✅ `wp_all_import.csv`
- ✅ `raw-products.jsonl`
- ✅ `last-run.json`

## Step 4: View Results (2 min)

### Option A: View CSVs locally
```bash
cat output/shopify_products.csv    # Shopify format
cat output/woocommerce_products.csv # WooCommerce format
cat output/wp_all_import.csv        # WPAI format
```

### Option B: View in Excel/Google Sheets
```bash
open output/shopify_products.csv    # macOS
start output/shopify_products.csv   # Windows
xdg-open output/shopify_products.csv # Linux
```

### Option C: View run stats
```bash
cat output/last-run.json            # Shows: products, pages, errors
```

---

## Next: Deploy to Apify

Once local testing works:

```bash
npm install -g apify-cli
apify login
apify push
```

Then manage runs from [apify.com/account](https://apify.com/account).

---

## Next: Deploy Status API to Vercel

```bash
cd apps/status-api
vercel
```

Then access your dashboard at the Vercel URL.

---

## Troubleshooting Quick Tips

| Issue | Fix |
|-------|-----|
| `pnpm: command not found` | `npm install -g pnpm` |
| `Module not found` | `pnpm install` |
| Login fails | Check `.env` credentials |
| No products found | Verify site hasn't changed; check selectors in `apps/scraper/src/selectors.ts` |
| CSVs are empty | Check `output/logs/` for errors |

---

## Full Documentation

- **Setup & Features** → `README.md`
- **Deployment** → `DEPLOYMENT.md`
- **Project Structure** → `STRUCTURE.txt`
- **Deliverables** → `PROJECT_SUMMARY.md`

---

**That's it! You're done.** 🎉

Now integrate the CSVs into Shopify/WooCommerce and enjoy your fabric data! 📊
