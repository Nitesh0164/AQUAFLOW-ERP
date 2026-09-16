import { Router } from 'express';
import { getProducts } from '../controllers/product.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN', 'SALES'));

router.get('/', getProducts);

export default router;
