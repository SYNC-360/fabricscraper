# Automated Reconciliation - Complete Guide

## Overview

Three ways to automate product reconciliation without manual running:

1. **Cron Jobs** (Local computer, runs on schedule)
2. **GitHub Actions** (Cloud-based, runs 24/7)
3. **npm Scripts** (Easy command shortcuts)

Choose based on your needs:
- **Best for always-on:** GitHub Actions (cloud, no computer needed)
- **Best for local runs:** Cron (runs on your Mac schedule)
- **Best for convenience:** npm scripts (easy to remember commands)

---

## Option 1: Cron Jobs (Local Scheduling)

### What it does
Runs reconciliation automatically on your computer at specific times.

### Setup (5 minutes)

**Step 1: Open crontab editor**
```bash
crontab -e
```

**Step 2: Choose your schedule and add the line**

**WEEKLY (Every Monday 2 AM) - RECOMMENDED**
```
0 2 * * 1 cd '/Users/richard/Desktop/Fabric Scraper' && /usr/local/bin/node run-full-reconciliation.js >> '/Users/richard/Desktop/Fabric Scraper/logs/reconciliation.log' 2>&1
```

**DAILY VENDOR CHECK (Every day 6 AM)**
```
0 6 * * * cd '/Users/richard/Desktop/Fabric Scraper' && /usr/local/bin/node check-product-availability.js >> '/Users/richard/Desktop/Fabric Scraper/logs/daily-check.log' 2>&1
```

**TWICE WEEKLY (Monday & Thursday 2 AM)**
```
0 2 * * 1,4 cd '/Users/richard/Desktop/Fabric Scraper' && /usr/local/bin/node run-full-reconciliation.js >> '/Users/richard/Desktop/Fabric Scraper/logs/reconciliation.log' 2>&1
```

**Step 3: Save and exit**
- Press `Ctrl + X`
- Type `Y` to confirm
- Press `Enter` to save

**Step 4: Verify it was added**
```bash
crontab -l
```

### Check logs

```bash
# View recent logs
tail -f ~/Desktop/Fabric\ Scraper/logs/reconciliation.log

# View all logs
cat ~/Desktop/Fabric\ Scraper/logs/reconciliation.log

# Follow logs in real-time
tail -f ~/Desktop/Fabric\ Scraper/logs/reconciliation.log
```

### Cron Schedule Format

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (0 = Sunday)
│ │ │ │ │
│ │ │ │ │
* * * * * command_to_run
```

**Examples:**
- `0 2 * * 1` = Monday 2 AM
- `0 6 * * *` = Every day 6 AM
- `0 */6 * * *` = Every 6 hours
- `0 0 1 * *` = First day of month midnight
- `0 2 * * 1,4` = Monday & Thursday 2 AM

### Troubleshooting Cron

**Check if cron is running:**
```bash
ps aux | grep cron
```

**Debug cron by checking system logs:**
```bash
log stream --predicate 'process == "cron"'
```

**Test cron job manually:**
```bash
cd '/Users/richard/Desktop/Fabric Scraper' && node run-full-reconciliation.js
```

---

## Option 2: GitHub Actions (Cloud-based)

### What it does
Runs reconciliation automatically in the cloud. Works 24/7 even if your computer is off.

### Requirements
- Repository pushed to GitHub
- Repository must be public OR GitHub Actions enabled for private repos

### Setup (5 minutes)

**Step 1: The workflow file is already created**
Location: `.github/workflows/reconciliation.yml`

**Step 2: Push to GitHub**
```bash
cd '/Users/richard/Desktop/Fabric Scraper'
git add .
git commit -m "Add automated reconciliation via GitHub Actions"
git push -u origin main
```

**Step 3: Verify in GitHub**
- Go to: https://github.com/SYNC-360/fabricscraper
- Click "Actions" tab
- You should see "Product Reconciliation Check" workflow

**Step 4: Run manually to test**
1. Go to GitHub Actions tab
2. Click "Product Reconciliation Check"
3. Click "Run workflow"
4. Select "main" branch
5. Click "Run workflow"
6. Wait ~60 minutes for completion
7. Check "Artifacts" for reports

### Schedule explanation

The workflow runs:
- **Every Monday 2 AM UTC** (automated)
- **On-demand** (click "Run workflow" button)

To change schedule, edit `.github/workflows/reconciliation.yml` line:
```yaml
- cron: '0 2 * * 1'  # Change this
```

### View results

**Option A: GitHub Actions tab**
1. Go to https://github.com/SYNC-360/fabricscraper/actions
2. Click latest run
3. See reports and alerts

**Option B: Download artifacts**
1. Click latest run in GitHub Actions
2. Scroll to "Artifacts" section
3. Click "reconciliation-reports" to download
4. Extract ZIP to view JSON files

**Option C: Check commits**
1. Reports auto-committed to repository
2. Go to Code → output/ folder
3. View JSON/text files directly

### GitHub Actions benefits

✓ Runs automatically on schedule
✓ Works 24/7 even when computer is off
✓ Stores historical reports (90 days)
✓ Auto-commits reports to repository
✓ Creates alerts when issues found
✓ No setup needed after initial push

---

## Option 3: npm Scripts (Easy shortcuts)

### Setup

**Edit package.json and add to "scripts" section:**

```json
{
  "scripts": {
    "reconcile": "node run-full-reconciliation.js",
    "reconcile:vendor": "node check-product-availability.js",
    "reconcile:wordpress": "node check-wordpress-products.js",
    "reconcile:shopify": "node check-shopify-products.js",
    "reconcile:report": "node generate-reconciliation-report.js"
  }
}
```

### Usage

Then run with simple commands:

```bash
# Full reconciliation
npm run reconcile

