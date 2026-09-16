import { z } from 'zod';

export const createQuotationSchema = z.object({
  enquiryId: z.number().int().positive('Invalid enquiry ID').optional(),
  customerId: z.number().int().positive('Invalid customer ID'),
  validUntil: z.string().refine(val => !isNaN(Date.parse(val)), 'Invalid validUntil date format').optional(),
  items: z.array(z.object({
    productId: z.number().int().positive('Invalid product ID'),
    quantity: z.number().int().positive('Quantity must be greater than 0'),
    unitPrice: z.number().min(0, 'Unit price must be >= 0'),
    discountPercent: z.number().min(0, 'Discount percent must be >= 0').max(100, 'Discount percent must be <= 100'),
    gstPercent: z.number().min(0, 'GST percent must be >= 0')
  })).min(1, 'At least one item is required')
});

export const updateQuotationStatusSchema = z.object({
  status: z.enum(['SENT', 'ACCEPTED', 'REJECTED'], {
    errorMap: () => ({ message: 'Invalid status' })
  })
});
