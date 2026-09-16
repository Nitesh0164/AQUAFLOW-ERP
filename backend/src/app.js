import express from 'express';
import cors from 'cors';
import { notFoundHandler } from './middleware/notFound.js';
import { errorHandler } from './middleware/error.js';
import healthRoutes from './routes/health.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', healthRoutes);

// 404 Middleware
app.use(notFoundHandler);

// Centralized Error Middleware
app.use(errorHandler);

export default app;
