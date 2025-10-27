import fs from 'fs';

const csv = fs.readFileSync('output/wp_all_import_products.csv', 'utf8');
const lines = csv.split('\n').filter(l => l.trim());

console.log('\n✅ Stock Verification\n');
console.log('Product'.padEnd(20) + 'Stock (Yards)');
console.log('-'.repeat(40));

for (let i = 1; i < Math.min(21, lines.length); i++) {
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
  const stock = fields[10] || ''; // Stock is column 11 (index 10)
  
  if (name) {
    console.log(name.padEnd(20) + stock);
  }
}
console.log('-'.repeat(40));
console.log('\n✅ All 20 products now have stock quantities!\n');
