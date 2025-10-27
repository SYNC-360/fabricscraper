#!/usr/bin/env node

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

console.log('\n💰 Scraping Actual Wholesale Prices (With Login)\n');

const dataFile = path.join(process.cwd(), 'output/full-scrape-details.json');
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

const email = 'info@bestupholsteryfabric.com';
const password = 'Rc02!61977';

async function scrapeWholesalePrices() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('🔐 Logging in...\n');
  
  try {
    // Navigate to login
    await page.goto('https://www.unitedfabrics.com/account/login', { waitUntil: 'networkidle' });
    
    // Fill login form
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    
    // Wait for navigation after login
    await page.waitForNavigation({ waitUntil: 'networkidle' });
    console.log('✅ Login successful!\n');
  } catch (e) {
    console.log('⚠️  Login failed: ' + e.message + '\n');
    await browser.close();
    process.exit(1);
  }

  const wholesalePrices = {};
  
  console.log('Scraping actual wholesale prices...\n');
  console.log('Product'.padEnd(20) + 'SKU'.padEnd(22) + 'Wholesale Price');
  console.log('-'.repeat(70));

  for (let i = 0; i < data.products.length; i++) {
    const product = data.products[i];
    
    try {
      await page.goto(product.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      // Extract wholesale price
      const price = await page.evaluate(() => {
        // Look for the wholesale price element
        const priceEl = document.querySelector('[class*="wholesale"]');
        if (priceEl) {
          const text = priceEl.textContent.trim();
          // Extract number from text like "$25.00" or "25"
          const match = text.match(/\$?([\d.]+)/);
          if (match) return parseFloat(match[1]);
        }

        // Alternative: Look in the inventory section
        const inventoryEl = document.querySelector('[class*="inventory"]');
        if (inventoryEl) {
          const text = inventoryEl.textContent;
          const match = text.match(/\$?([\d.]+)/);
          if (match) return parseFloat(match[1]);
        }

        // Try to find any dollar amount on the page
        const allText = document.body.innerText;
        const lines = allText.split('\n');
        for (const line of lines) {
          if (line.includes('Wholesale') && line.includes('$')) {
            const match = line.match(/\$?([\d.]+)/);
            if (match) return parseFloat(match[1]);
          }
        }

        return null;
      });

      if (price !== null && price > 0) {
        wholesalePrices[product.sku] = price;
        console.log(product.title.padEnd(20) + product.sku.padEnd(22) + '$' + price.toFixed(2));
      } else {
        console.log(product.title.padEnd(20) + product.sku.padEnd(22) + 'NOT FOUND');
      }
    } catch (e) {
      console.log(product.title.padEnd(20) + product.sku.padEnd(22) + 'ERROR: ' + e.message.slice(0, 20));
    }
  }

  await browser.close();

  console.log('\n' + '='.repeat(70));
  console.log(`✅ Found actual prices for ${Object.keys(wholesalePrices).length}/${data.products.length} products\n`);

  // Save the actual prices
  const outputFile = path.join(process.cwd(), 'output/actual-wholesale-prices.json');
  fs.writeFileSync(outputFile, JSON.stringify(wholesalePrices, null, 2));
  console.log(`📄 Saved to: ${outputFile}\n`);

  return wholesalePrices;
}

scrapeWholesalePrices().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
