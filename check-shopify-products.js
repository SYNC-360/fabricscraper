#!/usr/bin/env node

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

console.log('\n🔍 SHOPIFY PRODUCT CHECKER\n');

// Load our current catalog SKUs
const dataFile = path.join(process.cwd(), 'output/full-scrape-details.json');
const catalogData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

const shopifySite = 'https://upholsteryfabricbytheyard.com';

async function checkShopifyProducts() {
  const browser = await chromium.launch({ headless: true });
  const results = {
    timestamp: new Date().toISOString(),
    site: shopifySite,
    totalInCatalog: catalogData.products.length,
    foundOnShopify: [],
    missingFromShopify: [],
    errors: [],
    summary: {}
  };

  console.log(`Checking if ${catalogData.products.length} products exist on Shopify...\n`);
  console.log(`Site: ${shopifySite}\n`);

  for (let i = 0; i < catalogData.products.length; i++) {
    const product = catalogData.products[i];
    const page = await browser.newPage();
    const progressBar = `[${i + 1}/${catalogData.products.length}]`;

    try {
      console.log(`${progressBar} Checking: ${product.title} (${product.sku})...`);
      
      // Try to search for product by name on Shopify
      const searchUrl = `${shopifySite}/search?q=${encodeURIComponent(product.title)}`;
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      
      const searchResults = await page.evaluate(() => {
        const products = document.querySelectorAll('[data-product], .product-item, a[href*="/products/"]');
        return products.length > 0;
      });

      if (searchResults) {
        results.foundOnShopify.push({
          sku: product.sku,
          title: product.title,
          status: 'found on Shopify',
          searchUrl
        });
        console.log(`   ✅ Found on Shopify`);
      } else {
        results.missingFromShopify.push({
          sku: product.sku,
          title: product.title,
          status: 'missing from Shopify',
          searchUrl,
          action: 'Need to import or create product'
        });
        console.log(`   ⚠️  NOT FOUND on Shopify`);
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
    foundOnShopify: results.foundOnShopify.length,
    missingFromShopify: results.missingFromShopify.length,
    errors: results.errors.length,
    coverage: ((results.foundOnShopify.length / results.totalInCatalog) * 100).toFixed(1) + '%'
  };

  // Save results
  const reportFile = path.join(process.cwd(), 'output/shopify-sync-report.json');
  fs.writeFileSync(reportFile, JSON.stringify(results, null, 2));

  console.log('\n' + '='.repeat(70));
  console.log('SHOPIFY SYNC SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total in Catalog: ${results.totalInCatalog}`);
  console.log(`Found on Shopify: ${results.summary.foundOnShopify} (${results.summary.coverage})`);
  console.log(`Missing from Shopify: ${results.summary.missingFromShopify}`);
  console.log(`Errors: ${results.summary.errors}`);
  console.log(`\nReport saved to: ${reportFile}\n`);

  return results;
}

checkShopifyProducts().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
