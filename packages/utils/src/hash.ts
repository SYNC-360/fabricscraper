import crypto from 'crypto';

/**
 * Generate a stable hash for a product URL + spec text for incremental detection.
 */
export function computeProductHash(url: string, specText: string): string {
  const combined = `${url}|${specText}`;
  return crypto.createHash('sha256').update(combined).digest('hex');
}
