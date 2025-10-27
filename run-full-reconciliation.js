#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log(`
================================================================================
                    FULL PRODUCT RECONCILIATION
================================================================================

This script will:
1. Check vendor (United Fabrics) product availability
2. Check WordPress site for product presence
3. Check Shopify site for product presence
4. Generate comprehensive reconciliation report

IMPORTANT: This may take 30-60 minutes depending on internet connection.

================================================================================
`);

async function runFullReconciliation() {
  try {
    console.log('\n📋 Step 1/4: Checking vendor availability...\n');
    await execAsync('node check-product-availability.js');

    console.log('\n📋 Step 2/4: Checking WordPress products...\n');
    await execAsync('node check-wordpress-products.js');

    console.log('\n📋 Step 3/4: Checking Shopify products...\n');
    await execAsync('node check-shopify-products.js');

    console.log('\n📋 Step 4/4: Generating reconciliation report...\n');
    await execAsync('node generate-reconciliation-report.js');

    console.log(`
================================================================================
                         RECONCILIATION COMPLETE
================================================================================

All reports have been generated in the output/ directory:
  
  ✅ vendor-availability-report.json
  ✅ wordpress-sync-report.json
  ✅ shopify-sync-report.json
  ✅ product-reconciliation-report.json
  ✅ RECONCILIATION-REPORT.txt

Review RECONCILIATION-REPORT.txt for recommended actions.

================================================================================
`);
  } catch (error) {
    console.error('❌ Error during reconciliation:', error.message);
    process.exit(1);
  }
}

runFullReconciliation();
