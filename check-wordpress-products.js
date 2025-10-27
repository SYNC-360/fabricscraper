#!/usr/bin/env node

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

console.log('\n🔍 WORDPRESS PRODUCT CHECKER\n');

// Load our current catalog SKUs
const dataFile = path.join(process.cwd(), 'output/full-scrape-details.json');
const catalogData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

const wpSite = 'https://bestupholsteryfabric.com';
const skuMap = new Map(catalogData.products.map(p => [p.sku, p]));

async function checkWordPressProducts() {
  const browser = await chromium.launch({ headless: true });
  const results = {
    timestamp: new Date().toISOString(),
    site: wpSite,
    totalInCatalog: catalogData.products.length,
    foundOnWP: [],
    missingFromWP: [],
    errors: [],
    summary: {}
  };

  console.log(`Checking if ${catalogData.products.length} products exist on WordPress...\n`);
  console.log(`Site: ${wpSite}\n`);

  for (let i = 0; i < catalogData.products.length; i++) {
    const product = catalogData.products[i];
    const page = await browser.newPage();
    const progressBar = `[${i + 1}/${catalogData.products.length}]`;

    try {
      console.log(`${progressBar} Checking: ${product.title} (${product.sku})...`);
      
      // Try to search for product by SKU on WordPress site
      const searchUrl = `${wpSite}/?s=${encodeURIComponent(product.sku)}`;
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      
      const searchResults = await page.evaluate(() => {
        const products = document.querySelectorAll('.product, [data-product-id]');
        return products.length > 0;
      });

      if (searchResults) {
        results.foundOnWP.push({
          sku: product.sku,
          title: product.title,
          status: 'found on WordPress',
          searchUrl
        });
        console.log(`   ✅ Found on WordPress`);
      } else {
        results.missingFromWP.push({
          sku: product.sku,
          title: product.title,
          status: 'missing from WordPress',
          searchUrl,
          action: 'Need to import or create product'
        });
        console.log(`   ⚠️  NOT FOUND on WordPress`);
      }
    } catch (e) {
      results.errors.push({
        sku: product.sku,
        title: product.title,
        error: e.message
      });
      console.log(`   ❌ ERROR: ${e.message}`);
    }

    await page.close();
  }

  await browser.close();

  // Summarize
  results.summary = {
    foundOnWP: results.foundOnWP.length,
    missingFromWP: results.missingFromWP.length,
    errors: results.errors.length,
    coverage: ((results.foundOnWP.length / results.totalInCatalog) * 100).toFixed(1) + '%'
  };

  // Save results
  const reportFile = path.join(process.cwd(), 'output/wordpress-sync-report.json');
  fs.writeFileSync(reportFile, JSON.stringify(results, null, 2));

  console.log('\n' + '='.repeat(70));
  console.log('WORDPRESS SYNC SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total in Catalog: ${results.totalInCatalog}`);
  console.log(`Found on WordPress: ${results.summary.foundOnWP} (${results.summary.coverage})`);
  console.log(`Missing from WordPress: ${results.summary.missingFromWP}`);
  console.log(`Errors: ${results.summary.errors}`);
  console.log(`\nReport saved to: ${reportFile}\n`);

  return results;
}

checkWordPressProducts().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
