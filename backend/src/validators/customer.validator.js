import { z } from 'zod';

export const createCustomerSchema = z.object({
  companyName: z.string().min(1, 'Company Name is required'),
  contactPerson: z.string().min(1, 'Contact Person is required'),
  mobile: z.string().min(1, 'Mobile is required'),
  city: z.string().min(1, 'City is required'),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
});
