# Real-Time Product Synchronization Architecture

## Overview

This document outlines the architecture for automatically syncing product data (prices, inventory) from United Fabrics vendor to your two retail platforms (WordPress & Shopify) in real-time.

**Current State**: Manual reporting system (weekly reconciliation)
**Target State**: Automatic sync system (every 6 hours or real-time)

---

## 1. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    VENDOR DATA SOURCE                        │
│                   (United Fabrics B2B)                       │
│                                                               │
│  • 20 Products                                               │
│  • Real wholesale prices ($14.21-$50.96)                     │
│  • Combined inventory (NJ + CA: 858 yards)                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Check every 6 hours
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              SCRAPER + COMPARISON ENGINE                     │
│           (GitHub Actions - 6hr interval)                    │
│                                                               │
│  1. login_and_scrape_prices.js                               │
│     → Get latest wholesale prices                            │
│                                                               │
│  2. extract_stock.js                                         │
│     → Get latest inventory (NJ + CA combined)                │
│                                                               │
│  3. compare-and-detect-changes.js (NEW)                      │
│     → Compare against last known state                       │
│     → Detect: price changes, stock changes                   │
│     → Flag: new products, discontinued products              │
│                                                               │
│  4. generate-sync-queue.js (NEW)                             │
│     → Create list of products needing sync                   │
│     → Store in products-to-sync.json                         │
└────────────────┬────────────────────┬────────────────────────┘
                 │                    │
         If changes detected:    Track history:
         │                       │
         ▼                       ▼
    ┌──────────────────┐   ┌──────────────────┐
    │  SYNC ENGINES    │   │  HISTORY LOG     │
    │ (new scripts)    │   │  (JSON files)    │
    └──────────────────┘   └──────────────────┘
         │
    ┌────┴────┐
    │          │
    ▼          ▼
┌────────┐  ┌────────┐
│ WP API │  │ Shopify│
│ SYNC   │  │ API    │
└───┬────┘  │ SYNC   │
    │       └───┬────┘
    │           │
    ▼           ▼
┌────────────────────────┐  ┌────────────────────────┐
│     WORDPRESS SITE     │  │      SHOPIFY SITE      │
│ bestupholsteryfabric   │  │ upholsteryfabricbythe  │
│      .com              │  │      yard.com          │
│                        │  │                        │
│  20 products with:     │  │  20 products with:     │
│  • Updated prices      │  │  • Updated prices      │
│  • Updated inventory   │  │  • Updated inventory   │
│  • Auto-synced         │  │  • Auto-synced         │
└────────────────────────┘  └────────────────────────┘
```

---

## 2. Data Flow

### A. Initial Sync (Day 1)

```
1. Run full reconciliation
   ├─ Check vendor availability
   ├─ Check WordPress sync
   ├─ Check Shopify sync
   └─ Generate reconciliation report

2. Manual verification
   ├─ Review RECONCILIATION-REPORT.txt
   ├─ Check for discrepancies
   └─ Verify products are correct

3. Generate baseline state
   ├─ vendor-baseline.json (prices, stock)
   ├─ wordpress-state.json (current WP state)
   └─ shopify-state.json (current Shopify state)
```

### B. Continuous Sync (Every 6 Hours)

```
1. DETECT PHASE (5-10 min)
   ├─ Scrape current vendor data
   │  ├─ Latest prices
   │  └─ Latest stock
   ├─ Compare to last baseline
   │  ├─ Price changed? ±5% threshold
   │  └─ Stock changed? Any amount
   └─ Identify what needs updating

2. QUEUE PHASE (1 min)
   ├─ Build sync queue
   │  ├─ products-to-sync.json
   │  ├─ price-changes.json
   │  └─ stock-changes.json
   └─ Log changes to history

3. SYNC PHASE (5-10 min)
   ├─ WordPress sync
   │  ├─ Update each product price
   │  ├─ Update each product stock
   │  └─ Log success/failure
   └─ Shopify sync
      ├─ Update each variant price
      ├─ Update each inventory level
      └─ Log success/failure

4. VERIFY PHASE (2-5 min)
   ├─ Check WordPress updates applied
   ├─ Check Shopify updates applied
   ├─ Generate sync report
   └─ Email alert if issues found
