#!/usr/bin/env node

import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

console.log('\n🔍 Opening product page to analyze pricing layout...\n');

await page.goto('https://www.unitedfabrics.com/product/arcade-32-kiln/', { waitUntil: 'domcontentloaded' });

console.log('Page loaded. Check the browser window for:');
console.log('  1. Where the price is displayed');
console.log('  2. Whether it requires login');
console.log('  3. If there are different price tiers');
console.log('\nClosing browser in 30 seconds...');

setTimeout(async () => {
  await browser.close();
  process.exit(0);
}, 30000);
