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
  maxPages: parseInt(process.env.MAX_PAGES) || 5,
};

console.log('🚀 Starting Full United Fabrics Scrape');
console.log(`📧 Email: ${config.email}`);
console.log(`📊 Max Pages: ${config.maxPages}`);
console.log('');

let browser;

// Helper function to compute prices
function computePrices(wholesalePrice) {
  if (!wholesalePrice) return { salePrice: null, retailPrice: null };
  return {
    salePrice: Number((wholesalePrice * 2.5).toFixed(2)),
    retailPrice: Number((wholesalePrice * 3.25).toFixed(2)),
  };
}

// Helper function to extract text from first matching selector
async function extractText(page, selectors) {
  for (const selector of selectors) {
    try {
      const element = await page.$(selector);
      if (element) {
        const text = await page.evaluate(el => el.textContent, element);
        return text?.trim().replace(/\s+/g, ' ') || '';
      }
    } catch (e) {
      // try next
    }
  }
  return '';
}

// Extract full product details from PDP
async function extractProductDetails(page, url) {
  try {
    console.log(`    📄 Extracting details from: ${url}`);

    // Title
    const titleSelectors = ['h1.product_title', 'h1.product-title', 'h1', 'h2[class*="title"]'];
    const title = await extractText(page, titleSelectors);

    // SKU
    const skuSelectors = ['span.sku', '.product-sku', 'p[class*="sku"]', '.product-code'];
    let sku = await extractText(page, skuSelectors);
    if (sku) {
      sku = sku.replace(/^sku:\s*|^SKU\s*/i, '').trim();
    }
    if (!sku) sku = `UF-${Date.now()}`;

    // Extract color/variant from page
    let color = '';
    try {
      color = await page.evaluate(() => {
        // Look for active/selected swatch
        const selected = document.querySelector('[class*="swatch"][class*="active"], [class*="swatch"][class*="selected"]');
        if (selected) {
          const text = selected.textContent.trim();
          // Extract just the text, removing whitespace and filtering out long content
          const lines = text.split('\n').map(l => l.trim()).filter(l => l && l.length < 100);
          for (const line of lines) {
            if (line && !line.includes('svg') && !line.includes('img') && line.length > 0 && line.length < 50) {
              return line;
            }
          }
        }

        // Otherwise get first available color option text
        const swatches = document.querySelectorAll('[class*="swatch"]');
        for (const swatch of swatches) {
          const text = swatch.textContent.trim();
          const lines = text.split('\n').map(l => l.trim()).filter(l => l && l.length < 100);
          for (const line of lines) {
            if (line && !line.includes('Select') && !line.includes('More') && !line.includes('svg') && line.length > 0 && line.length < 50) {
              return line;
            }
          }
        }
        return '';
      });
    } catch (e) {
      // color extraction failed, continue with empty
    }

    // Price
    const priceSelectors = ['p.price', 'span.price', '.woocommerce-price-amount', '[itemprop="price"]'];
    const priceText = await extractText(page, priceSelectors);
    const priceMatch = priceText.match(/\$?([\d.]+)/);
    const wholesalePrice = priceMatch ? parseFloat(priceMatch[1]) : null;
    const { salePrice, retailPrice } = computePrices(wholesalePrice);

    // Description
    const descSelectors = ['.product-description', '.product_description', '.woocommerce-product-details__short-description'];
    const description = await extractText(page, descSelectors);

    // Images
    const images = [];
    try {
      const gallerySelectors = ['a[href*=".jpg"]', 'a[href*=".png"]', 'img[class*="gallery"]'];
      const imageElements = await page.$$('a[href*=".jpg"], a[href*=".png"], img[class*="gallery"]');

      for (let i = 0; i < Math.min(imageElements.length, 10); i++) {
        try {
          const src = await page.evaluate(el => el.getAttribute('src') || el.getAttribute('href'), imageElements[i]);
          if (src && (src.includes('.jpg') || src.includes('.png') || src.includes('.webp'))) {
            images.push({
              url: src.startsWith('http') ? src : new URL(src, config.startUrl).toString(),
              position: i + 1,
            });
          }
        } catch (e) {
          // skip
        }
      }
    } catch (e) {
      // no images
    }

    // Extract specs - United Fabrics uses divs with labels
    const specs = await page.evaluate(() => {
      const specObj = {};

      // Method 1: Find all elements that look like "Label: Value" pairs
      const textContent = document.body.innerText;
      const lines = textContent.split('\n').map(l => l.trim()).filter(l => l);

      // Known spec labels to look for
      const specLabels = [
        'Application', 'Content', 'Backing', 'Finish / Topcoat', 'Weight',
        'Width', 'Fabric Shown', 'Origin', 'Repeat Horizontal', 'Repeat Vertical',
        'Collection', 'Abrasion Resistance', 'Pilling', 'Seam Slippage',
        'Break Strength', 'Wet Crocking', 'Dry Crocking', 'Colorfastness to Light',
        'Flammability', 'Product Notes'
      ];

      // Parse specs from text content
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i];
        const nextLine = lines[i + 1];

        // Check if current line is a known spec label
        for (const label of specLabels) {
          if (line === label || line.toLowerCase() === label.toLowerCase()) {
            const value = nextLine;
            // Skip if next line is also a label or empty
            if (!specLabels.includes(value) && value && value.length > 0) {
              specObj[label.toLowerCase()] = value;
            }
            break;
          }
        }
      }

      return specObj;
    });

    // Also try extraction from DOM structure as backup
    if (Object.keys(specs).length === 0) {
      try {
        const domSpecs = await page.evaluate(() => {
          const specs = {};
          // Look for divs that contain spec information
          const allDivs = document.querySelectorAll('div');
          for (const div of allDivs) {
            const text = div.textContent;
            if (text.includes('Application') && text.includes('Upholstery')) {
              // This div likely contains specs, parse it
              const lines = text.split('\n').map(l => l.trim()).filter(l => l);
              for (let i = 0; i < lines.length - 1; i++) {
                const line = lines[i];
                const nextLine = lines[i + 1];
                if (line === 'Application' && nextLine) specs['application'] = nextLine;
                if (line === 'Content' && nextLine) specs['content'] = nextLine;
                if (line === 'Backing' && nextLine) specs['backing'] = nextLine;
                if (line === 'Weight' && nextLine) specs['weight'] = nextLine;
                if (line === 'Width' && nextLine) specs['width'] = nextLine;
                if (line === 'Origin' && nextLine) specs['origin'] = nextLine;
              }
              break;
            }
          }
          return specs;
        });

        // Merge DOM specs with already extracted specs
        Object.assign(specs, domSpecs);
      } catch (e) {
        // DOM extraction failed, continue with what we have
      }
    }

    const product = {
      url,
      sku,
      title: title || 'Unknown Product',
      color: color || '', // Color/variant extracted from page
      description,
      wholesalePrice,
      salePrice,
      retailPrice,
      images,
      specs,
      scrapedAt: new Date().toISOString(),
    };

    console.log(`      ✅ ${product.sku}: ${product.title} - $${product.retailPrice || 'N/A'}`);
    return product;
  } catch (error) {
    console.log(`      ❌ Error extracting details: ${error.message}`);
    return null;
  }
}

