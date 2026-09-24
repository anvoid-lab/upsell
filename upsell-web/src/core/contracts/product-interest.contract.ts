import { z } from "zod";

const entitySchema = z.object({
  item: z.string().min(1),
  price: z.string().min(1),
  stock: z.number().int().nonnegative().nullable(),
  is_low_stock: z.boolean(),
});

export const ProductInterestContract = {
  entitySchema,
} as const;

export type ProductInterest = z.infer<typeof entitySchema>;
