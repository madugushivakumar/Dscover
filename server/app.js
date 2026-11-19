import express from 'express';
import cors from 'cors';

// Routes
import feedRoutes from './routes/feedRoutes.js';
import swipeRoutes from './routes/swipeRoutes.js';
import matchRoutes from './routes/matchRoutes.js';

// Middleware
import notFound from './middleware/notFound.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();

// CORS Configuration
const allowedOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
app.use(
  cors({
    origin: allowedOrigin,
    credentials: true
  })
);

// Body Parser Middleware with explicit 10kb limit to prevent payload abuse
app.use(express.json({ limit: '10kb' }));

// Basic health check route (Preserved from Phase 1)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Coy Discover API is running',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Phase 3 Application API Routes
app.use('/api/feed', feedRoutes);
app.use('/api/swipe', swipeRoutes);
app.use('/api/matches', matchRoutes);

// 404 Catch-all handler
app.use(notFound);

// Centralized error handling middleware
app.use(errorHandler);

export default app;
