/**
 * Normalize raw spec keys from the site to canonical field names.
 */
const SPEC_MAP: Record<string, string> = {
  'content': 'content',
  'fiber': 'content',
  'composition': 'content',
  'width': 'width',
  'width (inches)': 'width',
  'pattern repeat': 'patternRepeat',
  'pattern': 'patternRepeat',
  'abrasion': 'abrasion',
  'rubs': 'abrasion',
  'backing': 'backing',
  'back': 'backing',
  'fire rating': 'fireRating',
  'rating': 'fireRating',
  'country of origin': 'countryOfOrigin',
  'origin': 'countryOfOrigin',
  'cleaning code': 'cleaningCode',
  'clean': 'cleaningCode',
  'railroaded': 'railroaded',
  'usage': 'usage',
};

export function normalizeSpecKey(rawKey: string): string | undefined {
  const normalized = rawKey.toLowerCase().trim();
  return SPEC_MAP[normalized];
}
