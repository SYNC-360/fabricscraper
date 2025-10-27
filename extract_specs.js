import { chromium } from 'playwright';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  const data = JSON.parse(fs.readFileSync('./output/full-scrape-details.json', 'utf8'));
  const productUrl = data.products[0].url;
  
  console.log(`Analyzing: ${productUrl}\n`);
  await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  
  // Get all text content
  const fullText = await page.evaluate(() => document.body.innerText);
  
  // Look for spec sections
  console.log('=== Full Page Text (first 3000 chars) ===\n');
  console.log(fullText.substring(0, 3000));
  
  // Look for attribute/detail elements
  const details = await page.evaluate(() => {
    const elements = document.querySelectorAll('[class*="detail"], [class*="attribute"], [class*="spec"]');
    return Array.from(elements).slice(0, 20).map(el => ({
      class: el.className,
      text: el.textContent?.substring(0, 100)
    }));
  });
  
  console.log('\n\n=== Sample Detail Elements ===');
  details.forEach((d, i) => {
    console.log(`${i+1}. [${d.class}] ${d.text}`);
  });
  
  // Look for product specifications section
  const specSection = await page.evaluate(() => {
    const h2s = Array.from(document.querySelectorAll('h2, h3, h4, .title, .heading'));
    return h2s
      .filter(el => el.textContent.toLowerCase().includes('spec') || el.textContent.toLowerCase().includes('detail'))
      .map(el => ({
        tag: el.tagName,
        text: el.textContent,
        nextSibling: el.nextElementSibling?.outerHTML?.substring(0, 200)
      }));
  });
  
  console.log('\n\n=== Specification Sections Found ===');
  specSection.forEach((spec, i) => {
    console.log(`${i+1}. ${spec.tag}: ${spec.text}`);
    console.log(`   Next element: ${spec.nextSibling}`);
  });
  
} catch (error) {
  console.error('Error:', error.message);
} finally {
  await browser.close();
}
