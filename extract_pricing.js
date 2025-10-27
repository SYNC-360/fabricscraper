#!/usr/bin/env node

import dotenv from 'dotenv';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

dotenv.config();

const config = {
  email: process.env.UF_EMAIL,
  password: process.env.UF_PASSWORD,
  loginUrl: process.env.UF_LOGIN_URL || 'https://www.unitedfabrics.com/user/login/',
};

console.log('💰 Extracting Pricing Data from UnitedFabrics\n');

// Price calculation helper
function calculatePrices(wholesalePrice) {
  if (!wholesalePrice) return { salePrice: null, retailPrice: null };
  return {
    salePrice: Number((wholesalePrice * 2.5).toFixed(2)),
    retailPrice: Number((wholesalePrice * 3.25).toFixed(2)),
  };
}

let browser;

(async () => {
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Step 1: Login
    console.log('🔐 Step 1: Logging in to UnitedFabrics...');
    await page.goto(config.loginUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const emailInput = await page.$('input[type="email"]');
    if (emailInput) {
      await emailInput.fill(config.email);
      const passwordInput = await page.$('input[type="password"]');
      await passwordInput.fill(config.password);
      const submitBtn = await page.$('button[type="submit"]');
      await submitBtn.click();
      await page.waitForTimeout(3000);
      console.log('✅ Login successful\n');
    } else {
      throw new Error('Could not find email input field');
    }

    // Step 2: Read the current product data
    console.log('📂 Step 2: Reading product URLs from scraped data...');
    const dataFile = path.join(process.cwd(), 'output/full-scrape-details.json');
    const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    const products = data.products;
    console.log(`✅ Found ${products.length} products to extract pricing for\n`);

    // Step 3: Extract pricing for each product
    console.log('💰 Step 3: Extracting pricing data...\n');
    
    const productsWithPricing = [];
    
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const url = product.url;
      
      try {
        console.log(`  ${i + 1}/${products.length}: ${product.title}`);
        
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(800);

        // Extract pricing information
        const pricing = await page.evaluate(() => {
          const priceInfo = {
            wholesale: null,
            sale: null,
            retail: null,
          };

          const pageText = document.body.innerText;
          const lines = pageText.split('\n');

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Look for "Wholesale Price" label
            if (line === 'Wholesale Price' && lines[i + 1]) {
              const priceText = lines[i + 1].trim();
              const match = priceText.match(/\$?([\d.]+)/);
              if (match) {
                priceInfo.wholesale = parseFloat(match[1]);
              }
            }
          }

          return priceInfo;
        });

        // Calculate sale and retail prices
        const calculated = calculatePrices(pricing.wholesale);

        const enrichedProduct = {
          ...product,
          wholesalePrice: pricing.wholesale,
          salePrice: calculated.salePrice,
          retailPrice: calculated.retailPrice,
        };

        productsWithPricing.push(enrichedProduct);

        if (pricing.wholesale) {
          console.log(`      ✅ Wholesale: $${pricing.wholesale} → Sale: $${calculated.salePrice} | Retail: $${calculated.retailPrice}`);
        } else {
          console.log(`      ⚠️  No wholesale price found`);
        }
      } catch (error) {
        console.log(`      ❌ Error: ${error.message}`);
        // Keep product without pricing
        productsWithPricing.push(product);
      }
    }

    // Step 4: Save updated data
    console.log('\n💾 Step 4: Saving updated product data with pricing...\n');
    
    const updatedData = {
      ...data,
      products: productsWithPricing,
      pricingExtractedAt: new Date().toISOString(),
    };

    // Save updated JSON
    const outputFile = path.join(process.cwd(), 'output/full-scrape-details.json');
    fs.writeFileSync(outputFile, JSON.stringify(updatedData, null, 2));
    console.log(`✅ Updated details saved to: ${outputFile}`);

    // Save JSONL
    const jsonlFile = path.join(process.cwd(), 'output/raw-products-full.jsonl');
    const jsonlLines = productsWithPricing.map(p => JSON.stringify(p)).join('\n');
    fs.writeFileSync(jsonlFile, jsonlLines + '\n');
    console.log(`✅ JSONL saved to: ${jsonlFile}`);

    // Step 5: Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 PRICING EXTRACTION SUMMARY');
    console.log('='.repeat(70));
    
    const productsWithWholesale = productsWithPricing.filter(p => p.wholesalePrice);
    const totalWholesaleValue = productsWithWholesale.reduce((sum, p) => sum + (p.wholesalePrice || 0), 0);
    const totalRetailValue = productsWithWholesale.reduce((sum, p) => sum + (p.retailPrice || 0), 0);

    console.log(`✅ Products with Pricing: ${productsWithWholesale.length}/${products.length}`);
    console.log(`💰 Total Wholesale Value: $${totalWholesaleValue.toFixed(2)}`);
    console.log(`💰 Total Retail Value: $${totalRetailValue.toFixed(2)}`);
    console.log(`📈 Average Markup: 3.25x (225% increase)`);
    console.log('='.repeat(70));

    console.log('\n✅ Pricing extraction completed!\n');

    await page.close();
    await browser.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    if (browser) {
      await browser.close();
    }
    process.exit(1);
  }
})();
