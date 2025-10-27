#!/usr/bin/env node

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

console.log('\n📦 Extracting Stock from Both Locations (NJ + CA)\n');

const dataFile = path.join(process.cwd(), 'output/full-scrape-details.json');
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

const email = 'info@bestupholsteryfabric.com';
const password = 'Rc02!61977';

async function extractStock() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('🔐 Logging in to United Fabrics...\n');
  
  try {
    // Go to login page
    await page.goto('https://www.unitedfabrics.com/user/login/', { waitUntil: 'domcontentloaded' });
    
    // Fill and submit the form
    await page.fill('#email_address', email);
    await page.fill('#password', password);
    await page.click('input[type="submit"][class*="button"]');
    
    // Wait for navigation
    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(2000);
    
    console.log('✅ Login successful!\n');
  } catch (e) {
    console.log('⚠️  Login error: ' + e.message);
    console.log('Continuing anyway...\n');
  }

  const stockData = {};
  let successCount = 0;
  
  console.log('Extracting stock (NJ + CA totals)...\n');
  console.log('Product'.padEnd(20) + 'NJ'.padEnd(10) + 'CA'.padEnd(10) + 'Total');
  console.log('-'.repeat(70));

  for (let i = 0; i < data.products.length; i++) {
    const product = data.products[i];
    
    try {
      await page.goto(product.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1000);
      
      // Extract NJ and CA stock
      const stock = await page.evaluate(() => {
        const availabilityElement = document.querySelector('.product_detail_info_inventory_value');
        
        if (availabilityElement) {
          const text = availabilityElement.textContent.trim();
          
          // Extract NJ quantity
          const njMatch = text.match(/(\d+)\s*Yards?\s*\(NJ\)/i);
          const njQty = njMatch ? parseInt(njMatch[1]) : 0;
          
          // Extract CA quantity
          const caMatch = text.match(/(\d+)\s*Yards?\s*\(CA\)/i);
          const caQty = caMatch ? parseInt(caMatch[1]) : 0;
          
          return {
            nj: njQty,
            ca: caQty,
            total: njQty + caQty
          };
        }
        
        return null;
      });

      if (stock && stock.total > 0) {
        stockData[product.sku] = stock.total;
        successCount++;
        console.log(product.title.padEnd(20) + String(stock.nj).padEnd(10) + String(stock.ca).padEnd(10) + stock.total);
      } else {
        console.log(product.title.padEnd(20) + 'Not found');
      }
    } catch (e) {
      console.log(product.title.padEnd(20) + 'ERROR');
    }
  }

  await browser.close();

  console.log('\n' + '='.repeat(70));
  console.log(`✅ Extracted stock for ${successCount}/${data.products.length} products\n`);

  // Save stock data
  const stockFile = path.join(process.cwd(), 'output/stock-data.json');
  fs.writeFileSync(stockFile, JSON.stringify(stockData, null, 2));
  console.log(`📄 Saved to: ${stockFile}\n`);

  // Calculate total
  const totalStock = Object.values(stockData).reduce((sum, qty) => sum + qty, 0);
  console.log(`📊 Total inventory across all products: ${totalStock} yards\n`);

  return stockData;
}

extractStock().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