```

---

## 3. File Structure (New Files)

```
Fabric Scraper/
├── existing files...
│
├── SYNC SCRIPTS (New)
│  ├─ compare-and-detect-changes.js
│  │  └─ Detects price/stock changes
│  ├─ generate-sync-queue.js
│  │  └─ Builds queue of changes
│  ├─ sync-to-wordpress.js
│  │  └─ Updates WordPress products
│  ├─ sync-to-shopify.js
│  │  └─ Updates Shopify products
│  └─ run-realtime-sync.js
│     └─ Master orchestration script
│
├── STATE FILES (Generated)
│  ├─ state/
│  │  ├─ vendor-baseline.json (current vendor state)
│  │  ├─ wordpress-state.json (current WP state)
│  │  ├─ shopify-state.json (current Shopify state)
│  │  └─ last-sync-timestamp.txt
│  │
│  └─ sync-logs/
│     ├─ 2025-01-15-sync-report.json
│     ├─ 2025-01-15-price-changes.json
│     ├─ 2025-01-15-stock-changes.json
│     └─ sync-history.json (cumulative)
│
├─ .github/workflows/
│  └─ realtime-sync.yml (updated)
│     └─ Runs every 6 hours
│
└─ CONFIG (New)
   └─ sync-config.json
      ├─ Threshold for price changes (±5%)
      ├─ Threshold for stock changes (any)
      └─ WordPress API credentials
      └─ Shopify API credentials
```

---

## 4. Detailed Script Specifications

### Script 1: compare-and-detect-changes.js

**Purpose**: Detect what changed since last sync

**Input**:
- Current vendor data (prices, stock)
- Last baseline state

**Output**:
- `changes.json` with detected changes
- `price-changes.json` (detailed)
- `stock-changes.json` (detailed)

**Logic**:
```javascript
for each product:
  ├─ Compare price vs baseline
  │  └─ If |new - old| > 5%: flag as changed
  ├─ Compare stock vs baseline
  │  └─ If new != old: flag as changed
  └─ Track timestamps
```

**Example Output**:
```json
{
  "timestamp": "2025-01-15T10:30:00Z",
  "changes": [
    {
      "sku": "UF-1761522034985",
      "product": "Arcade",
      "priceChanged": true,
      "oldPrice": 25.50,
      "newPrice": 26.75,
      "percentChange": 4.9,
      "stockChanged": true,
      "oldStock": 88,
      "newStock": 85,
      "action": "SYNC_REQUIRED"
    }
  ],
  "summary": {
    "totalChanges": 3,
    "priceChanges": 2,
    "stockChanges": 3,
    "needsSync": 3
  }
}
```

---

### Script 2: generate-sync-queue.js

**Purpose**: Create ordered list of products to sync

**Input**:
- `changes.json` from previous script
- Current WordPress/Shopify state

**Output**:
- `products-to-sync.json`
- `sync-priority-queue.json`

**Logic**:
```
1. Filter only changed products
2. Determine sync priority
   ├─ CRITICAL: Out of stock (0) on vendor
   ├─ HIGH: Large price change (>10%)
   ├─ MEDIUM: Stock/price change <10%
   └─ LOW: Minor price adjustments
3. Sort by priority
4. Add sync metadata
   ├─ Retry count
   ├─ Last attempted
   └─ Status: pending/in-progress/done
```

**Example Output**:
```json
{
  "queue": [
    {
      "priority": "CRITICAL",
      "sku": "UF-1761522035",
      "product": "Martha",
      "syncTo": ["wordpress", "shopify"],
      "changes": {
        "stock": { "from": 31, "to": 0 },
        "price": null
      },
      "retries": 0,
      "lastAttempt": null,
      "status": "pending"
    },
    {
      "priority": "HIGH",
      "sku": "UF-1761522034985",
      "product": "Arcade",
      "syncTo": ["wordpress", "shopify"],
      "changes": {
        "price": { "from": 25.50, "to": 26.75 },
        "stock": { "from": 88, "to": 85 }
      }
    }
  ]
}
```

---

### Script 3: sync-to-wordpress.js

**Purpose**: Update products on WordPress site

**Input**:
- `products-to-sync.json`
- WordPress API credentials

**Output**:
- `wordpress-sync-report.json`
- Updates applied on WordPress

**Process**:
```
1. Read sync queue
2. For each product:
   ├─ Find product by SKU via search API
   │  └─ GET /wp-json/wc/v3/products?sku=SKU
   │
   ├─ Prepare update payload
   │  ├─ If price changed:
   │  │  ├─ regular_price = wholesale × 2.5
   │  │  └─ sale_price = wholesale × 3.25
   │  └─ If stock changed:
   │     └─ stock_quantity = new_stock
   │
   ├─ Send update
   │  └─ PUT /wp-json/wc/v3/products/{id}
   │
   └─ Log result
      ├─ Success: log as synced
      └─ Failure: retry queue
