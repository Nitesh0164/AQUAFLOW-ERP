import { z } from 'zod';

export const createDispatchSchema = z.object({
  dispatchDate: z.string().refine(val => !isNaN(Date.parse(val)), 'Invalid dispatch date format').optional(),
  vehicleNumber: z.string().min(1, 'Vehicle number is required'),
  driverName: z.string().min(1, 'Driver name is required')
});
