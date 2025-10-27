# Deployment Guide

## Local Development

```bash
# 1. Setup
pnpm install
cp .env.example .env
# Edit .env with real credentials

# 2. Build
pnpm build

# 3. Run scraper
pnpm start:scrape
# Outputs: output/shopify_products.csv, output/woocommerce_products.csv, output/wp_all_import.csv

# 4. Run status API (separate terminal)
pnpm start:api
# Visit http://localhost:3000
```

---

## Docker Local Run

```bash
# Build image
docker build -t sync360-scraper:latest -f apps/scraper/Dockerfile .

# Run with env file
docker run --rm -v $(pwd)/output:/app/output --env-file .env sync360-scraper:latest
```

---

## Apify Platform Deployment

### Method 1: CLI Push

```bash
# Install Apify CLI globally
npm install -g apify-cli

# Login to Apify
apify login

# From project root
apify push

# Follow prompts:
# - Actor name: "sync360-united-fabrics-scraper"
# - Description: "UnitedFabrics scraper → Shopify/WooCommerce/WPAI"
# - Version: "1.0.0"
```

### Method 2: Manual Upload

1. Go to [Apify Console](https://console.apify.com)
2. Create new Actor
3. Choose "Source code"
4. Upload ZIP file or connect GitHub
5. Configure:
   - **Build command:** `pnpm install && pnpm build`
   - **Start command:** `node dist/apps/scraper/src/actor.js`
6. Add input schema from `apps/scraper/apify_input_schema.json`
7. Save & build

### Running the Actor

1. Open Actor → Input
2. Provide credentials:
   ```json
   {
     "startUrls": ["https://www.unitedfabrics.com/fabric/"],
     "ufEmail": "your-email@example.com",
     "ufPassword": "your-password",
     "maxPages": 0,
     "concurrency": 5,
     "respectRobotsTxt": false
   }
   ```
3. Click "Start" → Monitor logs in "Logs" tab
4. After completion, download CSVs from Key-Value Store

### Setting Up Weekly Schedule

1. Actor → Schedules → New schedule
2. Cron expression: `0 2 * * 0` (2 AM UTC, Sundays)
3. Provide input with credentials
4. Enable "Repeat"

---

## Vercel Deployment (Status API)

### Prerequisites

- GitHub account with repo
- [Vercel account](https://vercel.com)

### Option 1: Connect GitHub (Recommended)

1. Push code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. New Project → Import Git Repository
4. Select your repo
5. Configure:
   - **Framework:** Next.js
   - **Root Directory:** `./apps/status-api`
   - **Build command:** `pnpm install && pnpm build` (auto-detected)
   - **Output directory:** `.next` (auto-detected)
6. Deploy

### Option 2: CLI Deploy

```bash
# Install Vercel CLI
npm install -g vercel

# From apps/status-api
cd apps/status-api
vercel

# Follow prompts:
# - Project name: "sync360-status"
# - Link to existing project? No
# - Deploy to staging first
```

### Viewing Deployment

- Dashboard URL: `https://sync360-status.vercel.app` (or your domain)
- Logs: Vercel Dashboard → Project → Deployments → Logs

### Connecting to Local Scraper Output

The status API reads `output/last-run.json` from local runs. To sync:

**Option A: GitHub Actions**
```yaml
- name: Upload output
  uses: actions/upload-artifact@v3
  with:
    name: scraper-output
    path: output/last-run.json
```

Then manually copy to server or via API.

**Option B: Vercel KV Store (Enterprise)**
Use Vercel's KV Store to persist state between deploys:
```typescript
import { kv } from "@vercel/kv";

export async function GET() {
  const lastRun = await kv.get('last-run-summary');
  return Response.json(lastRun || {});
}
```

---

## AWS Lambda Deployment (Serverless)

```bash
# Install Serverless Framework
npm install -g serverless

# Create serverless.yml
cat > serverless.yml <<EOF
service: sync360-scraper

provider:
  name: aws
  runtime: nodejs20.x
  memorySize: 2048
  timeout: 600
  environment:
    UF_EMAIL: ${ssm:/uf-email}
    UF_PASSWORD: ${ssm:/uf-password}

functions:
  scraper:
    handler: dist/apps/scraper/src/local.handler
    events:
      - schedule:
          rate: cron(0 2 * * ? *)  # 2 AM UTC daily
          enabled: true

resources:
  Resources:
    ScrapeOutputBucket:
      Type: AWS::S3::Bucket
      Properties:
        BucketName: sync360-fabric-scraper-output
EOF

# Deploy
serverless deploy
```

---

## GitHub Actions Scheduled Run

Create `.github/workflows/scrape-weekly.yml`:

```yaml
name: Weekly Fabric Scraper

on:
  schedule:
    - cron: '0 2 * * 0'  # 2 AM UTC Sundays
  workflow_dispatch:      # Manual trigger

jobs:
  scrape:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install & Build
        run: pnpm install && pnpm -w build

      - name: Run Scraper
        run: pnpm start:scrape
        env:
          UF_EMAIL: ${{ secrets.UF_EMAIL }}
          UF_PASSWORD: ${{ secrets.UF_PASSWORD }}
          MAX_PAGES: '0'

      - name: Upload Outputs
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: scraper-output
          path: |
            output/*.csv
            output/last-run.json
          retention-days: 30

      - name: Commit Results (Optional)
        if: always()
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add output/
          git commit -m "Update fabric data [skip ci]" || true
          git push
```

Add secrets to GitHub:
1. Settings → Secrets → New repository secret
2. Add `UF_EMAIL` and `UF_PASSWORD`

---

## Monitoring & Error Handling

### Apify

- Actor page → Insights: View success/failure rates
- Set up webhook to notify on failure:
  ```json
  {
    "eventTypes": ["actor.run.failed"],
    "url": "https://your-webhook.com/notify",
    "payloadTemplate": {
      "actorName": "{actorName}",
      "runId": "{runId}",
      "status": "{status}"
    }
  }
  ```

### Vercel

- Deployment notifications via email or Slack
- Monitor API response times in Analytics tab

### Local / GitHub Actions

- Set up email notifications on workflow failure
- Parse `last-run.json` to detect errors:
  ```bash
  ERRORS=$(jq '.errors' output/last-run.json)
  if [ "$ERRORS" -gt 0 ]; then
    # Send alert
  fi
  ```

---

## Troubleshooting Deployments

### Apify: "preNavigationHooks is not an array"

**Cause:** JSON input provided hooks as string instead of array.

**Fix:** Ensure input schema doesn't include hooks; define in code:
```typescript
// actor.ts
const crawler = new PlaywrightCrawler({
  preNavigationHooks: [async ({ request }, gotoOptions) => { ... }],
  // NOT from input JSON
});
```

### Vercel: "Cannot find module '@packages/utils'"

**Cause:** Monorepo dependencies not installed.

**Fix:**
```json
{
  "buildCommand": "cd ../../ && pnpm install && pnpm build"
}
```

Or use `pnpm workspaces` with symlinks.

### Out of Memory (Apify)

**Symptom:** Actor crashes after 500 products.

**Fix:** Increase memory in `actor.json`:
```json
{
  "memory": 1024,  // Default
  "memoryMbytes": 2048
}
```

Or stream output instead of accumulating in memory.

---

## Rollback

### Apify

Old versions available under Actor → Builds. Select and click "Set as default".

### Vercel

Deployments tab → Previous version → "Promote to Production".

### GitHub Actions

Re-run previous successful workflow:
Workflow page → Previous run → Re-run jobs.

---

## Cost Estimates

| Platform | Cost | Notes |
|----------|------|-------|
| Apify (free) | $0 | ~500 run minutes/month, 1 GB storage |
| Apify (Pro) | $29–299/month | Unlimited runs, more storage |
| Vercel (free) | $0 | 100 GB bandwidth/month |
| GitHub Actions | $0 | 2,000 free minutes/month for private repos |
| AWS Lambda | ~$5/month | 1M requests/month free tier |

---

Enjoy! 🚀
