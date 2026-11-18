import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './app.js';

// Resolve current directory and load .env from server dir or root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`[Coy Discover Server] Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`[Coy Discover Server] Health check available at http://localhost:${PORT}/api/health`);
});

server.on('error', (error) => {
  console.error('[Coy Discover Server] Failed to start server:', error.message);
  process.exit(1);
});

export default server;
