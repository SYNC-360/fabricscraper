#!/usr/bin/env node

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

console.log('\n💰 Scraping REAL Wholesale Prices with Proper Login\n');

const dataFile = path.join(process.cwd(), 'output/full-scrape-details.json');
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

const email = 'info@bestupholsteryfabric.com';
const password = 'Rc02!61977';

async function getPrices() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('🔐 Attempting login...\n');
  
  try {
    // Go to login page
    await page.goto('https://www.unitedfabrics.com/user/login/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Try different selectors for email field
    let emailInput = await page.$('input[type="email"]');
    if (!emailInput) {
      emailInput = await page.$('input[name="email"]');
    }
    if (!emailInput) {
      emailInput = await page.$('input[id*="email"]');
    }
    if (!emailInput) {
      emailInput = await page.$('input[placeholder*="email" i]');
    }
    
    if (!emailInput) {
      throw new Error('Could not find email input field');
    }

    // Try different selectors for password field
    let passwordInput = await page.$('input[type="password"]');
    if (!passwordInput) {
      passwordInput = await page.$('input[name="password"]');
    }
    if (!passwordInput) {
      passwordInput = await page.$('input[id*="password"]');
    }

    if (!passwordInput) {
      throw new Error('Could not find password input field');
    }

    console.log('✅ Found form fields');
    console.log('Filling email...');
    await emailInput.fill(email);
    
    console.log('Filling password...');
    await passwordInput.fill(password);
    
    // Find submit button
    let submitBtn = await page.$('button[type="submit"]');
    if (!submitBtn) {
      submitBtn = await page.$('input[type="submit"]');
    }
    if (!submitBtn) {
      submitBtn = await page.$('button:has-text("Sign In")');
    }
    if (!submitBtn) {
      submitBtn = await page.$('button:has-text("Login")');
    }

    if (!submitBtn) {
      throw new Error('Could not find submit button');
    }

    console.log('Clicking submit button...');
    await submitBtn.click();
    
    // Wait for navigation with longer timeout
    console.log('Waiting for login to complete...');
    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {
      console.log('Navigation timeout - checking page state anyway');
    });

    await page.waitForTimeout(2000);
    
    console.log('✅ Login attempt complete\n');
  } catch (e) {
    console.log('⚠️  Login error: ' + e.message);
    console.log('Continuing anyway to check if authenticated...\n');
  }

  const wholesalePrices = {};
  let successCount = 0;
  
  console.log('Checking product pages for actual pricing...\n');
  console.log('Product'.padEnd(20) + 'SKU'.padEnd(22) + 'Found Price');
  console.log('-'.repeat(70));

  for (let i = 0; i < data.products.length; i++) {
    const product = data.products[i];
    
    try {
      await page.goto(product.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(500);
      
      // Get all text on page
      const pageText = await page.evaluate(() => {
        return document.body.innerText;
      });

      // Look for wholesale price in different patterns
      let price = null;
      
      // Pattern 1: "Wholesale Price: $XX" or "Wholesale Price $XX"
      let match = pageText.match(/Wholesale\s+Price[:\s]*\$\s*([\d.]+)/i);
      if (match) {
        price = parseFloat(match[1]);
      }
      
      // Pattern 2: Just a dollar amount near "Wholesale"
      if (!price) {
        match = pageText.match(/Wholesale[^\n]*\n[^\n]*\$\s*([\d.]+)/i);
        if (match) {
          price = parseFloat(match[1]);
        }
      }

      // Pattern 3: Look for "Price:" and assume it's wholesale when authenticated
      if (!price && !pageText.includes('Login for Pricing')) {
        match = pageText.match(/Price[:\s]*\$\s*([\d.]+)/i);
        if (match) {
          const potentialPrice = parseFloat(match[1]);
          // If under $200, likely wholesale
          if (potentialPrice < 200) {
            price = potentialPrice;
          }
        }
      }

      if (price) {
        wholesalePrices[product.sku] = price;
        successCount++;
        console.log(product.title.padEnd(20) + product.sku.padEnd(22) + '$' + price.toFixed(2) + ' ✓');
      } else {
        // Check if still showing login message
        const needsLogin = pageText.includes('Login for Pricing');
        console.log(product.title.padEnd(20) + product.sku.padEnd(22) + (needsLogin ? 'LOGIN REQUIRED' : 'NOT FOUND'));
      }
    } catch (e) {
      console.log(product.title.padEnd(20) + product.sku.padEnd(22) + 'ERROR: ' + e.message.slice(0, 20));
    }
  }

  await browser.close();

  console.log('\n' + '='.repeat(70));
  console.log(`Results: Found ${successCount}/${data.products.length} prices\n`);

  if (successCount > 0) {
    const outputFile = path.join(process.cwd(), 'output/real-wholesale-prices.json');
    fs.writeFileSync(outputFile, JSON.stringify(wholesalePrices, null, 2));
    console.log(`✅ Saved real prices to: ${outputFile}`);
    console.log('\nPrices found:');
    Object.entries(wholesalePrices).forEach(([sku, price]) => {
      const product = data.products.find(p => p.sku === sku);
      console.log(`  ${product?.title.padEnd(20)} - $${price.toFixed(2)}`);
    });
  } else {
    console.log('❌ No prices found - you may need to check your account permissions');
    console.log('   or manually provide the wholesale prices');
  }

  return wholesalePrices;
}

getPrices().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