```

**Example API Call**:
```bash
# Find product
GET https://bestupholsteryfabric.com/wp-json/wc/v3/products?sku=UF-1761522034985
Auth: WooCommerce Key/Secret

# Update product
PUT https://bestupholsteryfabric.com/wp-json/wc/v3/products/123
{
  "regular_price": "67.38",    // $26.75 × 2.5
  "sale_price": "86.94",        // $26.75 × 3.25
  "stock_quantity": 85
}
```

**Error Handling**:
```javascript
if (syncResult.failed) {
  if (retryCount < 3) {
    requeue(product);  // Retry later
  } else {
    alert(`Failed to sync ${product.sku} after 3 attempts`);
  }
}
```

---

### Script 4: sync-to-shopify.js

**Purpose**: Update products on Shopify store

**Input**:
- `products-to-sync.json`
- Shopify API token

**Output**:
- `shopify-sync-report.json`
- Updates applied on Shopify

**Process**:
```
1. Read sync queue
2. For each product:
   ├─ Find variant by SKU/title
   │  └─ Query product database
   │
   ├─ Update price
   │  ├─ GraphQL mutation: productUpdate
   │  └─ variant.price = new_price
   │
   ├─ Update inventory
   │  ├─ GraphQL mutation: inventoryAdjustQuantities
   │  └─ Adjust to new level
   │
   └─ Log result
```

**Example GraphQL Mutation**:
```graphql
mutation updateProduct($input: ProductInput!) {
  productUpdate(input: $input) {
    product {
      id
      variants(first: 1) {
        edges {
          node {
            id
            price
          }
        }
      }
    }
  }
}

{
  "input": {
    "id": "gid://shopify/Product/12345",
    "variants": [{
      "id": "gid://shopify/ProductVariant/67890",
      "price": "86.94"
    }]
  }
}
```

---

### Script 5: run-realtime-sync.js

**Purpose**: Master orchestration script

**Flow**:
```
1. Check prerequisites
   ├─ Verify API credentials exist
   ├─ Test WordPress API access
   └─ Test Shopify API access

2. Scrape latest vendor data
   ├─ Run login_and_scrape_prices.js
   └─ Run extract_stock.js

3. Detect changes
   └─ Run compare-and-detect-changes.js

4. Build sync queue
   └─ Run generate-sync-queue.js

5. Execute syncs
   ├─ Run sync-to-wordpress.js
   └─ Run sync-to-shopify.js

6. Generate report
   ├─ Combine all reports
   ├─ Track sync history
   └─ Send alerts if needed

7. Update baseline
   └─ Save current state as new baseline
```

**Output**:
```
sync-report-2025-01-15-10-30.json
├─ timestamp
├─ changes: [list of all changes]
├─ wordpress_sync:
│  ├─ success_count
│  ├─ failure_count
│  └─ failed_products: [list]
├─ shopify_sync:
│  ├─ success_count
│  ├─ failure_count
│  └─ failed_products: [list]
└─ alerts: [any issues found]
```

---

## 5. GitHub Actions Configuration

### Updated `.github/workflows/realtime-sync.yml`

```yaml
name: Real-Time Product Sync

