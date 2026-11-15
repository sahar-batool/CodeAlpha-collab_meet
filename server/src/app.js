import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mongoSanitize from 'express-mongo-sanitize';
import { env } from './config/env.js';
import authRoutes from './routes/auth.js';
import { apiLimiter } from './middleware/rateLimiters.js';
import { notFound, errorHandler } from './middleware/error.js';

export function createApp() {
  const app = express();

  // Railway sits behind a proxy; needed for correct client IPs in rate limiting.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(
    cors({
      origin(origin, cb) {
        // Allow tools like curl (no Origin header) and the configured frontends.
        if (!origin || env.clientOrigins.includes(origin)) return cb(null, true);
        cb(new Error('Not allowed by CORS'));
      },
    })
  );
  app.use(express.json({ limit: '10kb' }));
  app.use(mongoSanitize());

  // Used by Railway's health check. Not rate limited.
  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  app.use('/api', apiLimiter);
  app.use('/api/auth', authRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}