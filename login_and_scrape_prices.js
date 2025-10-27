#!/usr/bin/env node

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

console.log('\n💰 Login and Scrape Wholesale Prices\n');

const dataFile = path.join(process.cwd(), 'output/full-scrape-details.json');
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

const email = 'info@bestupholsteryfabric.com';
const password = 'Rc02!61977';

async function loginAndScrape() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('🔐 Logging in to United Fabrics...\n');
  
  try {
    // Go to login page
    await page.goto('https://www.unitedfabrics.com/user/login/', { waitUntil: 'domcontentloaded' });
    
    // Fill and submit the form exactly as shown
    await page.fill('#email_address', email);
    await page.fill('#password', password);
    
    // Click the submit button
    await page.click('input[type="submit"][class*="button"]');
    
    // Wait for page to load after login
    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {
      console.log('Navigation completed (or timeout)');
    });

    await page.waitForTimeout(2000);
    
    // Check if login was successful
    const pageContent = await page.content();
    const isLoggedIn = !pageContent.includes('email_address') && !pageContent.includes('js-login-form');
    
    console.log(isLoggedIn ? '✅ Login successful!\n' : '⚠️  Login status unclear - proceeding anyway\n');

  } catch (e) {
    console.log('⚠️  Login error: ' + e.message + '\n');
  }

  const wholesalePrices = {};
  let foundCount = 0;
  
  console.log('Scraping wholesale prices from authenticated session...\n');
  console.log('Product'.padEnd(20) + 'SKU'.padEnd(22) + 'Price');
  console.log('-'.repeat(70));

  for (let i = 0; i < data.products.length; i++) {
    const product = data.products[i];
    
    try {
      await page.goto(product.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1000);
      
      const priceInfo = await page.evaluate(() => {
        const bodyText = document.body.innerText;
        
        // If still showing login message, not authenticated
        if (bodyText.includes('Login for Pricing')) {
          return null;
        }
        
        // Look for wholesale price patterns
        let price = null;
        
        // Try to find price in specific format
        const lines = bodyText.split('\n');
        for (let j = 0; j < lines.length; j++) {
          const line = lines[j].trim();
          
          // Look for "Wholesale Price" label
          if (line.toLowerCase().includes('wholesale') && line.toLowerCase().includes('price')) {
            // Check next few lines for price
            for (let k = j + 1; k < Math.min(j + 5, lines.length); k++) {
              const nextLine = lines[k].trim();
              const match = nextLine.match(/\$\s*([\d.]+)/);
              if (match) {
                price = parseFloat(match[1]);
                break;
              }
            }
            if (price) break;
          }
        }
        
        // Alternative: look for any $ amount under 200
        if (!price) {
          const match = bodyText.match(/\$\s*([\d.]+)/);
          if (match) {
            const amount = parseFloat(match[1]);
            if (amount > 0 && amount < 200) {
              price = amount;
            }
          }
        }
        
        return price;
      });

      if (priceInfo) {
        wholesalePrices[product.sku] = priceInfo;
        foundCount++;
        console.log(product.title.padEnd(20) + product.sku.padEnd(22) + '$' + priceInfo.toFixed(2));
      } else {
        console.log(product.title.padEnd(20) + product.sku.padEnd(22) + 'N/A');
      }
    } catch (e) {
      console.log(product.title.padEnd(20) + product.sku.padEnd(22) + 'ERROR');
    }
  }

  await browser.close();

  console.log('\n' + '='.repeat(70));
  console.log(`Found prices: ${foundCount}/${data.products.length}\n`);

  if (foundCount > 0) {
    const outputFile = path.join(process.cwd(), 'output/scraped-wholesale-prices.json');
    fs.writeFileSync(outputFile, JSON.stringify(wholesalePrices, null, 2));
    console.log(`✅ Saved to: ${outputFile}\n`);
    
    return wholesalePrices;
  } else {
    console.log('❌ No prices scraped.');
    console.log('⚠️  Your account may not have pricing enabled.');
    console.log('    Please manually provide wholesale prices.\n');
    return null;
  }
}

const prices = await loginAndScrape();

if (!prices) {
  console.log('To manually add pricing:');
  console.log('1. Open output/PRICING_TEMPLATE.csv');
  console.log('2. Edit the third column with your wholesale prices');
  console.log('3. Run: node apply_pricing.js\n');
}

process.exit(prices ? 0 : 1);
