import { chromium } from 'playwright';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  const data = JSON.parse(fs.readFileSync('./output/full-scrape-details.json', 'utf8'));
  const firstProduct = data.products[0];
  const productUrl = firstProduct.url;
  
  console.log(`Analyzing product page for colors and pricing: ${productUrl}\n`);
  await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  
  // Extract available colors/swatches
  const colors = await page.evaluate(() => {
    const colorOptions = [];
    
    // Look for color swatches or options
    const swatches = document.querySelectorAll('[class*="swatch"], [class*="color"], [class*="option"]');
    swatches.forEach(el => {
      const text = el.textContent?.trim();
      if (text && text.length > 0 && text.length < 50) {
        colorOptions.push(text);
      }
    });
    
    // Also look for select options
    const selects = document.querySelectorAll('select');
    selects.forEach(select => {
      if (select.name.toLowerCase().includes('color') || select.name.toLowerCase().includes('option')) {
        const options = select.querySelectorAll('option');
        options.forEach(opt => {
          if (opt.value && opt.value !== '') {
            colorOptions.push(opt.textContent.trim());
          }
        });
      }
    });
    
    return colorOptions;
  });
  
  console.log('Available Colors/Swatches:');
  colors.forEach((color, i) => {
    if (color !== firstProduct.title) { // Don't include product name
      console.log(`  ${i + 1}. ${color}`);
    }
  });
  
  // Look for pricing information
  const pricing = await page.evaluate(() => {
    const priceInfo = {};
    const pageText = document.body.innerText;
    const lines = pageText.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === 'Wholesale Price' && lines[i + 1]) {
        priceInfo.wholesale = lines[i + 1].trim();
      }
      if ((line === 'Sale Price' || line === 'Regular Price') && lines[i + 1]) {
        priceInfo.sale = lines[i + 1].trim();
      }
      if (line === 'Login for Pricing') {
        priceInfo.loginRequired = true;
      }
    }
    
    return priceInfo;
  });
  
  console.log('\nPricing Information:');
  console.log(`  Wholesale: ${pricing.wholesale || 'Login Required'}`);
  console.log(`  Sale/Regular: ${pricing.sale || 'Login Required'}`);
  console.log(`  Note: ${pricing.loginRequired ? '⚠️ Pricing requires login' : 'Available'}`);
  
} catch (error) {
  console.error('Error:', error.message);
} finally {
  await browser.close();
}
