const fs = require('fs');

const csv = fs.readFileSync('output/wp_all_import_products.csv', 'utf8');
const lines = csv.split('\n').filter(l => l.trim());

console.log('Stock Verification\n');
console.log('Product'.padEnd(20) + 'SKU'.padEnd(20) + 'Stock');
console.log('-'.repeat(60));

const header = lines[0];
const stockIndex = header.split(',').findIndex(h => h === 'Stock');

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  
  // Parse CSV line properly
  let fields = [];
  let current = '';
  let inQuotes = false;
  
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current.replace(/\"/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current.replace(/\"/g, ''));
  
  const name = fields[1] || '';
  const sku = fields[2] || '';
  const stock = fields[10] || ''; // Stock is column 11 (index 10)
  
  if (name && i <= 11) {
    console.log(name.padEnd(20) + sku.padEnd(20) + stock);
  }
}
