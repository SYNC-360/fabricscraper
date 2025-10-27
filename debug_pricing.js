#!/usr/bin/env node

import dotenv from 'dotenv';
import { chromium } from 'playwright';

dotenv.config();

const config = {
  email: process.env.UF_EMAIL,
  password: process.env.UF_PASSWORD,
  loginUrl: process.env.UF_LOGIN_URL || 'https://www.unitedfabrics.com/user/login/',
};

let browser;

(async () => {
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Login
    console.log('🔐 Logging in...');
    await page.goto(config.loginUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const emailInput = await page.$('input[type="email"]');
    if (emailInput) {
      await emailInput.fill(config.email);
      const passwordInput = await page.$('input[type="password"]');
      await passwordInput.fill(config.password);
      const submitBtn = await page.$('button[type="submit"]');
      await submitBtn.click();
      await page.waitForTimeout(3000);
      console.log('✅ Logged in\n');
    }

    // Go to a product page
    const productUrl = 'https://www.unitedfabrics.com/product/arcade-32-kiln/';
    console.log(`📄 Checking product page: ${productUrl}\n`);
    
    await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Get the page HTML to analyze
    const html = await page.content();
    
    // Look for price patterns in HTML
    const priceMatches = html.match(/\$[\d,\.]+/g);
    console.log('💰 Found price patterns in HTML:');
    if (priceMatches) {
      [...new Set(priceMatches)].slice(0, 10).forEach(price => {
        console.log(`  • ${price}`);
      });
    }

    // Get text content
    const textContent = await page.evaluate(() => document.body.innerText);
    
    // Find the pricing section
    const lines = textContent.split('\n').map(l => l.trim());
    const priceLineIndex = lines.findIndex(l => l === 'Wholesale Price');
    
    console.log(`\n📍 Found "Wholesale Price" at line ${priceLineIndex}`);
    
    if (priceLineIndex >= 0) {
      console.log('\nContext around pricing:');
      for (let i = Math.max(0, priceLineIndex - 2); i < Math.min(lines.length, priceLineIndex + 10); i++) {
        const marker = i === priceLineIndex ? '>>> ' : '    ';
        console.log(`${marker}[${i}] ${lines[i]}`);
      }
    } else {
      console.log('\n⚠️  "Wholesale Price" not found in text content');
      console.log('\nSearching for price-related text:');
      const priceLines = lines.filter((l, i) => {
        return l.includes('price') || l.includes('Price') || l.includes('$') || l.includes('Login');
      });
      priceLines.slice(0, 15).forEach(line => {
        console.log(`  • ${line}`);
      });
    }

    // Check for hidden elements or JavaScript-rendered content
    const priceElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('[class*="price"], [class*="Price"], .price, .Price, [data-price]');
      return Array.from(elements).map(el => ({
        class: el.className,
        text: el.textContent?.substring(0, 100),
        html: el.outerHTML?.substring(0, 150)
      })).slice(0, 10);
    });

    if (priceElements.length > 0) {
      console.log('\n🔍 Found price-related elements:');
      priceElements.forEach((el, i) => {
        console.log(`  ${i+1}. [${el.class}]`);
        console.log(`     Text: ${el.text}`);
      });
    }

    await browser.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (browser) {
      await browser.close();
    }
  }
})();
