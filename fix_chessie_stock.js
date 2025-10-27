#!/usr/bin/env node

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const chessieUrl = 'https://www.unitedfabrics.com/product/chessie-76-rugby-club/';
const chessieSku = 'UF-1761522034985';

async function getChessieStock() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('\n🔍 Scraping Chessie stock...\n');
    
    await page.goto(chessieUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    // Extract stock information
    const stock = await page.evaluate(() => {
      const availabilityElement = document.querySelector('.product_detail_info_inventory_value');
      
      if (availabilityElement) {
        const text = availabilityElement.textContent.trim();
        console.log('Raw text:', text);
        
        // Extract NJ quantity
        const njMatch = text.match(/(\d+)\s*Yards?\s*\(NJ\)/i);
        const njQty = njMatch ? parseInt(njMatch[1]) : 0;
        
        // Extract CA quantity
        const caMatch = text.match(/(\d+)\s*Yards?\s*\(CA\)/i);
        const caQty = caMatch ? parseInt(caMatch[1]) : 0;
        
        return {
          nj: njQty,
          ca: caQty,
          total: njQty + caQty,
          rawText: text
        };
      }
      
      return null;
    });
    
    await browser.close();
    
    if (stock) {
      console.log('📦 Chessie Stock Found:');
      console.log(`   NJ: ${stock.nj} yards`);
      console.log(`   CA: ${stock.ca} yards`);
      console.log(`   Total: ${stock.total} yards\n`);
      
      // Update stock-data.json
      const stockFile = path.join(process.cwd(), 'output/stock-data.json');
      const stockData = JSON.parse(fs.readFileSync(stockFile, 'utf8'));
      stockData[chessieSku] = stock.total;
      fs.writeFileSync(stockFile, JSON.stringify(stockData, null, 2));
      
      console.log(`✅ Updated stock-data.json with ${stock.total} yards for Chessie\n`);
      return stock.total;
    } else {
      console.log('⚠️  Could not extract stock for Chessie\n');
      return null;
    }
  } catch (e) {
    console.log('❌ Error:', e.message, '\n');
    await browser.close();
    return null;
  }
}

getChessieStock();
