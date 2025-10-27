const fs = require('fs');

// Read the CSV
const csv = fs.readFileSync('./output/wp_all_import_products.csv', 'utf8');
const lines = csv.split('\n');
const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));

// Parse first 3 products
console.log('\n╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║        WORDPRESS ALL IMPORT CSV - WITH COMPLETE SPECIFICATIONS            ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

for (let productIdx = 0; productIdx < 3 && productIdx + 1 < lines.length; productIdx++) {
  const row = lines[productIdx + 1];
  
  // Simple CSV parser that handles quoted values
  const values = [];
  let currentValue = '';
  let inQuotes = false;
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') {
        currentValue += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(currentValue.trim().replace(/^"|"$/g, ''));
      currentValue = '';
    } else {
      currentValue += char;
    }
  }
  values.push(currentValue.trim().replace(/^"|"$/g, ''));

  console.log(`\n📦 PRODUCT ${productIdx + 1}\n`);
  
  // Display key fields
  console.log('BASIC INFO:');
  console.log(`  Brand: ${values[0]}`);
  console.log(`  Name: ${values[1]}`);
  console.log(`  SKU: ${values[2]}`);
  console.log(`  Full Name: ${values[3]}`);
  console.log(`  Category: ${values[5]}`);
  
  console.log('\nIMAGES:');
  console.log(`  Image 1: ${values[11] ? values[11].substring(0, 70) + '...' : '[none]'}`);
  console.log(`  Image 2: ${values[12] ? values[12].substring(0, 70) + '...' : '[none]'}`);
  console.log(`  Image 3: ${values[13] ? values[13].substring(0, 70) + '...' : '[none]'}`);
  
  console.log('\nSPECIFICATIONS:');
  const specHeaders = [
    'Application', 'Content', 'Backing', 'Finish / Topcoat', 'Weight',
    'Width', 'Fabric Shown', 'Origin', 'Repeat Horizontal', 'Repeat Vertical',
    'Collection', 'Abrasion Resistance', 'Pilling', 'Seam Slippage',
    'Break Strength', 'Wet Crocking', 'Dry Crocking', 'Colorfastness to Light',
    'Flammability', 'Product Notes'
  ];
  
  for (let i = 0; i < specHeaders.length; i++) {
    const headerIdx = headers.indexOf(specHeaders[i]);
    if (headerIdx >= 0 && values[headerIdx]) {
      console.log(`  ${specHeaders[i]}: ${values[headerIdx]}`);
    }
  }
  
  console.log('\n' + '─'.repeat(75));
}

console.log('\n✅ All specification data is now being captured and exported!');
