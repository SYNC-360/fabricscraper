import { z } from 'zod';

export const ProductSchema = z.object({
  url: z.string().url(),
  sku: z.string().min(1),
  title: z.string(),
  collection: z.string().optional(),
  color: z.string().optional(),
  brand: z.literal('United Fabrics'),
  descriptionHtml: z.string().optional(),
  details: z
    .object({
      content: z.string().optional(), // e.g., 100% Polyester
      width: z.string().optional(),
      patternRepeat: z.string().optional(),
      abrasion: z.string().optional(),
      backing: z.string().optional(),
      fireRating: z.string().optional(),
      countryOfOrigin: z.string().optional(),
      cleaningCode: z.string().optional(),
      railroaded: z.string().optional(),
      usage: z.array(z.string()).optional(),
    })
    .partial(),
  categories: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  wholesalePrice: z.number().nullable(),
  salePrice: z.number().nullable(),
  retailPrice: z.number().nullable(),
  images: z.array(
    z.object({
      src: z.string().url(),
      position: z.number(),
      alt: z.string().optional(),
    })
  ),
  inStock: z.boolean().optional(),
  lastSeen: z.string(), // ISO date
});

export type Product = z.infer<typeof ProductSchema>;
