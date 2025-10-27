#!/usr/bin/env node

import { chromium } from 'playwright';
import dotenv from 'dotenv';

dotenv.config();

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

console.log('\n🔐 Opening login page...');
console.log('Please login manually in the browser window.');
console.log('Then keep the browser open and I will scrape prices from the logged-in session.\n');

await page.goto('https://www.unitedfabrics.com/user/login/', { waitUntil: 'domcontentloaded' });

console.log('Browser opened. After you login, press ENTER in this terminal...');

// Wait for user input
await new Promise(resolve => process.stdin.once('data', resolve));

console.log('\nChecking if logged in...');

const isLoggedIn = await page.evaluate(() => {
  const text = document.body.innerText;
  return !text.includes('Login for Pricing') && !text.includes('Sign in');
});

if (isLoggedIn) {
  console.log('✅ Logged in detected!\n');
  console.log('Navigating to first product to check pricing...');
  
  await page.goto('https://www.unitedfabrics.com/product/arcade-32-kiln/', { waitUntil: 'domcontentloaded' });
  
  const pricing = await page.evaluate(() => {
    return {
      pageTitle: document.title,
      hasLoginMessage: document.body.innerText.includes('Login for Pricing'),
      allText: document.body.innerText.split('\n').filter(l => 
        l.includes('Wholesale') || l.includes('Price') || l.includes('$')
      ).slice(0, 20)
    };
  });
  
  console.log('\nPricing page info:');
  console.log('Title:', pricing.pageTitle);
  console.log('Still shows "Login for Pricing"?', pricing.hasLoginMessage);
  console.log('\nPrice-related lines on page:');
  pricing.allText.forEach((line, i) => {
    console.log(`  ${i+1}. ${line.trim()}`);
  });
} else {
  console.log('❌ Not logged in. Login form still showing.\n');
}

console.log('\nKeeping browser open. Close it manually when done.\n');

// Keep browser open
setTimeout(() => {
  browser.close();
}, 300000);
