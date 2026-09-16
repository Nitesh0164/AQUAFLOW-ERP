import { Router } from 'express';
import { createQuotation, getQuotations, getQuotationById, updateQuotationStatus, convertQuotationToOrder } from '../controllers/quotation.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN', 'SALES'));

router.post('/', createQuotation);
router.get('/', getQuotations);
router.get('/:id', getQuotationById);
router.patch('/:id/status', updateQuotationStatus);
router.post('/:id/convert', convertQuotationToOrder);

export default router;
