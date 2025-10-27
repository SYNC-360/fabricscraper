#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

console.log('\n📦 Applying Stock Quantities to Products\n');

// Read stock data
const stockFile = path.join(process.cwd(), 'output/stock-data.json');
const stockData = JSON.parse(fs.readFileSync(stockFile, 'utf8'));

// Read product data
const dataFile = path.join(process.cwd(), 'output/full-scrape-details.json');
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

// Apply stock to products
let productsWithStock = 0;
const updatedProducts = data.products.map(product => {
  const stock = stockData[product.sku];
  
  if (stock !== undefined) {
    productsWithStock++;
    return {
      ...product,
      stock: stock,
    };
  }
  
  return product;
});

// Update and save
const updatedData = {
  ...data,
  products: updatedProducts,
  stockAppliedAt: new Date().toISOString(),
};

fs.writeFileSync(dataFile, JSON.stringify(updatedData, null, 2));
console.log(`✅ Applied stock to ${productsWithStock}/${updatedProducts.length} products\n`);

// Now regenerate WordPress CSV with stock
console.log('🔄 Regenerating WordPress import CSV with stock...\n');

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

const wpProducts = updatedProducts.map(product => {
  const imageUrls = product.images.map(img => img.url);
  const image1 = imageUrls[0] || '';
  const image2 = imageUrls[1] || '';
  const image3 = imageUrls[2] || '';
  const gallery = imageUrls.slice(0, 3).join(', ');

  const specs = product.specs || {};
  const getSpec = (key) => specs[key.toLowerCase()] || '';

  return {
    'Brand': 'United Fabrics',
    'Name': product.title,
    'SKU': product.sku,
    'Full Name': `United Fabrics ${product.title}`,
    'Color': product.color || '',
    'Category': 'United Fabrics, Upholstery',
    'Tags': '',
    'Wholesale Price': product.wholesalePrice || '',
    'Sale Price': product.salePrice || '',
    'Retail Price': product.retailPrice || '',
    'Stock': product.stock || '',
    'Image1': image1,
    'Image2': image2,
    'Image3': image3,
    'Gallery': gallery,
    'Application': getSpec('application') || 'Upholstery, Indoor',
    'Content': getSpec('content') || '',
    'Backing': getSpec('backing') || '',
    'Finish / Topcoat': getSpec('finish / topcoat') || '',
    'Weight': getSpec('weight') || '',
    'Width': getSpec('width') || '',
    'Fabric Shown': getSpec('fabric shown') || '',
    'Origin': getSpec('origin') || '',
    'Repeat Horizontal': getSpec('repeat horizontal') || '',
    'Repeat Vertical': getSpec('repeat vertical') || '',
    'Collection': getSpec('collection') || '',
    'Abrasion Resistance': getSpec('abrasion resistance') || '',
    'Pilling': getSpec('pilling') || '',
    'Seam Slippage': getSpec('seam slippage') || '',
    'Break Strength': getSpec('break strength') || '',
    'Wet Crocking': getSpec('wet crocking') || '',
    'Dry Crocking': getSpec('dry crocking') || '',
    'Colorfastness to Light': getSpec('colorfastness to light') || '',
    'Flammability': getSpec('flammability') || '',
    'Product Notes': getSpec('product notes') || '',
  };
});

// Generate CSV
let csvContent = wpColumns.join(',') + '\n';
for (const product of wpProducts) {
  const row = wpColumns.map(col => {
    const value = String(product[col] || '').replace(/\"/g, '\"\"');
    return `"${value}"`;
  }).join(',');
  csvContent += row + '\n';
}

const csvFile = path.join(process.cwd(), 'output/wp_all_import_products.csv');
fs.writeFileSync(csvFile, csvContent);
console.log(`✅ WordPress CSV regenerated: ${csvFile}\n`);

// Summary
console.log('=' .repeat(70));
console.log('📊 STOCK APPLICATION SUMMARY');
console.log('=' .repeat(70));

console.log(`\n✅ Stock Applied: ${productsWithStock}/${updatedProducts.length} products`);

const stockedProducts = updatedProducts.filter(p => p.stock);
const totalStock = stockedProducts.reduce((sum, p) => sum + (p.stock || 0), 0);

console.log(`\n📊 Stock Statistics:`);
console.log(`   Total Inventory (Yards): ${totalStock}`);
console.log(`   Average per Product: ${(totalStock / stockedProducts.length).toFixed(1)} yards`);

const minStock = Math.min(...stockedProducts.map(p => p.stock || 0));
const maxStock = Math.max(...stockedProducts.map(p => p.stock || 0));

console.log(`   Min Stock: ${minStock} yards`);
console.log(`   Max Stock: ${maxStock} yards`);

console.log('\n✅ CSV is ready for WordPress import!');
console.log('=' .repeat(70) + '\n');