on:
  # Run every 6 hours
  schedule:
    - cron: '0 */6 * * *'

  # Manual trigger
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Run real-time sync
        env:
          WP_API_KEY: ${{ secrets.WP_API_KEY }}
          WP_API_SECRET: ${{ secrets.WP_API_SECRET }}
          SHOPIFY_API_TOKEN: ${{ secrets.SHOPIFY_API_TOKEN }}
          SHOPIFY_STORE: ${{ secrets.SHOPIFY_STORE }}
          UF_EMAIL: ${{ secrets.UF_EMAIL }}
          UF_PASSWORD: ${{ secrets.UF_PASSWORD }}
        run: node run-realtime-sync.js

      - name: Commit sync reports
        if: always()
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add sync-logs/*.json -f
          git add state/*.json -f
          git commit -m "Auto-sync: $(date)" || echo "No changes"
          git push

      - name: Upload sync reports
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: sync-reports
          path: sync-logs/
          retention-days: 90

      - name: Alert on failures
        if: failure()
        run: |
          echo "⚠️ Sync failed - check logs"
```

---

## 6. Configuration File

### `sync-config.json`

```json
{
  "sync": {
    "frequency": "0 */6 * * *",
    "comment": "Every 6 hours. Change to '0 * * * *' for hourly, '0 */4' for 4-hour"
  },
  "thresholds": {
    "priceChangePercent": 5,
    "comment": "Flag prices that change >5% as SYNC_REQUIRED"
  },
  "wordpress": {
    "apiUrl": "https://bestupholsteryfabric.com",
    "priceMultipliers": {
      "regular": 2.5,
      "sale": 3.25
    },
    "credentialsFrom": ".env (WP_API_KEY, WP_API_SECRET)"
  },
  "shopify": {
    "store": "upholsteryfabricbytheyard",
    "apiVersion": "2024-01",
    "credentialsFrom": ".env (SHOPIFY_API_TOKEN, SHOPIFY_STORE)"
  },
  "vendor": {
    "url": "https://www.unitedfabrics.com",
    "auth": ".env (UF_EMAIL, UF_PASSWORD)"
  },
  "retry": {
    "maxAttempts": 3,
    "delayMs": 5000
  },
  "alerts": {
    "sendEmail": true,
    "sendToEmail": "your-email@example.com"
  }
}
```

---

## 7. State Management

### Baseline State Format (`vendor-baseline.json`)

```json
{
  "timestamp": "2025-01-15T04:30:00Z",
  "products": [
    {
      "sku": "UF-1761522034985",
      "title": "Arcade",
      "wholesale_price": 26.75,
      "stock_nj": 40,
      "stock_ca": 45,
      "stock_total": 85,
      "last_checked": "2025-01-15T04:15:00Z"
    }
  ]
}
```

### Sync History Format (`sync-history.json`)

```json
{
  "total_syncs": 24,
  "last_sync": "2025-01-15T10:30:00Z",
  "syncs": [
    {
      "timestamp": "2025-01-15T10:30:00Z",
      "changes_detected": 3,
      "wordpress_updated": 3,
      "shopify_updated": 3,
      "failures": 0,
      "status": "success"
    }
  ]
}
```

---

## 8. Error Handling & Retry Logic

### Network Issues
```javascript
async function syncWithRetry(product, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await updateProduct(product);
      return { status: 'success' };
    } catch (error) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        if (attempt < maxRetries) {
          console.log(`Retry ${attempt}/${maxRetries} for ${product.sku}`);
          await delay(5000 * attempt);  // Exponential backoff
          continue;
        }
      }
      throw error;
    }
  }
}
```

### API Rate Limiting
```javascript
// WordPress: 40 requests per 10 seconds
const wpQueue = [];
async function syncToWordPress(product) {
  wpQueue.push(product);
  if (wpQueue.length >= 40) {
    await processWpQueue();
    await delay(10000);
  }
}

// Shopify: 2 queries per second
async function syncToShopify(product) {
  await delay(500);  // Ensure <2 per second
  // ... sync code
}
```

### Data Validation
```javascript
// Validate before sync
function validateSyncData(product) {
  if (!product.sku) throw new Error('Missing SKU');
  if (!product.newPrice || product.newPrice <= 0) {
    throw new Error('Invalid price');
  }
  if (product.newStock < 0) throw new Error('Invalid stock');
  return true;
}
```

---

## 9. Alerts & Notifications

### Email Alerts on Issues

```javascript
async function sendAlert(subject, body) {
  if (process.env.ALERT_EMAIL) {
    // Using GitHub Actions email or sendgrid
    await sendEmail({
      to: process.env.ALERT_EMAIL,
      subject: subject,
      html: body
    });
  }
}

