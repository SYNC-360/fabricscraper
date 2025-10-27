#!/usr/bin/env node

import dotenv from 'dotenv';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

dotenv.config();

const config = {
  email: process.env.UF_EMAIL,
  password: process.env.UF_PASSWORD,
  loginUrl: process.env.UF_LOGIN_URL || 'https://www.unitedfabrics.com/user/login/',
  startUrl: process.env.UF_START_LISTING || 'https://www.unitedfabrics.com/fabric/',
  maxPages: parseInt(process.env.MAX_PAGES) || 1,
};

console.log('🚀 Starting United Fabrics Test Scrape');
console.log(`📧 Email: ${config.email}`);
console.log(`🔗 Login URL: ${config.loginUrl}`);
console.log(`📄 Start URL: ${config.startUrl}`);
console.log(`📊 Max Pages: ${config.maxPages}`);
console.log('');

let browser;

(async () => {
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Step 1: Login
    console.log('🔐 Step 1: Logging in...');
    await page.goto(config.loginUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Try different selectors for email input
    const emailSelectors = ['input[name="log"]', 'input[type="email"]', 'input[placeholder*="email" i]', 'input[id*="email" i]'];
    let emailInput = null;
    for (const selector of emailSelectors) {
      try {
        emailInput = await page.$(selector);
        if (emailInput) {
          console.log(`✅ Found email input: ${selector}`);
          break;
        }
      } catch (e) {
        // try next
      }
    }

    if (!emailInput) {
      console.log('⚠️  Could not find email input. Checking page for login form...');
      const pageText = await page.evaluate(() => document.body.innerText);
      console.log('Page contains:', pageText.substring(0, 500));

      // Try to take screenshot for debugging
      await page.screenshot({ path: path.join(process.cwd(), 'output', 'login-page.png') });
      console.log('Screenshot saved to output/login-page.png');
    } else {
      await emailInput.fill(config.email);
      console.log(`✅ Entered email: ${config.email}`);

      // Password input
      const passwordSelectors = ['input[name="pwd"]', 'input[type="password"]', 'input[placeholder*="password" i]'];
      let passwordInput = null;
      for (const selector of passwordSelectors) {
        try {
          passwordInput = await page.$(selector);
          if (passwordInput) {
            console.log(`✅ Found password input: ${selector}`);
            break;
          }
        } catch (e) {
          // try next
        }
      }

      if (passwordInput) {
        await passwordInput.fill(config.password);
        console.log(`✅ Entered password`);
      }

      // Submit button
      const submitSelectors = ['button[type="submit"]', 'input[type="submit"]', 'button.login-button', 'button[name="wp-submit"]'];
      let submitBtn = null;
      for (const selector of submitSelectors) {
        try {
          submitBtn = await page.$(selector);
          if (submitBtn) {
            console.log(`✅ Found submit button: ${selector}`);
            break;
          }
        } catch (e) {
          // try next
        }
      }

      if (submitBtn) {
        await submitBtn.click();
        await page.waitForTimeout(3000);
        console.log('✅ Clicked login button');
      }
    }

    // Check if login successful
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);

    // Step 2: Navigate to listings
    console.log('');
    console.log('📋 Step 2: Navigating to fabric listings...');
    await page.goto(config.startUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Step 3: Extract products
    console.log('');
    console.log('🔍 Step 3: Extracting products...');

    const products = [];
    let pageNum = 1;

    while (pageNum <= config.maxPages) {
      console.log(`\n📄 Page ${pageNum}:`);

      // Wait for products to load
      await page.waitForTimeout(1000);

      // Try different product selectors
      const productSelectors = [
        'li.product a[href*="/product/"]',
        'a.product-link',
        '.product-item a',
        'a[class*="product"]',
        'a[href*="/product"]',
      ];

      let productElements = [];
      let foundSelector = null;
      for (const selector of productSelectors) {
        try {
          productElements = await page.$$(selector);
          if (productElements.length > 0) {
            console.log(`✅ Found ${productElements.length} products with selector: ${selector}`);
            foundSelector = selector;
            break;
          }
        } catch (e) {
          // try next
        }
      }

      if (productElements.length === 0) {
        console.log('⚠️  No products found on this page');

        // Check page content
        const pageText = await page.evaluate(() => document.body.innerText);
        if (pageText.length > 0) {
          console.log('Page snippet:', pageText.substring(0, 500));
        }
        break;
      }

      // Extract URLs from first few products
      for (let i = 0; i < Math.min(5, productElements.length); i++) {
        try {
          const href = await productElements[i].getAttribute('href');
          const text = await productElements[i].textContent();
          if (href) {
            const fullUrl = href.startsWith('http') ? href : new URL(href, config.startUrl).toString();
            products.push({
              url: fullUrl,
              title: text?.trim() || 'Unknown',
              position: i + 1,
            });
            console.log(`  ${i + 1}. ${text?.trim() || 'Product'}`);
            console.log(`     URL: ${fullUrl}`);
          }
        } catch (e) {
          console.log(`  Error extracting product ${i + 1}`);
        }
      }

      // Try to find next page
      const nextSelectors = ['a.next', 'a[aria-label*="next" i]', '.pagination a.next', 'a[rel="next"]'];
      let nextUrl = null;
      for (const selector of nextSelectors) {
        try {
          const nextBtn = await page.$(selector);
          if (nextBtn) {
            const href = await nextBtn.getAttribute('href');
            if (href) {
              nextUrl = href.startsWith('http') ? href : new URL(href, config.startUrl).toString();
              console.log(`✅ Found next page button`);
              break;
            }
          }
        } catch (e) {
          // try next
        }
      }

      if (nextUrl && pageNum < config.maxPages) {
        console.log(`➡️  Going to next page...`);
        await page.goto(nextUrl, { waitUntil: 'domcontentloaded' });
        pageNum++;
        await page.waitForTimeout(1000);
      } else {
        break;
      }
    }

    // Step 4: Save results
    console.log('');
    console.log('💾 Step 4: Saving results...');

    const outputDir = path.join(process.cwd(), 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const resultsFile = path.join(outputDir, 'test-scrape-results.json');
    fs.writeFileSync(resultsFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      productsFound: products.length,
      pagesScraped: pageNum,
      products: products,
    }, null, 2));

    console.log(`✅ Results saved to: ${resultsFile}`);
    console.log('');
    console.log('📊 Summary:');
    console.log(`   Total products found: ${products.length}`);
    console.log(`   Pages crawled: ${pageNum}`);
    console.log('');
    console.log('✅ Test scrape completed!');

    await page.close();
    await browser.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    if (browser) {
      await browser.close();
    }
    process.exit(1);
  }
})();
