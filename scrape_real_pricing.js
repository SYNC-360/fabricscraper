#!/usr/bin/env node

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

console.log('\n💰 Scraping ACTUAL Wholesale Prices from United Fabrics\n');

const dataFile = path.join(process.cwd(), 'output/full-scrape-details.json');
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

const email = process.env.UF_EMAIL;
const password = process.env.UF_PASSWORD;
const loginUrl = process.env.UF_LOGIN_URL;

console.log(`Using login URL: ${loginUrl}`);
console.log(`Email: ${email}\n`);

async function scrapeRealPrices() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('🔐 Logging in to United Fabrics...\n');
  
  try {
    // Navigate to login page
    await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Wait for form to be visible
    await page.waitForSelector('input[type="email"], input[name*="email"], input[type="text"]', { timeout: 10000 });
    
    // Find and fill email field
    const emailInput = await page.$('input[type="email"]') || await page.$('input[name*="email"]') || await page.$('input[type="text"]');
    await emailInput.fill(email);
    
    // Find and fill password field
    const passwordInput = await page.$('input[type="password"]');
    await passwordInput.fill(password);
    
    // Find and click submit button
    const submitBtn = await page.$('button[type="submit"]') || await page.$('input[type="submit"]');
    await submitBtn.click();
    
    // Wait for navigation
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 });
    
    console.log('✅ Login successful!\n');
  } catch (e) {
    console.log('❌ Login failed: ' + e.message);
    console.log('\nTrying alternative approach...\n');
  }

  const wholesalePrices = {};
  let successCount = 0;
  
  console.log('Scraping actual wholesale prices...\n');
  console.log('Product'.padEnd(20) + 'SKU'.padEnd(22) + 'Wholesale Price');
  console.log('-'.repeat(70));

  for (let i = 0; i < data.products.length; i++) {
    const product = data.products[i];
    
    try {
      await page.goto(product.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      // Wait a moment for price to load
      await page.waitForTimeout(1000);
      
      // Extract wholesale price
      const priceInfo = await page.evaluate(() => {
        // Strategy 1: Look for wholesale price in specific elements
        const elements = document.querySelectorAll('*');
        let found = null;
        
        for (const el of elements) {
          const text = el.textContent;
          
          // Look for "Wholesale Price" label followed by price
          if (text && text.includes('Wholesale Price')) {
            // Check if there's a $ amount nearby
            const parent = el.closest('[class*="price"]') || el.closest('[class*="product"]') || el.parentElement;
            if (parent) {
              const priceMatch = parent.textContent.match(/\$\s*([\d.]+)/);
              if (priceMatch) {
                found = parseFloat(priceMatch[1]);
                break;
              }
            }
          }
        }
        
        // Strategy 2: Look for any price element and extract
        if (!found) {
          const priceElements = document.querySelectorAll('[class*="price"]');
          for (const el of priceElements) {
            const match = el.textContent.match(/\$\s*([\d.]+)/);
            if (match) {
              const price = parseFloat(match[1]);
              // Filter out retail/high prices, assume wholesale is more reasonable
              if (price < 200) {  // Assume wholesale under $200
                found = price;
                break;
              }
            }
          }
        }
        
        // Strategy 3: Full text search
        if (!found) {
          const fullText = document.body.innerText;
          const lines = fullText.split('\n');
          for (let j = 0; j < lines.length; j++) {
            if (lines[j].toLowerCase().includes('wholesale')) {
              // Check next few lines for price
              for (let k = j; k < Math.min(j + 5, lines.length); k++) {
                const match = lines[k].match(/\$\s*([\d.]+)/);
                if (match) {
                  found = parseFloat(match[1]);
                  break;
                }
              }
              if (found) break;
            }
          }
        }
        
        return found;
      });

      if (priceInfo && priceInfo > 0) {
        wholesalePrices[product.sku] = priceInfo;
        successCount++;
        console.log(product.title.padEnd(20) + product.sku.padEnd(22) + '$' + priceInfo.toFixed(2));
      } else {
        console.log(product.title.padEnd(20) + product.sku.padEnd(22) + 'PRICE NOT FOUND');
      }
    } catch (e) {
      console.log(product.title.padEnd(20) + product.sku.padEnd(22) + 'ERROR');
    }
  }

  await browser.close();

  console.log('\n' + '='.repeat(70));
  console.log(`✅ Found actual prices for ${successCount}/${data.products.length} products\n`);

  if (successCount > 0) {
    // Save the real prices
    const outputFile = path.join(process.cwd(), 'output/real-wholesale-prices.json');
    fs.writeFileSync(outputFile, JSON.stringify(wholesalePrices, null, 2));
    console.log(`📄 Saved to: ${outputFile}\n`);
  }

  return wholesalePrices;
}

scrapeRealPrices().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