# Vendor check only
npm run reconcile:vendor

# WordPress check only
npm run reconcile:wordpress

# Shopify check only
npm run reconcile:shopify

# Generate report from existing data
npm run reconcile:report
```

### Benefits

✓ Easy to remember
✓ Shorter commands
✓ Can combine with cron
✓ Works with any automation tool

---

## Recommended Setup

### For Best Results - Use All Three:

**1. Cron (local weekly full check)**
```
0 2 * * 1 cd '/Users/richard/Desktop/Fabric Scraper' && npm run reconcile >> logs/reconciliation.log 2>&1
```

**2. GitHub Actions (cloud backup)**
- Already configured in `.github/workflows/reconciliation.yml`
- Just push repo and enable in Actions tab

**3. npm Scripts (manual as needed)**
```bash
npm run reconcile:vendor  # Quick check anytime
npm run reconcile        # Full check when needed
```

---

## Workflow: Complete Setup in 10 minutes

### Step 1: Create logs directory
```bash
mkdir -p ~/Desktop/Fabric\ Scraper/logs
```

### Step 2: Add npm scripts to package.json
```json
"scripts": {
  "reconcile": "node run-full-reconciliation.js",
  "reconcile:vendor": "node check-product-availability.js"
}
```

### Step 3: Add cron job
```bash
crontab -e
# Add: 0 2 * * 1 cd '/Users/richard/Desktop/Fabric Scraper' && npm run reconcile >> logs/reconciliation.log 2>&1
# Save and exit
```

### Step 4: Push to GitHub
```bash
cd ~/Desktop/Fabric\ Scraper
git add .
git commit -m "Enable automation"
git push
```

### Step 5: Enable GitHub Actions
1. Go to https://github.com/SYNC-360/fabricscraper
2. Click "Actions"
3. Click "Enable GitHub Actions"

**Done!** Your reconciliation now runs automatically.

---

## Monitoring

### Check Local Logs
```bash
# Recent activity
tail -20 ~/Desktop/Fabric\ Scraper/logs/reconciliation.log

# Follow in real-time
tail -f ~/Desktop/Fabric\ Scraper/logs/reconciliation.log

# Search for errors
grep "ERROR\|FAILED" ~/Desktop/Fabric\ Scraper/logs/reconciliation.log
```

### Check GitHub Actions
1. Go to: https://github.com/SYNC-360/fabricscraper/actions
2. See all automated runs
3. Click any run for details

### Review Reports
- **Local:** `~/Desktop/Fabric Scraper/output/`
- **GitHub:** Repository → output folder or Artifacts

---

## Alerts & Notifications

### Email when discontinued products found

**Create alert script:**
```bash
cat > ~/Desktop/Fabric\ Scraper/send-alert.sh << 'SCRIPT'
#!/bin/bash
if [ -f output/vendor-availability-report.json ]; then
  if grep -q '"discontinued":\s*\[' output/vendor-availability-report.json; then
    echo "Discontinued products detected in latest reconciliation!" | \
    mail -s "Alert: Discontinued Fabric Products" your-email@example.com
  fi
fi
SCRIPT

chmod +x ~/Desktop/Fabric\ Scraper/send-alert.sh
```

**Add to crontab after reconciliation:**
```
0 2 * * 1 cd '/Users/richard/Desktop/Fabric Scraper' && npm run reconcile >> logs/reconciliation.log 2>&1 && bash send-alert.sh
```

### Slack notifications (GitHub Actions)

Add to `.github/workflows/reconciliation.yml`:

```yaml
- name: Send Slack notification
  if: always()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: 'Product Reconciliation Complete'
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

Then add Slack webhook to GitHub repository secrets.

---

## Troubleshooting

### Cron job not running

**Check:**
1. Cron is enabled: `sudo sysctl debug.lowpri_delay`
2. Full paths are used (not ~)
3. Job has permission to execute
4. Node is installed in /usr/local/bin

**Fix:**
```bash
# Find node location
which node

# Update crontab with full path
crontab -e
# Change /usr/local/bin/node to your path
```

### Reports not generating

**Check:**
```bash
# Run manually to see errors
cd ~/Desktop/Fabric\ Scraper
node run-full-reconciliation.js
```

**Common issues:**
- Internet connection down
- Vendor/retail sites not accessible
- Node modules not installed (run `npm install`)

### GitHub Actions failing

**Check:**
1. Go to Actions tab
2. Click failed workflow run
3. See error message
4. Common: Node version issue → update in `.github/workflows/reconciliation.yml`

---

## Best Practices

✓ **Always use full paths** in cron (not ~)
✓ **Keep logs** for at least 3 months
✓ **Test manually** before scheduling
✓ **Monitor first run** to catch issues
✓ **Review reports** weekly
✓ **Backup reports** (GitHub or local)
✓ **Use GitHub Actions** as backup to cron

---

## Checklist

- [ ] Created logs directory
- [ ] Added npm scripts to package.json
- [ ] Added cron job (if using cron)
- [ ] Pushed to GitHub (if using GitHub Actions)
- [ ] Enabled GitHub Actions
- [ ] Tested first automated run
- [ ] Verified reports generated
- [ ] Set up monitoring/alerts (optional)

---

## Next Steps

1. Choose automation method above
2. Follow setup instructions
3. Test first run
4. Monitor logs
5. Review reports regularly

---

**Questions?**
See: QUICK-RECONCILIATION-REFERENCE.txt or PRODUCT-RECONCILIATION-GUIDE.md
