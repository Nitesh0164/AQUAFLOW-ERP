import express from 'express';
import cors from 'cors';
import { notFoundHandler } from './middleware/notFound.js';
import { errorHandler } from './middleware/error.js';
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.routes.js';
import customerRoutes from './routes/customer.routes.js';
import productRoutes from './routes/product.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import enquiryRoutes from './routes/enquiry.routes.js';
import quotationRoutes from './routes/quotation.routes.js';
import orderRoutes from './routes/order.routes.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/orders', orderRoutes);

// 404 Middleware
app.use(notFoundHandler);

// Centralized Error Middleware
app.use(errorHandler);

export default app;
