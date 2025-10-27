import { chromium } from 'playwright';
import dotenv from 'dotenv';

dotenv.config();

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  // Get a product URL from our scraped data
  const fs = await import('fs');
  const data = JSON.parse(fs.readFileSync('./output/full-scrape-details.json', 'utf8'));
  const productUrl = data.products[0].url;
  
  console.log(`Checking product: ${productUrl}\n`);
  
  await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
  
  // Get full page HTML to analyze structure
  const html = await page.content();
  
  // Look for common patterns for specs
  console.log('=== Searching for Specification Patterns ===\n');
  
  // Check for spec tables
  const specTables = await page.$$eval('table', tables => tables.length);
  console.log(`Found ${specTables} tables`);
  
  // Check for divs with "spec" or "attribute" classes
  const specDivs = await page.$$eval('[class*="spec"], [class*="attribute"], [class*="detail"]', els => els.length);
  console.log(`Found ${specDivs} elements with spec/attribute/detail classes`);
  
  // Look for common spec labels
  const textContent = await page.textContent();
  const hasApplication = textContent.includes('Application');
  const hasContent = textContent.includes('Content') || textContent.includes('Composition');
  const hasWeight = textContent.includes('Weight');
  const hasWidth = textContent.includes('Width');
  const hasOrigin = textContent.includes('Origin');
  
  console.log(`\nSpec Keywords Found:`);
  console.log(`  Application: ${hasApplication}`);
  console.log(`  Content/Composition: ${hasContent}`);
  console.log(`  Weight: ${hasWeight}`);
  console.log(`  Width: ${hasWidth}`);
  console.log(`  Origin: ${hasOrigin}`);
  
  // Try to extract any visible text that looks like specs
  const allText = await page.locator('body').allTextContents();
  console.log(`\nPage text length: ${textContent.length} characters`);
  
  // Save a portion of HTML for analysis
  const htmlSnippet = html.substring(0, 5000);
  console.log(`\n=== First 5000 chars of HTML ===`);
  console.log(htmlSnippet);
  
} catch (error) {
  console.error('Error:', error.message);
} finally {
  await browser.close();
}