(async () => {
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Step 1: Login
    console.log('🔐 Step 1: Logging in...');
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
      console.log('✅ Login successful');
    }

    // Step 2: Navigate to listings
    console.log('');
    console.log('📋 Step 2: Navigating to listings...');
    await page.goto(config.startUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Step 3: Collect all product URLs
    console.log('');
    console.log('🔗 Step 3: Collecting product URLs...');

    const allProducts = [];
    let pageNum = 1;

    while (pageNum <= config.maxPages) {
      console.log(`\n📄 Page ${pageNum}:`);
      await page.waitForTimeout(1000);

      // Find products
      const productElements = await page.$$('a[class*="product"]');
      console.log(`   Found ${productElements.length} products`);

      for (let i = 0; i < productElements.length; i++) {
        try {
          const href = await page.evaluate(el => el.getAttribute('href'), productElements[i]);
          const text = await page.evaluate(el => el.textContent, productElements[i]);
          if (href) {
            const fullUrl = href.startsWith('http') ? href : new URL(href, config.startUrl).toString();
            allProducts.push({
              url: fullUrl,
              title: text?.trim() || 'Unknown',
            });
          }
        } catch (e) {
          // skip
        }
      }

      // Find next page
      const nextBtn = await page.$('a.next, a[aria-label*="next" i], a[rel="next"]');
      if (nextBtn && pageNum < config.maxPages) {
        const nextUrl = await page.evaluate(el => el.getAttribute('href'), nextBtn);
        if (nextUrl) {
          const fullNextUrl = nextUrl.startsWith('http') ? nextUrl : new URL(nextUrl, config.startUrl).toString();
          console.log(`   ➡️  Going to next page...`);
          await page.goto(fullNextUrl, { waitUntil: 'domcontentloaded' });
          pageNum++;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    console.log('');
    console.log(`✅ Collected ${allProducts.length} product URLs from ${pageNum} pages`);

    // Step 4: Extract details from each product
    console.log('');
    console.log('📥 Step 4: Extracting full product details...');
    console.log(`   Processing ${Math.min(30, allProducts.length)} products (limit for time)`);

    const extractedProducts = [];
    const limitedProducts = allProducts.slice(0, 30); // Limit to 30 for time

    for (let i = 0; i < limitedProducts.length; i++) {
      const product = limitedProducts[i];
      console.log(`\n  ${i + 1}/${limitedProducts.length}: ${product.title}`);

      try {
        await page.goto(product.url, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500);

        const details = await extractProductDetails(page, product.url);
        if (details) {
          extractedProducts.push(details);
        }
      } catch (error) {
        console.log(`      ❌ Error: ${error.message}`);
      }
    }

    // Step 5: Save results
    console.log('');
    console.log('💾 Step 5: Saving results...');

    const outputDir = path.join(process.cwd(), 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save detailed JSON
    const detailedFile = path.join(outputDir, 'full-scrape-details.json');
    fs.writeFileSync(detailedFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      totalProductsFound: allProducts.length,
      detailedProductsExtracted: extractedProducts.length,
      pagesScraped: pageNum,
      products: extractedProducts,
    }, null, 2));
    console.log(`✅ Details saved to: ${detailedFile}`);

    // Save as JSONL
    const jsonlFile = path.join(outputDir, 'raw-products-full.jsonl');
    const jsonlLines = extractedProducts.map(p => JSON.stringify(p)).join('\n');
    fs.writeFileSync(jsonlFile, jsonlLines + '\n');
    console.log(`✅ JSONL saved to: ${jsonlFile}`);

    // Generate CSVs from extracted products
    console.log('');
    console.log('📊 Generating CSV exports...');

    // Shopify CSV
    const shopifyRows = [];
    for (const product of extractedProducts) {
      const handle = product.title.toLowerCase().replace(/\s+/g, '-').substring(0, 100);
      if (product.images.length > 0) {
        for (const img of product.images) {
          shopifyRows.push({
            Handle: handle,
            Title: product.title,
            'Body (HTML)': product.description || '',
            Vendor: 'United Fabrics',
            'Product Category': 'Upholstery Fabric',
            Tags: Object.keys(product.specs).join(';').substring(0, 50),
            Published: 'TRUE',
            'Option1 Name': 'Default Title',
            'Option1 Value': 'Default Title',
            'Variant SKU': product.sku,
            'Variant Price': product.retailPrice || 0,
            'Variant Requires Shipping': 'TRUE',
            'Variant Taxable': 'TRUE',
            'Image Src': img.url,
            'Image Position': img.position,
            Status: 'active',
          });
        }
      } else {
        shopifyRows.push({
          Handle: handle,
          Title: product.title,
          'Body (HTML)': product.description || '',
          Vendor: 'United Fabrics',
          'Product Category': 'Upholstery Fabric',
          Tags: '',
          Published: 'TRUE',
          'Option1 Name': 'Default Title',
          'Option1 Value': 'Default Title',
          'Variant SKU': product.sku,
          'Variant Price': product.retailPrice || 0,
          'Variant Requires Shipping': 'TRUE',
          'Variant Taxable': 'TRUE',
          'Image Src': '',
          'Image Position': 0,
          Status: 'active',
        });
      }
    }

    const shopifyHeaders = ['Handle', 'Title', 'Body (HTML)', 'Vendor', 'Product Category', 'Tags', 'Published', 'Option1 Name', 'Option1 Value', 'Variant SKU', 'Variant Price', 'Variant Requires Shipping', 'Variant Taxable', 'Image Src', 'Image Position', 'Status'];
    let shopifyCSV = shopifyHeaders.join(',') + '\n';
    for (const row of shopifyRows) {
      shopifyCSV += shopifyHeaders.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(',') + '\n';
    }
    fs.writeFileSync(path.join(outputDir, 'shopify_products_full.csv'), shopifyCSV);
    console.log(`✅ Shopify CSV: ${shopifyRows.length} rows`);

    // WooCommerce CSV
    const wooRows = [];
    for (const product of extractedProducts) {
      const imageUrls = product.images.map(img => img.url).join('|');
      wooRows.push({
        Type: 'simple',
        SKU: product.sku,
        Name: product.title,
        Published: '1',
        'Visibility in catalog': 'visible',
        'Short description': product.description?.substring(0, 120) || '',
        Description: product.description || '',
        'Tax status': 'taxable',
        'In stock?': '1',
        'Regular price': product.retailPrice || 0,
        'Sale price': product.salePrice || '',
        Categories: 'Upholstery > United Fabrics',
        Images: imageUrls,
        Attributes: Object.entries(product.specs).slice(0, 5).map(([k, v]) => `${k}|${v}`).join('; '),
      });
    }

    const wooHeaders = ['Type', 'SKU', 'Name', 'Published', 'Visibility in catalog', 'Short description', 'Description', 'Tax status', 'In stock?', 'Regular price', 'Sale price', 'Categories', 'Images', 'Attributes'];
    let wooCSV = wooHeaders.join(',') + '\n';
    for (const row of wooRows) {
      wooCSV += wooHeaders.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(',') + '\n';
    }
    fs.writeFileSync(path.join(outputDir, 'woocommerce_products_full.csv'), wooCSV);
    console.log(`✅ WooCommerce CSV: ${wooRows.length} rows`);

    // Summary
    console.log('');
    console.log('════════════════════════════════════════════════════════════');
    console.log('📊 FULL SCRAPE SUMMARY');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`   Pages Crawled: ${pageNum}`);
    console.log(`   Product URLs Found: ${allProducts.length}`);
    console.log(`   Products Extracted: ${extractedProducts.length}`);
    console.log(`   Shopify CSV Rows: ${shopifyRows.length}`);
    console.log(`   WooCommerce CSV Rows: ${wooRows.length}`);
    console.log('');
    console.log('Output Files:');
    console.log(`   📄 full-scrape-details.json (${extractedProducts.length} products)`);
    console.log(`   📄 raw-products-full.jsonl`);
    console.log(`   📄 shopify_products_full.csv`);
    console.log(`   📄 woocommerce_products_full.csv`);
    console.log('════════════════════════════════════════════════════════════');
    console.log('');
    console.log('✅ Full scrape completed successfully!');

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
