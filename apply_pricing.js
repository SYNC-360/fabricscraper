#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

console.log('\n💰 Applying Pricing Data to Products\n');

// Read pricing data
const pricingFile = path.join(process.cwd(), 'output/PRICING_TEMPLATE.csv');

if (!fs.existsSync(pricingFile)) {
  console.error('❌ PRICING_TEMPLATE.csv not found!');
  console.error('   Please fill in pricing data first.\n');
  process.exit(1);
}

const pricingCSV = fs.readFileSync(pricingFile, 'utf8');
const pricingLines = pricingCSV.split('\n');
const pricingData = {};

// Parse pricing CSV
for (let i = 1; i < pricingLines.length; i++) {
  if (!pricingLines[i].trim()) continue;
  
  const parts = pricingLines[i].split(',');
  const name = parts[0].replace(/"/g, '').trim();
  const sku = parts[1].replace(/"/g, '').trim();
  const wholesale = parseFloat(parts[2].replace(/"/g, '').trim());
  
  if (!isNaN(wholesale) && wholesale > 0) {
    pricingData[sku] = wholesale;
  }
}

console.log(`✅ Loaded pricing for ${Object.keys(pricingData).length} products\n`);

// Read product data
const dataFile = path.join(process.cwd(), 'output/full-scrape-details.json');
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

// Helper function for pricing calculation
function calculatePrices(wholesale) {
  return {
    salePrice: Number((wholesale * 2.5).toFixed(2)),
    retailPrice: Number((wholesale * 3.25).toFixed(2)),
  };
}

// Update products with pricing
let productsWithPricing = 0;
const updatedProducts = data.products.map(product => {
  const wholesale = pricingData[product.sku];
  
  if (wholesale) {
    const prices = calculatePrices(wholesale);
    productsWithPricing++;
    return {
      ...product,
      wholesalePrice: wholesale,
      salePrice: prices.salePrice,
      retailPrice: prices.retailPrice,
    };
  }
  
  return product;
});

// Save updated data
const updatedData = {
  ...data,
  products: updatedProducts,
  pricingAppliedAt: new Date().toISOString(),
};

fs.writeFileSync(dataFile, JSON.stringify(updatedData, null, 2));
console.log(`✅ Updated ${productsWithPricing} products with pricing\n`);

// Now regenerate WordPress CSV
console.log('🔄 Regenerating WordPress import CSV...\n');

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
    'Stock': '',
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
    const value = String(product[col] || '').replace(/"/g, '""');
    return `"${value}"`;
  }).join(',');
  csvContent += row + '\n';
}

const csvFile = path.join(process.cwd(), 'output/wp_all_import_products.csv');
fs.writeFileSync(csvFile, csvContent);
console.log(`✅ WordPress CSV regenerated: ${csvFile}\n`);

// Summary
console.log('=' .repeat(70));
console.log('📊 PRICING APPLICATION SUMMARY');
console.log('=' .repeat(70));

const productsWithPrices = updatedProducts.filter(p => p.wholesalePrice);
const totalWholesale = productsWithPrices.reduce((sum, p) => sum + (p.wholesalePrice || 0), 0);
const totalRetail = productsWithPrices.reduce((sum, p) => sum + (p.retailPrice || 0), 0);

console.log(`\n✅ Products with Pricing: ${productsWithPrices.length}/${updatedProducts.length}`);
console.log(`\n💰 Financial Summary:`);
console.log(`   Total Wholesale Value: $${totalWholesale.toFixed(2)}`);
console.log(`   Total Retail Value:    $${totalRetail.toFixed(2)}`);
console.log(`   Total Markup:          $${(totalRetail - totalWholesale).toFixed(2)} (225%)`);

if (productsWithPrices.length > 0) {
  const avgWholesale = totalWholesale / productsWithPrices.length;
  const avgRetail = totalRetail / productsWithPrices.length;
  console.log(`\n📈 Average Per Product:`);
  console.log(`   Wholesale: $${avgWholesale.toFixed(2)}`);
  console.log(`   Retail:    $${avgRetail.toFixed(2)}`);
}

console.log('\n✅ CSV is ready for WordPress import!');
console.log('=' .repeat(70) + '\n');
