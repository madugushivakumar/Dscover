import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import app from '../app.js';
import { connectDB, disconnectDB } from '../config/db.js';
import Profile from '../models/Profile.js';
import Swipe from '../models/Swipe.js';
import Match from '../models/Match.js';
import { seedDatabase } from '../seed/seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_PORT = 5002;
const TEST_MONGO_PORT = 27018;
const TEST_MONGO_URI = process.env.TEST_MONGODB_URI || `mongodb://127.0.0.1:${TEST_MONGO_PORT}/coy_discover_api_test`;
const MONGO_BIN = 'C:\\Program Files\\MongoDB\\Server\\8.0\\bin\\mongod.exe';
const TEMP_DB_PATH = path.resolve(__dirname, '../../.temp_db/mongo_api_test');

let activeMongodProcess = null;
let activeHttpServer = null;

/**
 * Checks if a TCP port is open and accepting connections.
 */
async function isPortOpen(port, timeoutMs = 1500) {
  return new Promise((resolve) => {
    import('net').then(({ default: net }) => {
      const socket = new net.Socket();
      socket.setTimeout(timeoutMs);

      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });

      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });

      socket.connect(port, '127.0.0.1');
    });
  });
}

/**
 * Launches local mongod instance if not already running on TEST_MONGO_PORT.
 */
export async function ensureMongoRunning() {
  const alreadyRunning = await isPortOpen(TEST_MONGO_PORT);
  if (alreadyRunning) {
    return null;
  }

  if (!fs.existsSync(TEMP_DB_PATH)) {
    fs.mkdirSync(TEMP_DB_PATH, { recursive: true });
  }

  const mongod = spawn(MONGO_BIN, [
    '--dbpath', TEMP_DB_PATH,
    '--port', String(TEST_MONGO_PORT),
    '--bind_ip', '127.0.0.1'
  ], {
    stdio: 'ignore',
    shell: false
  });

  // Wait up to 10 seconds for mongod to accept connections
  const start = Date.now();
  while (Date.now() - start < 10000) {
    if (await isPortOpen(TEST_MONGO_PORT)) {
      activeMongodProcess = mongod;
      return mongod;
    }
    await new Promise((r) => setTimeout(r, 400));
  }

  throw new Error(`Failed to start mongod on port ${TEST_MONGO_PORT} within timeout`);
}

/**
 * Starts test HTTP server and connects to test database.
 */
export async function setupApiTestEnv() {
  await ensureMongoRunning();
  await connectDB(TEST_MONGO_URI);

  // Sync model indexes
  await Profile.syncIndexes();
  await Swipe.syncIndexes();
  await Match.syncIndexes();

  if (!activeHttpServer) {
    await new Promise((resolve, reject) => {
      activeHttpServer = app.listen(TEST_PORT, () => {
        resolve(activeHttpServer);
      });
      activeHttpServer.on('error', reject);
    });
  }

  const baseUrl = `http://127.0.0.1:${TEST_PORT}`;

  const request = async (route, options = {}) => {
    const { default: http } = await import('http');
    return new Promise((resolve, reject) => {
      const url = new URL(`${baseUrl}${route}`);
      const payload = options.body !== undefined
        ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body))
        : null;

      const reqOptions = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...(options.headers || {})
        }
      };

      const clientReq = http.request(reqOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch {
            json = data;
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: json
          });
        });
      });

      clientReq.on('error', reject);

      if (payload) {
        clientReq.write(payload);
      }
      clientReq.end();
    });
  };

  return {
    baseUrl,
    request,
    TEST_MONGO_URI
  };
}

/**
 * Resets all test collections in the test database.
 */
export async function resetTestDb() {
  await Profile.deleteMany({});
  await Swipe.deleteMany({});
  await Match.deleteMany({});
}

/**
 * Seeds test database with mock profiles and incoming likes.
 */
export async function seedTestEnv(demoUserId = 'demo-user') {
  await resetTestDb();
  return seedDatabase({
    uri: TEST_MONGO_URI,
    demoUserId,
    quiet: true
  });
}

/**
 * Cleanly shuts down the HTTP server and Mongoose connection.
 */
export async function teardownApiTestEnv() {
  if (activeHttpServer) {
    if (typeof activeHttpServer.closeIdleConnections === 'function') {
      activeHttpServer.closeIdleConnections();
    }
    if (typeof activeHttpServer.closeAllConnections === 'function') {
      activeHttpServer.closeAllConnections();
    }
    await new Promise((resolve) => activeHttpServer.close(resolve));
    activeHttpServer = null;
  }

  await disconnectDB();
}

/**
 * Terminates the child mongod process if one was started.
 */
export function stopMongoProcess() {
  if (activeMongodProcess) {
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(activeMongodProcess.pid), '/f', '/t']);
      } else {
        activeMongodProcess.kill('SIGTERM');
      }
    } catch {
      // ignore
    }
    activeMongodProcess = null;
  }
}
