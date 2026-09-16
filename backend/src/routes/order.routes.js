import { Router } from 'express';
import { getOrders, getOrderById, confirmOrder, dispatchOrder } from '../controllers/order.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN', 'SALES'));

router.get('/', getOrders);
router.get('/:id', getOrderById);

// Override router-level auth explicitly for these highly sensitive endpoints
router.post('/:id/confirm', authorize('ADMIN'), confirmOrder);
router.post('/:id/dispatch', authorize('ADMIN'), dispatchOrder);

export default router;
