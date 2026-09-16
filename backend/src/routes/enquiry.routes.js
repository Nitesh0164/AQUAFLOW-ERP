import { Router } from 'express';
import { createEnquiry, getEnquiries, getEnquiryById } from '../controllers/enquiry.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN', 'SALES'));

router.post('/', createEnquiry);
router.get('/', getEnquiries);
router.get('/:id', getEnquiryById);

export default router;
