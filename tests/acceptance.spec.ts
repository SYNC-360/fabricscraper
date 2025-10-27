import { describe, it, expect, beforeAll } from 'vitest';
import { chromium } from 'playwright';
import { Product, ProductSchema } from '@packages/schemas';
import { parsePDP, loginToSite, acceptCookies } from '../apps/scraper/src/crawler';
import {
  computePrices,
  generateHandle,
  normalizeSpecKey,
  computeProductHash,
} from '@packages/utils';
import { exportShopify, exportWooCommerce, exportWPAllImport } from '@packages/exporters';
import fs from 'fs/promises';
import path from 'path';

describe('Acceptance Tests', () => {
  describe('Price Computation', () => {
    it('should compute sale and retail prices from wholesale', () => {
      const { salePrice, retailPrice } = computePrices(100);
      expect(salePrice).toBe(250);
      expect(retailPrice).toBe(325);
    });

    it('should handle null wholesale price', () => {
      const { salePrice, retailPrice } = computePrices(null);
      expect(salePrice).toBeNull();
      expect(retailPrice).toBeNull();
    });

    it('should round to 2 decimals', () => {
      const { salePrice, retailPrice } = computePrices(12.34);
      expect(salePrice).toBe(30.85);
      expect(retailPrice).toBe(40.11);
    });
  });

  describe('Slug Generation', () => {
    it('should generate valid Shopify handle from title', () => {
      const handle = generateHandle('Premium Cotton Fabric');
      expect(handle).toBe('premium-cotton-fabric');
    });

    it('should include color in handle', () => {
      const handle = generateHandle('Cotton Blend', 'Navy Blue');
      expect(handle).toBe('cotton-blend-navy-blue');
    });

    it('should remove special characters', () => {
      const handle = generateHandle('Deluxe Fabric & Co.', 'Red/Orange');
      expect(handle).toContain('deluxe');
      expect(handle).not.toContain('&');
      expect(handle).not.toContain('.');
    });
  });

  describe('Spec Key Normalization', () => {
    it('should normalize common spec keys', () => {
      expect(normalizeSpecKey('fiber')).toBe('content');
      expect(normalizeSpecKey('composition')).toBe('content');
      expect(normalizeSpecKey('width (inches)')).toBe('width');
      expect(normalizeSpecKey('pattern repeat')).toBe('patternRepeat');
      expect(normalizeSpecKey('country of origin')).toBe('countryOfOrigin');
    });

    it('should return undefined for unknown keys', () => {
      expect(normalizeSpecKey('unknown-key')).toBeUndefined();
    });

    it('should be case-insensitive', () => {
      expect(normalizeSpecKey('WIDTH')).toBe('width');
      expect(normalizeSpecKey('Backing')).toBe('backing');
    });
  });

  describe('Product Hash', () => {
    it('should generate consistent hash for same input', () => {
      const hash1 = computeProductHash('https://example.com/product/123', 'specs text');
      const hash2 = computeProductHash('https://example.com/product/123', 'specs text');
      expect(hash1).toBe(hash2);
    });

    it('should generate different hash for different input', () => {
      const hash1 = computeProductHash('https://example.com/product/123', 'specs text 1');
      const hash2 = computeProductHash('https://example.com/product/123', 'specs text 2');
      expect(hash1).not.toBe(hash2);
    });

    it('should generate hex string', () => {
      const hash = computeProductHash('https://example.com', 'text');
      expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true); // SHA256 = 64 chars
    });
  });

  describe('Product Schema Validation', () => {
    it('should validate a complete product', () => {
      const product: Product = {
        url: 'https://example.com/product/123',
        sku: 'SKU-123',
        title: 'Cotton Fabric',
        color: 'Red',
        collection: 'Premium',
        brand: 'United Fabrics',
        descriptionHtml: '<p>Beautiful fabric</p>',
        details: {
          content: '100% Cotton',
          width: '54 inches',
          patternRepeat: '2 inches',
        },
        categories: ['Upholstery'],
        tags: ['soft', 'durable'],
        wholesalePrice: 50,
        salePrice: 125,
        retailPrice: 162.5,
        images: [
          { src: 'https://example.com/image1.jpg', position: 1, alt: 'Front' },
          { src: 'https://example.com/image2.jpg', position: 2, alt: 'Back' },
        ],
        inStock: true,
        lastSeen: new Date().toISOString(),
      };

      expect(() => ProductSchema.parse(product)).not.toThrow();
    });

    it('should require url and sku', () => {
      const invalid = {
        title: 'Fabric',
        brand: 'United Fabrics' as const,
        images: [],
        lastSeen: new Date().toISOString(),
      };

      expect(() => ProductSchema.parse(invalid)).toThrow();
    });

    it('should enforce brand literal', () => {
      const invalid = {
        url: 'https://example.com',
        sku: 'SKU',
        title: 'Fabric',
        brand: 'Some Other Brand',
        images: [],
        lastSeen: new Date().toISOString(),
      };

      expect(() => ProductSchema.parse(invalid)).toThrow();
    });
  });

  describe('CSV Export Formats', () => {
    it('should export Shopify format with required headers', async () => {
      const products: Product[] = [
        {
          url: 'https://example.com/product/1',
          sku: 'SKU-001',
          title: 'Test Fabric',
          brand: 'United Fabrics',
          details: {},
          categories: [],
          tags: ['test'],
          wholesalePrice: 50,
          salePrice: 125,
          retailPrice: 162.5,
          images: [{ src: 'https://example.com/img1.jpg', position: 1 }],
          lastSeen: new Date().toISOString(),
        },
      ];

      const tempFile = path.join('/tmp', `shopify-${Date.now()}.csv`);
      await exportShopify(products, tempFile);

      const content = await fs.readFile(tempFile, 'utf-8');
      expect(content).toContain('Handle');
      expect(content).toContain('Title');
      expect(content).toContain('Variant SKU');
      expect(content).toContain('Vendor');

      await fs.unlink(tempFile);
    });

    it('should export WooCommerce format with required headers', async () => {
      const products: Product[] = [
        {
          url: 'https://example.com/product/1',
          sku: 'SKU-001',
          title: 'Test Fabric',
          brand: 'United Fabrics',
          details: {},
          categories: [],
          tags: [],
          wholesalePrice: 50,
          salePrice: 125,
          retailPrice: 162.5,
          images: [],
          lastSeen: new Date().toISOString(),
        },
      ];

      const tempFile = path.join('/tmp', `woo-${Date.now()}.csv`);
      await exportWooCommerce(products, tempFile);

      const content = await fs.readFile(tempFile, 'utf-8');
      expect(content).toContain('Type');
      expect(content).toContain('SKU');
      expect(content).toContain('Regular price');
      expect(content).toContain('Categories');

      await fs.unlink(tempFile);
    });

    it('should export WP All Import format with all metadata columns', async () => {
      const products: Product[] = [
        {
          url: 'https://example.com/product/1',
          sku: 'SKU-001',
          title: 'Test Fabric',
          color: 'Navy',
          collection: 'Premium',
          brand: 'United Fabrics',
          details: {
            content: '100% Polyester',
            width: '54"',
            abrasion: '50,000 rubs',
          },
          categories: ['Upholstery'],
          tags: ['durable'],
          wholesalePrice: 50,
          salePrice: 125,
          retailPrice: 162.5,
          images: [
            { src: 'https://example.com/img1.jpg', position: 1 },
            { src: 'https://example.com/img2.jpg', position: 2 },
          ],
          lastSeen: new Date().toISOString(),
        },
      ];

      const tempFile = path.join('/tmp', `wpai-${Date.now()}.csv`);
      await exportWPAllImport(products, tempFile);

      const content = await fs.readFile(tempFile, 'utf-8');
      expect(content).toContain('post_title');
      expect(content).toContain('meta_width');
      expect(content).toContain('meta_abrasion');
      expect(content).toContain('meta_color');
      expect(content).toContain('images');

      await fs.unlink(tempFile);
    });
  });

  describe('Sample Data Generation', () => {
    it('should create valid sample products with all fields populated', () => {
      const samples: Product[] = [
        {
          url: 'https://www.unitedfabrics.com/product/sunbrella-sol-canvas',
          sku: 'UF-SUN-001',
          title: 'Sunbrella Canvas',
          color: 'Canvas Natural',
          collection: 'Sunbrella',
          brand: 'United Fabrics',
          descriptionHtml: '<p>Premium Sunbrella fabric for outdoor use</p>',
          details: {
            content: '100% Solution-Dyed Acrylic',
            width: '54 inches',
            patternRepeat: 'N/A',
            abrasion: '200,000 rubs',
            backing: 'Woven',
            fireRating: 'Pass',
            countryOfOrigin: 'USA',
            cleaningCode: 'Mild Soap & Water',
            railroaded: 'No',
          },
          categories: ['Outdoor', 'Performance'],
          tags: ['outdoor', 'waterproof', 'uv-resistant'],
          wholesalePrice: 25,
          salePrice: 62.5,
          retailPrice: 81.25,
          images: [
            {
              src: 'https://www.unitedfabrics.com/images/sunbrella-canvas-natural-full.jpg',
              position: 1,
              alt: 'Sunbrella Canvas Natural',
            },
            {
              src: 'https://www.unitedfabrics.com/images/sunbrella-canvas-natural-detail.jpg',
              position: 2,
              alt: 'Detail View',
            },
          ],
          inStock: true,
          lastSeen: new Date().toISOString(),
        },
        {
          url: 'https://www.unitedfabrics.com/product/mohair-luxury-blend',
          sku: 'UF-MOH-042',
          title: 'Luxury Mohair Blend',
          color: 'Charcoal',
          collection: 'Premium Upholstery',
          brand: 'United Fabrics',
          descriptionHtml: '<p>Sumptuous mohair blend for luxury interiors</p>',
          details: {
            content: '45% Mohair, 35% Wool, 20% Silk',
            width: '56 inches',
            patternRepeat: '3.5 inches',
            abrasion: '150,000 rubs',
            backing: 'Cotton',
            fireRating: 'FR Certified',
            countryOfOrigin: 'Belgium',
            cleaningCode: 'Dry Clean Only',
            railroaded: 'Yes',
            usage: ['Upholstery', 'Curtains'],
          },
          categories: ['Upholstery', 'Luxury'],
          tags: ['mohair', 'blend', 'luxury'],
          wholesalePrice: 75,
          salePrice: 187.5,
          retailPrice: 243.75,
          images: [
            {
              src: 'https://www.unitedfabrics.com/images/mohair-charcoal-main.jpg',
              position: 1,
              alt: 'Mohair Blend Charcoal',
            },
          ],
          inStock: true,
          lastSeen: new Date().toISOString(),
        },
        {
          url: 'https://www.unitedfabrics.com/product/cotton-damask-classic',
          sku: 'UF-COT-156',
          title: 'Classic Cotton Damask',
          color: 'Ivory',
          collection: 'Traditional',
          brand: 'United Fabrics',
          descriptionHtml: '<p>Timeless damask pattern in fine cotton</p>',
          details: {
            content: '100% Cotton',
            width: '54 inches',
            patternRepeat: '5 inches',
            abrasion: '50,000 rubs',
            backing: 'Woven',
            fireRating: 'Standard',
            countryOfOrigin: 'India',
            cleaningCode: 'Gentle Clean',
            railroaded: 'No',
          },
          categories: ['Traditional', 'Residential'],
          tags: ['cotton', 'damask', 'classic'],
          wholesalePrice: 15,
          salePrice: 37.5,
          retailPrice: 48.75,
          images: [
            {
              src: 'https://www.unitedfabrics.com/images/damask-ivory-full.jpg',
              position: 1,
              alt: 'Damask Pattern',
            },
            {
              src: 'https://www.unitedfabrics.com/images/damask-ivory-close.jpg',
              position: 2,
              alt: 'Close-up',
            },
          ],
          inStock: true,
          lastSeen: new Date().toISOString(),
        },
      ];

      // Validate all samples
      samples.forEach((sample) => {
        expect(() => ProductSchema.parse(sample)).not.toThrow();
      });

      // Verify required fields present
      samples.forEach((sample) => {
        expect(sample.sku).toBeTruthy();
        expect(sample.title).toBeTruthy();
        expect(sample.images.length).toBeGreaterThan(0);
        expect(sample.wholesalePrice).toBeGreaterThan(0);
        expect(sample.salePrice).toBeGreaterThan(sample.wholesalePrice);
        expect(sample.retailPrice).toBeGreaterThan(sample.salePrice);
      });
    });
  });
});
