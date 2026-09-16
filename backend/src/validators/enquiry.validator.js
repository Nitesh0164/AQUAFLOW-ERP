import { z } from 'zod';

export const createEnquirySchema = z.object({
  customerId: z.number().int().positive('Invalid customer ID'),
  requiredDate: z.string().refine(val => !isNaN(Date.parse(val)), 'Invalid requiredDate format'),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.number().int().positive('Invalid product ID'),
    quantity: z.number().int().positive('Quantity must be greater than 0')
  })).min(1, 'At least one item is required')
});
