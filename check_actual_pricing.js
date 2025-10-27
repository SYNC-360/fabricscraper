#!/usr/bin/env node

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

console.log('\n💰 Checking Actual Pricing on United Fabrics Website\n');

const dataFile = path.join(process.cwd(), 'output/full-scrape-details.json');
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

async function checkPricing() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('Checking sample products for actual pricing...\n');
  console.log('Product'.padEnd(20) + 'SKU'.padEnd(22) + 'Website Price');
  console.log('-'.repeat(70));

  for (let i = 0; i < Math.min(5, data.products.length); i++) {
    const product = data.products[i];
    
    try {
      await page.goto(product.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      // Look for pricing information
      const pricing = await page.evaluate(() => {
        // Check for various price displays
        const priceElements = document.querySelectorAll('[class*="price"]');
        const prices = [];
        
        priceElements.forEach(el => {
          const text = el.textContent.trim();
          if (text && (text.includes('$') || text.match(/^\d+\.?\d*$/))) {
            prices.push(text);
          }
        });

        // Also check for specific class patterns
        const wholesaleEl = document.querySelector('[class*="wholesale"]');
        const retailEl = document.querySelector('[class*="retail"]');
        
        return {
          allPrices: prices.slice(0, 5),
          wholesale: wholesaleEl?.textContent.trim(),
          retail: retailEl?.textContent.trim(),
          bodyText: document.body.innerText.split('\n').filter(l => l.includes('$') || l.includes('Price')).slice(0, 10)
        };
      });

      console.log(product.title.padEnd(20) + product.sku.padEnd(22) + JSON.stringify(pricing.allPrices.slice(0, 2)));
      
    } catch (e) {
      console.log(product.title.padEnd(20) + product.sku.padEnd(22) + 'Error: ' + e.message.slice(0, 30));
    }
  }

  await browser.close();
  console.log('\n✅ Check complete\n');
}

checkPricing().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
