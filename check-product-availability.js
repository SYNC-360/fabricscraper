#!/usr/bin/env node

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

console.log('\n🔍 PRODUCT AVAILABILITY CHECKER\n');

// Load our current catalog
const dataFile = path.join(process.cwd(), 'output/full-scrape-details.json');
const catalogData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

async function checkProductAvailability() {
  const browser = await chromium.launch({ headless: true });
  const results = {
    timestamp: new Date().toISOString(),
    totalProducts: catalogData.products.length,
    available: [],
    discontinued: [],
    errors: [],
    summary: {}
  };

  console.log(`Checking ${catalogData.products.length} products on United Fabrics...\n`);

  for (let i = 0; i < catalogData.products.length; i++) {
    const product = catalogData.products[i];
    const page = await browser.newPage();
    const progressBar = `[${i + 1}/${catalogData.products.length}]`;

    try {
      console.log(`${progressBar} Checking: ${product.title}...`);
      
      await page.goto(product.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      // Check if product page loaded successfully
      const pageTitle = await page.title();
      const bodyText = await page.textContent('body');
      
      // Check for common discontinuation indicators
      const isDiscontinued = 
        bodyText.includes('discontinued') ||
        bodyText.includes('no longer available') ||
        bodyText.includes('out of stock') ||
        bodyText.includes('404') ||
        pageTitle.includes('404');

      if (isDiscontinued && bodyText.includes('discontinued')) {
        results.discontinued.push({
          sku: product.sku,
          title: product.title,
          url: product.url,
          reason: 'Marked as discontinued on vendor site'
        });
        console.log(`   ⚠️  DISCONTINUED`);
      } else {
        results.available.push({
          sku: product.sku,
          title: product.title,
          url: product.url,
          status: 'active'
        });
        console.log(`   ✅ Active`);
      }
    } catch (e) {
      results.errors.push({
        sku: product.sku,
        title: product.title,
        url: product.url,
        error: e.message
      });
      console.log(`   ❌ ERROR: ${e.message}`);
    }

    await page.close();
  }

  await browser.close();

  // Summarize results
  results.summary = {
    active: results.available.length,
    discontinued: results.discontinued.length,
    errors: results.errors.length,
    activePct: ((results.available.length / results.totalProducts) * 100).toFixed(1) + '%'
  };

  // Save results
  const reportFile = path.join(process.cwd(), 'output/vendor-availability-report.json');
  fs.writeFileSync(reportFile, JSON.stringify(results, null, 2));

  console.log('\n' + '='.repeat(70));
  console.log('VENDOR AVAILABILITY SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total Products: ${results.totalProducts}`);
  console.log(`Active: ${results.summary.active} (${results.summary.activePct})`);
  console.log(`Discontinued: ${results.summary.discontinued}`);
  console.log(`Errors: ${results.summary.errors}`);
  console.log(`\nReport saved to: ${reportFile}\n`);

  return results;
}

checkProductAvailability().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
