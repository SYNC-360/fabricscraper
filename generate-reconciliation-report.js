#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

console.log('\n📊 GENERATING RECONCILIATION REPORT\n');

const outputDir = path.join(process.cwd(), 'output');

// Load all reports
let vendorReport = {};
let wpReport = {};
let shopifyReport = {};

try {
  if (fs.existsSync(path.join(outputDir, 'vendor-availability-report.json'))) {
    vendorReport = JSON.parse(fs.readFileSync(path.join(outputDir, 'vendor-availability-report.json'), 'utf8'));
  }
  if (fs.existsSync(path.join(outputDir, 'wordpress-sync-report.json'))) {
    wpReport = JSON.parse(fs.readFileSync(path.join(outputDir, 'wordpress-sync-report.json'), 'utf8'));
  }
  if (fs.existsSync(path.join(outputDir, 'shopify-sync-report.json'))) {
    shopifyReport = JSON.parse(fs.readFileSync(path.join(outputDir, 'shopify-sync-report.json'), 'utf8'));
  }
} catch (e) {
  console.log('⚠️  Some reports not yet available. Run the individual checkers first.\n');
}

// Load catalog
const catalogFile = path.join(process.cwd(), 'output/full-scrape-details.json');
const catalog = JSON.parse(fs.readFileSync(catalogFile, 'utf8'));

// Build comprehensive report
const reconciliation = {
  timestamp: new Date().toISOString(),
  summary: {
    totalProducts: catalog.products.length,
    vendorStatus: vendorReport.summary || { active: '?', discontinued: '?' },
    wordpressStatus: wpReport.summary || { foundOnWP: '?', missingFromWP: '?' },
    shopifyStatus: shopifyReport.summary || { foundOnShopify: '?', missingFromShopify: '?' }
  },
  actions: {
    productsToRemove: [],
    productsToAdd: [],
    productsToUpdate: [],
    summary: {}
  }
};

// Analyze discontinued products
if (vendorReport.discontinued && vendorReport.discontinued.length > 0) {
  vendorReport.discontinued.forEach(product => {
    reconciliation.actions.productsToRemove.push({
      sku: product.sku,
      title: product.title,
      reason: 'Discontinued by vendor',
      action: 'Archive or remove from WordPress and Shopify'
    });
  });
}

// Analyze missing from WordPress
if (wpReport.missingFromWP && wpReport.missingFromWP.length > 0) {
  wpReport.missingFromWP.forEach(product => {
    reconciliation.actions.productsToAdd.push({
      sku: product.sku,
      title: product.title,
      platforms: ['WordPress'],
      action: 'Import using WordPress All Import plugin'
    });
  });
}

// Analyze missing from Shopify
if (shopifyReport.missingFromShopify && shopifyReport.missingFromShopify.length > 0) {
  shopifyReport.missingFromShopify.forEach(product => {
    // Check if already marked for WordPress
    const existing = reconciliation.actions.productsToAdd.find(p => p.sku === product.sku);
    if (existing) {
      existing.platforms.push('Shopify');
    } else {
      reconciliation.actions.productsToAdd.push({
        sku: product.sku,
        title: product.title,
        platforms: ['Shopify'],
        action: 'Import using Shopify product import'
      });
    }
  });
}

// Generate action summary
reconciliation.actions.summary = {
  toRemove: reconciliation.actions.productsToRemove.length,
  toAdd: reconciliation.actions.productsToAdd.length,
  toUpdate: reconciliation.actions.productsToUpdate.length,
  totalActions: reconciliation.actions.productsToRemove.length + 
                reconciliation.actions.productsToAdd.length + 
                reconciliation.actions.productsToUpdate.length
};

// Save comprehensive report
const reportFile = path.join(outputDir, 'product-reconciliation-report.json');
fs.writeFileSync(reportFile, JSON.stringify(reconciliation, null, 2));

// Create human-readable report
let readableReport = `
================================================================================
                   PRODUCT CATALOG RECONCILIATION REPORT
================================================================================

Generated: ${new Date().toLocaleString()}

================================================================================
OVERVIEW
================================================================================

Total Products in Catalog: ${reconciliation.summary.totalProducts}

Vendor Status (United Fabrics):
  Active: ${reconciliation.summary.vendorStatus.active}
  Discontinued: ${reconciliation.summary.vendorStatus.discontinued}

WordPress Status (bestupholsteryfabric.com):
  Found: ${reconciliation.summary.wordpressStatus.foundOnWP}
  Missing: ${reconciliation.summary.wordpressStatus.missingFromWP}

Shopify Status (upholsteryfabricbytheyard.com):
  Found: ${reconciliation.summary.shopifyStatus.foundOnShopify}
  Missing: ${reconciliation.summary.shopifyStatus.missingFromShopify}

================================================================================
RECOMMENDED ACTIONS
================================================================================

Total Actions Required: ${reconciliation.actions.summary.totalActions}
`;

if (reconciliation.actions.productsToRemove.length > 0) {
  readableReport += `
PRODUCTS TO REMOVE (${reconciliation.actions.productsToRemove.length}):
${reconciliation.actions.productsToRemove.map(p => 
  `  • ${p.title} (${p.sku})\n    → ${p.action}`
).join('\n')}
`;
}

if (reconciliation.actions.productsToAdd.length > 0) {
  readableReport += `
PRODUCTS TO ADD (${reconciliation.actions.productsToAdd.length}):
${reconciliation.actions.productsToAdd.map(p => 
  `  • ${p.title} (${p.sku})\n    Platforms: ${p.platforms.join(', ')}\n    → ${p.action}`
).join('\n')}
`;
}

readableReport += `
================================================================================
DETAILED REPORTS
================================================================================

JSON Report: ${reportFile}

For detailed analysis, see:
  - output/vendor-availability-report.json
  - output/wordpress-sync-report.json
  - output/shopify-sync-report.json

================================================================================
`;

const readableFile = path.join(outputDir, 'RECONCILIATION-REPORT.txt');
fs.writeFileSync(readableFile, readableReport);

console.log(readableReport);
console.log(`✅ Reports saved:\n   - ${reportFile}\n   - ${readableFile}\n`);
