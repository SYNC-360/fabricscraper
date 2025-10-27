/**
 * CSS selectors for United Fabrics site
 * These are carefully chosen with fallbacks
 */

export const selectors = {
  // Listing page
  listing: {
    productTiles: [
      'li.product a[href*="/product/"]',
      '.products .product a[href*="/product/"]',
      'a[href*="/product/"]',
    ],
    nextButton: [
      'a.next',
      'a.pagination-next',
      '[aria-label="Next"]',
      '.next-page',
    ],
  },

  // PDP (Product Detail Page)
  pdp: {
    title: [
      'h1.product_title',
      'h1.product-title',
      'h1',
    ],
    sku: [
      'span.sku',
      '.product-sku',
      'p.sku-label',
    ],
    description: [
      '.product-description',
      '.product_description',
      '.woocommerce-product-details__short-description',
      '[class*="description"]',
    ],
    price: [
      'p.price',
      'span.price',
      '.woocommerce-price-amount',
      '[itemprop="price"]',
    ],
    gallery: [
      '.woocommerce-product-gallery a',
      '.product-gallery a',
      '.product-images a[href*=".jpg"], .product-images a[href*=".png"]',
      'a[href*=".jpg"], a[href*=".png"]',
    ],
    galleryImages: [
      '.woocommerce-product-gallery img',
      '.product-gallery img',
      '.product-images img',
    ],
    specifications: [
      '.woocommerce-product-attributes',
      '.product-specs',
      'table.specifications',
      '[class*="attributes"]',
    ],
    specRows: [
      'tr',
      '.attribute-row',
      '.spec-row',
    ],
    inStock: [
      '.stock.in-stock',
      'p.in-stock',
      '[class*="in-stock"]',
    ],
  },

  // Login
  login: {
    emailInput: [
      'input[name="log"]',
      'input[type="email"]',
      'input[placeholder*="Email"]',
    ],
    passwordInput: [
      'input[name="pwd"]',
      'input[type="password"]',
      'input[placeholder*="Password"]',
    ],
    submitButton: [
      'button[type="submit"]',
      'input[type="submit"]',
      'button.login-button',
    ],
    accountHeader: [
      '.account-header',
      '.user-menu',
      '[class*="my-account"]',
      'a[href*="/my-account/"]',
    ],
  },

  // Cookies/Banners
  cookieBanner: [
    '#onetrust-accept-btn-handler',
    'button[aria-label*="Accept"]',
    '.cookie-accept',
    '#cookie-accept',
  ],
};
