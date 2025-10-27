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
    const context = await browser.newContext();
    const page = await context.newPage();

    // Log network requests
    await page.on('response', response => {
      if (response.url().includes('price') || response.url().includes('api') || response.url().includes('product')) {
        console.log(`📡 ${response.status()}: ${response.url()}`);
      }
    });

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
      await page.waitForTimeout(4000);
      console.log('✅ Logged in\n');
    }

    // Go to a product page
    console.log('📄 Loading product page and monitoring network requests:\n');
    
    await page.goto('https://www.unitedfabrics.com/product/arcade-32-kiln/', { waitUntil: 'networkidle' });
    
    console.log('\n✅ Page loaded, checking for pricing data in network responses...\n');

    // Check page source for any embedded data
    const pageData = await page.evaluate(() => {
      // Check for window objects
      const data = {};
      if (window.__INITIAL_STATE__) {
        data.initialState = window.__INITIAL_STATE__;
      }
      if (window.__data__) {
        data.windowData = window.__data__;
      }
      // Check for data attributes
      const priceDiv = document.querySelector('[class*="price"]');
      if (priceDiv) {
        data.priceDiv = {
          attributes: Array.from(priceDiv.attributes).map(a => ({name: a.name, value: a.value})),
          innerText: priceDiv.innerText
        };
      }
      return data;
    });

    if (Object.keys(pageData).length > 0) {
      console.log('📊 Found page data:');
      console.log(JSON.stringify(pageData, null, 2));
    } else {
      console.log('⚠️  No pricing data embedded in page');
    }

    // Check for pricing in local/session storage
    const storage = await page.evaluate(() => {
      return {
        localStorage: Object.keys(localStorage).filter(k => k.includes('price') || k.includes('product')),
        sessionStorage: Object.keys(sessionStorage).filter(k => k.includes('price') || k.includes('product'))
      };
    });

    console.log('\n📦 Storage check:');
    console.log(`  localStorage keys: ${storage.localStorage.length > 0 ? storage.localStorage.join(', ') : 'none'}`);
    console.log(`  sessionStorage keys: ${storage.sessionStorage.length > 0 ? storage.sessionStorage.join(', ') : 'none'}`);

    await browser.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (browser) {
      await browser.close();
    }
  }
})();