// Alert scenarios:
sendAlert(
  'Sync Failed: Out of Stock',
  `Product ${sku} is now 0 stock on vendor but not updated on retail sites`
);

sendAlert(
  'Sync Failed: API Error',
  `Failed to update ${sku} on WordPress after 3 attempts: ${error.message}`
);

sendAlert(
  'Price Alert',
  `Arcade price dropped 15% from $25.50 to $21.63 wholesale`
);
```

---

## 10. Monitoring Dashboard (Optional)

### What to Track

```
Dashboard Metrics:
├─ Sync Status (Last sync timestamp, next sync)
├─ Success Rate (% of products synced successfully)
├─ Failed Products (list needing manual attention)
├─ Price Changes (# and % changed this week)
├─ Stock Changes (# products with stock updates)
├─ API Health (WP, Shopify uptime)
└─ Alerts (recent issues/fixes)
```

### Implementation
```javascript
// Generate dashboard data
function generateDashboard() {
  return {
    lastSync: fs.readFileSync('state/last-sync-timestamp.txt'),
    nextSync: calculateNextSync(),
    thisWeekStats: analyzeHistory('7d'),
    recentErrors: getRecentErrors('24h'),
    productsSyncedToday: countSuccesses('24h')
  };
}

// Commit to repo for viewing on GitHub
fs.writeFileSync('dashboard.json', JSON.stringify(data, null, 2));
git.add('dashboard.json');
git.commit('Update dashboard metrics');
```

---

## 11. Rollout Plan

### Phase 1: Setup (Week 1)
- [ ] Create WordPress API credentials
- [ ] Create Shopify API token
- [ ] Add credentials to GitHub Secrets
- [ ] Create sync scripts (5 scripts, ~1000 lines total)

### Phase 2: Testing (Week 2)
- [ ] Test each script individually
- [ ] Test with 2-3 test products
- [ ] Verify price calculation (×2.5 and ×3.25)
- [ ] Verify stock updates

### Phase 3: Pilot (Week 3)
- [ ] Enable sync for 5 products
- [ ] Monitor for 1 week
- [ ] Check sync reports daily
- [ ] Fix any issues

### Phase 4: Full Deployment (Week 4)
- [ ] Enable for all 20 products
- [ ] Monitor for 2 weeks
- [ ] Set up email alerts
- [ ] Document runbook

---

## 12. Success Metrics

**System is working well when:**

```
✓ 99%+ of syncs complete successfully
✓ Average sync time < 15 minutes
✓ Price changes detected within 6 hours
✓ Stock updates applied within 10 minutes
✓ Zero data corruption (prices/stock never wrong)
✓ Easy rollback if issues occur
```

---

## 13. Backup & Recovery

### Backup Strategy
```bash
# Maintain 3 versions of baseline state
state/
├─ vendor-baseline-current.json (latest)
├─ vendor-baseline-backup1.json (24h old)
└─ vendor-baseline-backup2.json (48h old)

# Full sync history for audit trail
sync-logs/
└─ [date]-sync-report.json (every 6 hours)
```

### Recovery Procedure
```
If sync corrupts a price:
1. Identify from sync-report.json which product/time
2. Find last known good price in sync-history
3. Manually update WordPress/Shopify
4. Update vendor-baseline to match
5. Resume normal sync

If sync logic is broken:
1. Disable GitHub Actions
2. Review last failed sync report
3. Fix code locally
4. Test with 1-2 products
5. Re-enable and restart
```

---

## Summary

| Phase | What | Duration | Cost |
|-------|------|----------|------|
| **Phase 1** | Setup sync scripts | 1 week | Free |
| **Phase 2** | Testing with 2-3 products | 1 week | Free |
| **Phase 3** | Pilot with 5 products | 1 week | Free |
| **Phase 4** | Full deployment (20 products) | Ongoing | Free |

**Total investment**: ~3 weeks of development + ongoing maintenance

**Total cost**: $0 (GitHub Actions free tier)

**Benefit**: Always-accurate product catalog with no manual updating

