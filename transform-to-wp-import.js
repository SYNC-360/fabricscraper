#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read the full scrape details JSON
const detailsFile = path.join(__dirname, 'output/full-scrape-details.json');
const data = JSON.parse(fs.readFileSync(detailsFile, 'utf8'));

// WordPress import template expects these columns (matching United_brown_pdp.csv)
const wpColumns = [
  'Brand',
  'Name',
  'SKU',
  'Full Name',
  'Color',
  'Category',
  'Tags',
  'Wholesale Price',
  'Sale Price',
  'Retail Price',
  'Stock',
  'Image1',
  'Image2',
  'Image3',
  'Gallery',
  'Application',
  'Content',
  'Backing',
  'Finish / Topcoat',
  'Weight',
  'Width',
  'Fabric Shown',
  'Origin',
  'Repeat Horizontal',
  'Repeat Vertical',
  'Collection',
  'Abrasion Resistance',
  'Pilling',
  'Seam Slippage',
  'Break Strength',
  'Wet Crocking',
  'Dry Crocking',
  'Colorfastness to Light',
  'Flammability',
  'Product Notes'
];

console.log('📊 Transforming scraped data to WordPress All Import format...\n');

// Transform each product from our scrape to match the WordPress format
const wpProducts = data.products.map(product => {
  // Extract images - convert from array to separate columns + gallery
  const imageUrls = product.images.map(img => img.url);
  const image1 = imageUrls[0] || '';
  const image2 = imageUrls[1] || '';
  const image3 = imageUrls[2] || '';
  const gallery = imageUrls.slice(0, 3).join(', '); // Gallery as comma-separated

  // Extract specs - create key-value lookups
  const specs = product.specs || {};

  // Helper to get spec value or empty string
  const getSpec = (key) => specs[key.toLowerCase()] || '';

  // Map specs to WordPress columns (best effort mapping based on common fabric specs)
  const application = getSpec('application') || 'Upholstery, Indoor';
  const content = getSpec('content') || getSpec('composition') || '';
  const backing = getSpec('backing') || '';
  const finishTopcoat = getSpec('finish / topcoat') || getSpec('finish') || '';
  const weight = getSpec('weight') || '';
  const width = getSpec('width') || '';
  const fabricShown = getSpec('fabric shown') || '';
  const origin = getSpec('origin') || '';
  const repeatHorizontal = getSpec('repeat horizontal') || '';
  const repeatVertical = getSpec('repeat vertical') || '';
  const collection = getSpec('collection') || '';
  const abrasionResistance = getSpec('abrasion resistance') || '';
  const pilling = getSpec('pilling') || '';
  const seamSlippage = getSpec('seam slippage') || '';
  const breakStrength = getSpec('break strength') || '';
  const wetCrocking = getSpec('wet crocking') || '';
  const dryCrocking = getSpec('dry crocking') || '';
  const colorfastnessToLight = getSpec('colorfastness to light') || '';
  const flammability = getSpec('flammability') || '';
  const productNotes = getSpec('product notes') || '';

  return {
    'Brand': 'United Fabrics',
    'Name': product.title,
    'SKU': product.sku,
    'Full Name': `United Fabrics ${product.title}`,
    'Color': product.color || '', // Color/variant from product page
    'Category': 'United Fabrics, Upholstery', // Basic category, can be enhanced
    'Tags': '', // Can be populated with specs
    'Wholesale Price': product.wholesalePrice || '',
    'Sale Price': product.salePrice || '',
    'Retail Price': product.retailPrice || '',
    'Stock': '', // Not available from source
    'Image1': image1,
    'Image2': image2,
    'Image3': image3,
    'Gallery': gallery,
    'Application': application,
    'Content': content,
    'Backing': backing,
    'Finish / Topcoat': finishTopcoat,
    'Weight': weight,
    'Width': width,
    'Fabric Shown': fabricShown,
    'Origin': origin,
    'Repeat Horizontal': repeatHorizontal,
    'Repeat Vertical': repeatVertical,
    'Collection': collection,
    'Abrasion Resistance': abrasionResistance,
    'Pilling': pilling,
    'Seam Slippage': seamSlippage,
    'Break Strength': breakStrength,
    'Wet Crocking': wetCrocking,
    'Dry Crocking': dryCrocking,
    'Colorfastness to Light': colorfastnessToLight,
    'Flammability': flammability,
    'Product Notes': productNotes
  };
});

console.log(`✅ Transformed ${wpProducts.length} products`);

// Generate CSV with proper escaping
let csvContent = wpColumns.join(',') + '\n';

for (const product of wpProducts) {
  const row = wpColumns.map(col => {
    const value = String(product[col] || '').replace(/"/g, '""'); // Escape quotes
    // Quote fields that contain commas or quotes
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value}"`;
    }
    return `"${value}"`;
  }).join(',');
  csvContent += row + '\n';
}

// Save to output
const outputFile = path.join(__dirname, 'output/wp_all_import_products.csv');
fs.writeFileSync(outputFile, csvContent);

console.log(`✅ CSV saved to: ${outputFile}`);
console.log(`📊 Total rows: ${wpProducts.length}`);
console.log(`📁 File size: ${(fs.statSync(outputFile).size / 1024).toFixed(1)} KB`);

// Also save as JSON for reference
const jsonFile = path.join(__dirname, 'output/wp_all_import_products.json');
fs.writeFileSync(jsonFile, JSON.stringify({
  timestamp: new Date().toISOString(),
  totalProducts: wpProducts.length,
  products: wpProducts,
  columns: wpColumns
}, null, 2));

console.log(`✅ JSON reference saved to: ${jsonFile}`);

console.log('\n' + '='.repeat(60));
console.log('📊 WordPress All Import Format Export Summary');
console.log('='.repeat(60));
console.log(`✅ Total Products: ${wpProducts.length}`);
console.log(`✅ Total Columns: ${wpColumns.length}`);
console.log(`✅ Images Per Product: Up to 3 (+ Gallery field)`);
console.log(`\nColumns included:`);
wpColumns.forEach((col, i) => {
  if ((i + 1) % 5 === 0) {
    console.log(`  ${i + 1}. ${col}`);
  } else if (i === wpColumns.length - 1) {
    console.log(`  ${i + 1}. ${col}`);
  }
});
console.log('\n' + '='.repeat(60));
console.log('Ready to import to WordPress with WP All Import plugin!');
console.log('='.repeat(60));
