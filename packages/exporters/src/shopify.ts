import { writeToPath } from 'fast-csv';
import { Product, ProductSchema } from '@packages/schemas';
import { generateHandle } from '@packages/utils';
import { logger } from '@packages/utils';

interface ShopifyRow {
  'Handle': string;
  'Title': string;
  'Body (HTML)': string;
  'Vendor': string;
  'Product Category': string;
  'Tags': string;
  'Published': string;
  'Option1 Name': string;
  'Option1 Value': string;
  'Variant SKU': string;
  'Variant Price': number;
  'Variant Requires Shipping': string;
  'Variant Taxable': string;
  'Image Src': string;
  'Image Position': number;
  'Status': string;
}

export async function exportShopify(
  products: Product[],
  filePath: string,
  priceField: 'retailPrice' | 'salePrice' = 'retailPrice'
): Promise<void> {
  const rows: ShopifyRow[] = [];
  let skippedCount = 0;

  for (const product of products) {
    try {
      ProductSchema.parse(product);
    } catch (err) {
      logger.warn({ product, error: String(err) }, 'Skipping invalid product in Shopify export');
      skippedCount++;
      continue;
    }

    const handle = generateHandle(product.title, product.color);
    const price = product[priceField] || 0;

    // Create one row per image; if no images, create one row with empty image src
    if (product.images.length > 0) {
      for (const image of product.images) {
        rows.push({
          'Handle': handle,
          'Title': product.title,
          'Body (HTML)': product.descriptionHtml || '',
          'Vendor': 'United Fabrics',
          'Product Category': 'Upholstery Fabric',
          'Tags': product.tags.join(','),
          'Published': 'TRUE',
          'Option1 Name': 'Default Title',
          'Option1 Value': 'Default Title',
          'Variant SKU': product.sku,
          'Variant Price': price,
          'Variant Requires Shipping': 'TRUE',
          'Variant Taxable': 'TRUE',
          'Image Src': image.src,
          'Image Position': image.position,
          'Status': 'active',
        });
      }
    } else {
      rows.push({
        'Handle': handle,
        'Title': product.title,
        'Body (HTML)': product.descriptionHtml || '',
        'Vendor': 'United Fabrics',
        'Product Category': 'Upholstery Fabric',
        'Tags': product.tags.join(','),
        'Published': 'TRUE',
        'Option1 Name': 'Default Title',
        'Option1 Value': 'Default Title',
        'Variant SKU': product.sku,
        'Variant Price': price,
        'Variant Requires Shipping': 'TRUE',
        'Variant Taxable': 'TRUE',
        'Image Src': '',
        'Image Position': 0,
        'Status': 'active',
      });
    }
  }

  if (skippedCount > 0) {
    logger.info({ skippedCount }, `Skipped ${skippedCount} invalid products in Shopify export`);
  }

  return new Promise((resolve, reject) => {
    writeToPath(filePath, rows, { headers: true })
      .on('error', (err) => {
        logger.error({ error: String(err) }, 'Error writing Shopify CSV');
        reject(err);
      })
      .on('finish', () => {
        logger.info({ filePath, count: rows.length }, 'Shopify CSV exported');
        resolve();
      });
  });
}
