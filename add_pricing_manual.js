#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║          PRICING DATA IMPORTER - Manual Entry Tool              ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

// Read current product data
const dataFile = path.join(process.cwd(), 'output/full-scrape-details.json');
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
const products = data.products;

console.log(`📦 Found ${products.length} products\n`);

// Create a pricing template CSV
const pricingTemplate = [];
pricingTemplate.push('Product Name,SKU,Wholesale Price');

products.forEach(p => {
  pricingTemplate.push(`"${p.title}","${p.sku}",""`);
});

const templateFile = path.join(process.cwd(), 'output/PRICING_TEMPLATE.csv');
fs.writeFileSync(templateFile, pricingTemplate.join('\n'));

console.log('📋 INSTRUCTION MANUAL:\n');
console.log('A pricing template has been created at:');
console.log(`  📄 ${templateFile}\n`);

console.log('TO ADD PRICING DATA:\n');
console.log('1. Open the PRICING_TEMPLATE.csv file in Excel or Google Sheets');
console.log('2. Fill in the "Wholesale Price" column for each product');
console.log('3. Save the file as CSV (comma-separated values)');
console.log('4. Run: node apply_pricing.js\n');

console.log('PRICING CALCULATION:\n');
console.log('Once you add wholesale prices, the system will automatically calculate:');
console.log('  • Sale Price = Wholesale Price × 2.5');
console.log('  • Retail Price = Wholesale Price × 3.25\n');

console.log('EXAMPLE:\n');
console.log('If Wholesale Price = $10.00');
console.log('  → Sale Price = $25.00 (2.5x)');
console.log('  → Retail Price = $32.50 (3.25x)\n');

// Also create an example with sample pricing
const examplePrices = {
  'Arcade': 35.00,
  'Chessie': 42.00,
  'Martha': 28.00,
  'Trellis': 26.00,
  'Tucker': 18.00,
};

const exampleTemplate = [];
exampleTemplate.push('Product Name,SKU,Wholesale Price');

products.forEach(p => {
  const price = examplePrices[p.title] || '';
  exampleTemplate.push(`"${p.title}","${p.sku}","${price}"`);
});

const exampleFile = path.join(process.cwd(), 'output/PRICING_EXAMPLE.csv');
fs.writeFileSync(exampleFile, exampleTemplate.join('\n'));

console.log('📌 SAMPLE PRICING PROVIDED:\n');
console.log('A sample pricing file has been created with example prices:');
console.log(`  📄 ${exampleFile}\n`);

console.log('You can use this as a reference or template.\n');
console.log('=' .repeat(64) + '\n');
