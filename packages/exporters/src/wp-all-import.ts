import { writeToPath } from 'fast-csv';
import { Product, ProductSchema } from '@packages/schemas';
import { logger } from '@packages/utils';

interface WPAIRow {
  'post_title': string;
  'post_content': string;
  'sku': string;
  'regular_price': number;
  'sale_price': number | '';
  'images': string;
  'brand': string;
  'collection': string;
  'color': string;
  'categories': string;
  'tags': string;
  'meta_width': string;
  'meta_abrasion': string;
  'meta_pattern_repeat': string;
  'meta_backing': string;
  'meta_fire_rating': string;
  'meta_country_of_origin': string;
  'meta_cleaning_code': string;
  'meta_railroaded': string;
  'meta_usage': string;
  'meta_content': string;
}

export async function exportWPAllImport(
  products: Product[],
  filePath: string
): Promise<void> {
  const rows: WPAIRow[] = [];
  let skippedCount = 0;

  for (const product of products) {
    try {
      ProductSchema.parse(product);
    } catch (err) {
      logger.warn({ product, error: String(err) }, 'Skipping invalid product in WP All Import export');
      skippedCount++;
      continue;
    }

    // Images as newline-separated URLs (WPAI can fetch remote)
    const imageUrls = product.images.map((img) => img.src).join('\n');

    rows.push({
      'post_title': product.title,
      'post_content': product.descriptionHtml || '',
      'sku': product.sku,
      'regular_price': product.retailPrice || 0,
      'sale_price': product.salePrice ? product.salePrice : '',
      'images': imageUrls,
      'brand': 'United Fabrics',
      'collection': product.collection || '',
      'color': product.color || '',
      'categories': product.categories.join(','),
      'tags': product.tags.join(','),
      'meta_width': product.details.width || '',
      'meta_abrasion': product.details.abrasion || '',
      'meta_pattern_repeat': product.details.patternRepeat || '',
      'meta_backing': product.details.backing || '',
      'meta_fire_rating': product.details.fireRating || '',
      'meta_country_of_origin': product.details.countryOfOrigin || '',
      'meta_cleaning_code': product.details.cleaningCode || '',
      'meta_railroaded': product.details.railroaded || '',
      'meta_usage': product.details.usage ? product.details.usage.join(',') : '',
      'meta_content': product.details.content || '',
    });
  }

  if (skippedCount > 0) {
    logger.info({ skippedCount }, `Skipped ${skippedCount} invalid products in WP All Import export`);
  }

  return new Promise((resolve, reject) => {
    writeToPath(filePath, rows, { headers: true })
      .on('error', (err) => {
        logger.error({ error: String(err) }, 'Error writing WP All Import CSV');
        reject(err);
      })
      .on('finish', () => {
        logger.info({ filePath, count: rows.length }, 'WP All Import CSV exported');
        resolve();
      });
  });
}
