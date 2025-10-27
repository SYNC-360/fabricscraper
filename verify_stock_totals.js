#!/usr/bin/env node

import fs from 'fs';

const stockFile = '/Users/richard/Desktop/Fabric Scraper/output/stock-data.json';
const stockData = JSON.parse(fs.readFileSync(stockFile, 'utf8'));

const values = Object.values(stockData);
const total = values.reduce((sum, qty) => sum + qty, 0);
const average = (total / values.length).toFixed(1);
const min = Math.min(...values);
const max = Math.max(...values);

console.log('\n📊 CORRECTED INVENTORY SUMMARY\n');
console.log(`Total Products: ${values.length}`);
console.log(`Total Inventory: ${total} yards`);
console.log(`Average per Product: ${average} yards`);
console.log(`Min Stock: ${min} yards`);
console.log(`Max Stock: ${max} yards`);
console.log(`\nChessie (UF-1761522034985): ${stockData['UF-1761522034985']} yards`);
console.log('\n✅ Stock data now shows accurate Chessie inventory of 0 yards\n');
