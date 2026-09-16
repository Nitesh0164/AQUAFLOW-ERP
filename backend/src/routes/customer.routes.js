import { Router } from 'express';
import { createCustomer, getCustomers, getCustomerById } from '../controllers/customer.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN', 'SALES'));

router.post('/', createCustomer);
router.get('/', getCustomers);
router.get('/:id', getCustomerById);

export default router;
