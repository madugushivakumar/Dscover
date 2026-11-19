import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './app.js';
import { connectDB } from './config/db.js';

// Resolve directory paths and load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PORT = process.env.PORT || 5000;

/**
 * Start the application:
 * 1. Connect to MongoDB.
 * 2. Bind HTTP server only after database connection succeeds.
 */
const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`[Coy Discover Server] Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      console.log(`[Coy Discover Server] Health check available at http://localhost:${PORT}/api/health`);
    });

    server.on('error', (error) => {
      console.error('[Coy Discover Server] HTTP server runtime error:', error.message);
      process.exit(1);
    });

    return server;
  } catch (error) {
    console.error('[Coy Discover Server] Failed to initialize server due to database error:', error.message);
    process.exit(1);
  }
};

const serverPromise = startServer();

export default serverPromise;
