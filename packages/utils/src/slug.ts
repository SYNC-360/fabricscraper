/**
 * Generate a Shopify-compatible handle (slug) from title and optional color.
 */
export function generateHandle(title: string, color?: string): string {
  const base = title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
  if (color) {
    const colorSlug = color.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
    return `${base}-${colorSlug}`.substring(0, 255);
  }
  return base.substring(0, 255);
}
