/**
 * Compute sale and retail prices from wholesale price.
 * sale = wholesale * 2.5
 * retail = wholesale * 3.25
 */
export function computePrices(wholesale: number | null): {
  salePrice: number | null;
  retailPrice: number | null;
} {
  if (wholesale === null) {
    return { salePrice: null, retailPrice: null };
  }
  return {
    salePrice: Number((wholesale * 2.5).toFixed(2)),
    retailPrice: Number((wholesale * 3.25).toFixed(2)),
  };
}
