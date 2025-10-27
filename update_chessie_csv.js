#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const csvFile = path.join(process.cwd(), 'output/wp_all_import_products.csv');
const csvContent = fs.readFileSync(csvFile, 'utf8');
const lines = csvContent.split('\n');

// Find and update Chessie line (SKU: UF-1761522034985)
const updatedLines = lines.map(line => {
  if (line.includes('UF-1761522034985') && line.includes('Chessie')) {
    // Replace stock value (column 11) from 45 to 0
    return line.replace('"45"', '"0"');
  }
  return line;
});

fs.writeFileSync(csvFile, updatedLines.join('\n'));

console.log('✅ Updated WordPress CSV: Chessie stock set to 0 yards\n');
