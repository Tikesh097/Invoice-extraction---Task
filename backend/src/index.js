import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';
import uploadRoutes from './routes/upload.js';
import invoiceRoutes from './routes/invoices.js';
import analyticsRoutes from './routes/analytics.js';
import formatRoutes from './routes/formats.js';
import { errorHandler } from './middleware/errorHandler.js';
import logger from './utils/logger.js';

config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Logging
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/formats', formatRoutes);

// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Invoice AI Backend running on port ${PORT}`);
});

export default app;
