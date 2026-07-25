import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import apiRouter from './routes';
import errorHandler from './middleware/error.middleware';

dotenv.config();

const app = express();

// Security and Policy configuration
app.use(helmet());
app.use(cors({
  origin: '*', // Open access during hackathon testing
  credentials: true
}));

// Parsers (Allow up to 50MB for high-resolution citizen image uploads)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// HTTP logging format matching environmental modes
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Mount routes
app.use('/api', apiRouter);

// Global Error Interception Middleware
app.use(errorHandler);

export default app;
