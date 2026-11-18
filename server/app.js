import express from 'express';
import cors from 'cors';

const app = express();

// Middleware
const allowedOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
app.use(cors({
  origin: allowedOrigin,
  credentials: true
}));

app.use(express.json());

// Basic health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Coy Discover API is running',
    environment: process.env.NODE_ENV || 'development'
  });
});

export default app;
