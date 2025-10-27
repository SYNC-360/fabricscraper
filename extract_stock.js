#!/usr/bin/env node

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

console.log('\n📦 Extracting Stock Quantities\n');

const dataFile = path.join(process.cwd(), 'output/full-scrape-details.json');
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

async function extractStock() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Set up login credentials
  const email = process.env.UNITED_EMAIL || 'info@bestupholsteryfabric.com';
  const password = process.env.UNITED_PASSWORD || 'Rc02!61977';

  console.log('🔐 Logging in...\n');
  
  try {
    // Navigate to login
    await page.goto('https://www.unitedfabrics.com/account/login', { waitUntil: 'networkidle' });
    
    // Fill login form
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForNavigation({ waitUntil: 'networkidle' });
    console.log('✅ Login successful\n');
  } catch (e) {
    console.log('⚠️  Login failed, attempting without auth\n');
  }

  let productsWithStock = 0;
  const stockData = {};

  for (let i = 0; i < data.products.length; i++) {
    const product = data.products[i];
    const progressBar = `[${i + 1}/${data.products.length}]`;
    
    try {
      console.log(`${progressBar} Checking: ${product.title}...`);
      
      await page.goto(product.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      // Extract stock information (sum of NJ and CA)
      let stock = await page.evaluate(() => {
        // Look for the availability value element (contains "88 Yards (NJ)" and "0 Yards (CA)" format)
        const availabilityElement = document.querySelector('.product_detail_info_inventory_value');

        if (availabilityElement) {
          const text = availabilityElement.textContent.trim();

          // Extract both NJ and CA quantities
          // Pattern: "88 Yards (NJ)" and "0 Yards (CA)"
          const njMatch = text.match(/(\d+)\s*Yards?\s*\(NJ\)/i);
          const caMatch = text.match(/(\d+)\s*Yards?\s*\(CA\)/i);

          let njQty = 0;
          let caQty = 0;

          if (njMatch) {
            njQty = parseInt(njMatch[1]);
          }

          if (caMatch) {
            caQty = parseInt(caMatch[1]);
          }

          // Return sum of both locations
          const total = njQty + caQty;
          if (total > 0) {
            return total;
          }
        }

        // Fallback: Look for availability information in any form
        const allElements = document.querySelectorAll('[class*="inventory"]');
        for (const el of allElements) {
          const text = el.textContent;
          // Look for "Availability" label followed by numbers
          if (text?.toLowerCase().includes('availability')) {
            let total = 0;
            const njMatch = text.match(/(\d+)\s*(?:Yards|yards)?\s*\(NJ\)/i);
            const caMatch = text.match(/(\d+)\s*(?:Yards|yards)?\s*\(CA\)/i);

            if (njMatch) total += parseInt(njMatch[1]);
            if (caMatch) total += parseInt(caMatch[1]);

            if (total > 0) return total;

            // Fallback to just extracting any number
            const match = text.match(/(\d+)\s*(?:Yards|yards|units|items)?/);
            if (match) {
              return parseInt(match[1]);
            }
          }
        }

        return null;
      });

      if (stock !== null && stock !== undefined) {
        stockData[product.sku] = stock;
        productsWithStock++;
        console.log(`   ✅ Stock: ${stock}`);
      } else {
        console.log(`   ⚠️  Stock not found`);
      }
    } catch (e) {
      console.log(`   ❌ Error: ${e.message}`);
    }
  }

  await browser.close();

  console.log(`\n✅ Stock extraction complete: ${productsWithStock}/${data.products.length} products\n`);

  // Save stock data
  const stockFile = path.join(process.cwd(), 'output/stock-data.json');
  fs.writeFileSync(stockFile, JSON.stringify(stockData, null, 2));
  console.log(`📄 Stock data saved to: ${stockFile}\n`);

  return stockData;
}

extractStock().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
