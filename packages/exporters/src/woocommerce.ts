import { writeToPath } from 'fast-csv';
import { Product, ProductSchema } from '@packages/schemas';
import { logger } from '@packages/utils';

interface WooCommerceRow {
  'Type': string;
  'SKU': string;
  'Name': string;
  'Published': string;
  'Visibility in catalog': string;
  'Short description': string;
  'Description': string;
  'Tax status': string;
  'In stock?': string;
  'Regular price': number;
  'Sale price': number | '';
  'Categories': string;
  'Images': string;
  'Attributes': string;
}

export async function exportWooCommerce(
  products: Product[],
  filePath: string
): Promise<void> {
  const rows: WooCommerceRow[] = [];
  let skippedCount = 0;

  for (const product of products) {
    try {
      ProductSchema.parse(product);
    } catch (err) {
      logger.warn({ product, error: String(err) }, 'Skipping invalid product in WooCommerce export');
      skippedCount++;
      continue;
    }

    const imageUrls = product.images.map((img) => img.src).join('|');

    // Build attributes from product details
    const attributes: string[] = [];
    attributes.push('Brand|United Fabrics');
    if (product.collection) attributes.push(`Collection|${product.collection}`);
    if (product.color) attributes.push(`Color|${product.color}`);
    if (product.details.content) attributes.push(`Content|${product.details.content}`);
    if (product.details.width) attributes.push(`Width|${product.details.width}`);
    if (product.details.patternRepeat)
      attributes.push(`Pattern Repeat|${product.details.patternRepeat}`);
    if (product.details.abrasion) attributes.push(`Abrasion|${product.details.abrasion}`);
    if (product.details.backing) attributes.push(`Backing|${product.details.backing}`);
    if (product.details.fireRating)
      attributes.push(`Fire Rating|${product.details.fireRating}`);
    if (product.details.countryOfOrigin)
      attributes.push(`Country of Origin|${product.details.countryOfOrigin}`);
    if (product.details.cleaningCode)
      attributes.push(`Cleaning Code|${product.details.cleaningCode}`);
    if (product.details.railroaded)
      attributes.push(`Railroaded|${product.details.railroaded}`);

    // Extract first paragraph for short description
    const htmlStrip = product.descriptionHtml || '';
    const firstParagraph = htmlStrip
      .split(/<[^>]+>/)[0]
      .slice(0, 120)
      .trim();

    rows.push({
      'Type': 'simple',
      'SKU': product.sku,
      'Name': product.title,
      'Published': '1',
      'Visibility in catalog': 'visible',
      'Short description': firstParagraph,
      'Description': htmlStrip,
      'Tax status': 'taxable',
      'In stock?': product.inStock ? '1' : '0',
      'Regular price': product.retailPrice || 0,
      'Sale price': product.salePrice ? product.salePrice : '',
      'Categories': 'Upholstery > United Fabrics',
      'Images': imageUrls,
      'Attributes': attributes.join('; '),
    });
  }

  if (skippedCount > 0) {
    logger.info({ skippedCount }, `Skipped ${skippedCount} invalid products in WooCommerce export`);
  }

  return new Promise((resolve, reject) => {
    writeToPath(filePath, rows, { headers: true })
      .on('error', (err) => {
        logger.error({ error: String(err) }, 'Error writing WooCommerce CSV');
        reject(err);
      })
      .on('finish', () => {
        logger.info({ filePath, count: rows.length }, 'WooCommerce CSV exported');
        resolve();
      });
  });
}
