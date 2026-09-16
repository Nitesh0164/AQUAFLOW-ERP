import { Router } from 'express';
import { getOrders, getOrderById, confirmOrder } from '../controllers/order.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN', 'SALES'));

router.get('/', getOrders);
router.get('/:id', getOrderById);

// Override router-level auth explicitly for this highly sensitive endpoint
router.post('/:id/confirm', authorize('ADMIN'), confirmOrder);

export default router;
