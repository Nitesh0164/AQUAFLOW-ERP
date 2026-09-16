import { Router } from 'express';
import { getInventory } from '../controllers/inventory.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN', 'SALES'));

router.get('/', getInventory);

export default router;
