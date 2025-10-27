#!/usr/bin/env node

import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

// Go to a product page
await page.goto('https://www.unitedfabrics.com/product/arcade-32-kiln/', { waitUntil: 'domcontentloaded' });

console.log('\n📍 Analyzing page HTML for stock information...\n');

// Extract all text content that might be stock-related
const stockInfo = await page.evaluate(() => {
  const allText = document.body.innerText;
  const lines = allText.split('\n').filter(l => l.trim().length > 0);
  
  // Find lines that might contain stock info
  const stockLines = lines.filter(l => 
    l.toLowerCase().includes('stock') ||
    l.toLowerCase().includes('available') ||
    l.toLowerCase().includes('quantity') ||
    l.toLowerCase().includes('order')
  );

  return {
    stockLines: stockLines.slice(0, 20),
    allClasses: Array.from(document.querySelectorAll('[class*="stock"], [class*="inventory"], [class*="available"]')).map(el => ({
      class: el.className,
      text: el.textContent?.trim().slice(0, 50)
    }))
  };
});

console.log('Stock-related text lines:');
stockInfo.stockLines.forEach((line, i) => {
  console.log(`  ${i + 1}. ${line.slice(0, 100)}`);
});

console.log('\nElements with stock-related classes:');
stockInfo.allClasses.forEach((el, i) => {
  console.log(`  ${i + 1}. Class: ${el.class}`);
  console.log(`     Text: ${el.text}`);
});

await browser.close();
console.log('\n✅ Inspection complete. Check the browser that opened for more details.\n');
