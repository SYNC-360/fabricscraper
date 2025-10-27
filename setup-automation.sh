#!/bin/bash

# Product Reconciliation Automation Setup
# This script sets up automatic reconciliation checks

PROJECT_DIR="/Users/richard/Desktop/Fabric Scraper"
LOG_DIR="$PROJECT_DIR/logs"
REPORT_DIR="$PROJECT_DIR/output"

echo "
===============================================================================
              SETTING UP RECONCILIATION AUTOMATION
===============================================================================
"

# Create logs directory
if [ ! -d "$LOG_DIR" ]; then
  mkdir -p "$LOG_DIR"
  echo "✓ Created logs directory: $LOG_DIR"
fi

# Create automated scripts directory
if [ ! -d "$PROJECT_DIR/automation" ]; then
  mkdir -p "$PROJECT_DIR/automation"
  echo "✓ Created automation directory: $PROJECT_DIR/automation"
fi

echo "
===============================================================================
              CRON JOB SETUP INSTRUCTIONS
===============================================================================

To run reconciliation AUTOMATICALLY on a schedule, follow these steps:

OPTION 1: WEEKLY VENDOR CHECK (Every Monday at 2 AM)
---------
1. Open crontab editor:
   crontab -e

2. Add this line at the end:
   0 2 * * 1 cd '$PROJECT_DIR' && /usr/local/bin/node run-full-reconciliation.js >> '$LOG_DIR/reconciliation.log' 2>&1

3. Save and exit (Ctrl+X, then Y, then Enter)

4. Verify cron was added:
   crontab -l


OPTION 2: WEEKLY VENDOR CHECK ONLY (Every Monday at 2 AM)
---------
1. Open crontab editor:
   crontab -e

2. Add this line at the end:
   0 2 * * 1 cd '$PROJECT_DIR' && /usr/local/bin/node check-product-availability.js >> '$LOG_DIR/vendor-check.log' 2>&1

3. Save and exit


OPTION 3: DAILY QUICK CHECK (Every day at 6 AM)
---------
1. Open crontab editor:
   crontab -e

2. Add this line at the end:
   0 6 * * * cd '$PROJECT_DIR' && /usr/local/bin/node check-product-availability.js >> '$LOG_DIR/daily-vendor-check.log' 2>&1

3. Save and exit


WHAT CRON DOES:
  • Runs the script automatically on the schedule you set
  • Saves all output to a log file
  • Generates reports in output/ folder
  • No manual intervention needed

WHERE TO FIND LOGS:
  All logs saved to: $LOG_DIR/
  You can check them with: tail -f $LOG_DIR/reconciliation.log

===============================================================================
              npm SCRIPTS SETUP
===============================================================================

Add these to your package.json 'scripts' section for easy running:

  \"reconcile\": \"node run-full-reconciliation.js\",
  \"reconcile:vendor\": \"node check-product-availability.js\",
  \"reconcile:wordpress\": \"node check-wordpress-products.js\",
  \"reconcile:shopify\": \"node check-shopify-products.js\",
  \"reconcile:report\": \"node generate-reconciliation-report.js\"

Then run with:
  npm run reconcile              # Full reconciliation
  npm run reconcile:vendor       # Check vendor only
  npm run reconcile:wordpress    # Check WordPress only
  npm run reconcile:shopify      # Check Shopify only
  npm run reconcile:report       # Generate report from existing data

===============================================================================
              EMAIL ALERTS (Optional)
===============================================================================

To get email notifications when discontinued products are found:

1. Install mail utility:
   brew install mailutils

2. Create alert script:
   cat > send-alert.sh << 'SCRIPT'
   #!/bin/bash
   if grep -q 'discontinued' output/vendor-availability-report.json; then
     echo 'Discontinued products found!' | mail -s 'Alert: Discontinued Products' your-email@example.com
   fi
   SCRIPT

3. Add to crontab after reconciliation runs:
   0 2 * * 1 cd '$PROJECT_DIR' && node run-full-reconciliation.js && bash send-alert.sh

===============================================================================
              GITHUB ACTIONS (CI/CD)
===============================================================================

If you push this repo to GitHub, use GitHub Actions for automation:

1. Create: .github/workflows/reconciliation.yml
2. This will run on a schedule without your computer
3. Reports automatically push back to repo
4. Works 24/7 even if your computer is off

See AUTOMATION-GUIDE.md for detailed GitHub Actions setup

===============================================================================

Next Steps:
1. Choose your automation method above
2. Follow the specific instructions for that method
3. Verify it works by checking logs in: $LOG_DIR/
4. Monitor reports in: $REPORT_DIR/

For detailed instructions, see: AUTOMATION-GUIDE.md

===============================================================================
