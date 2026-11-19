import { spawn } from 'child_process';
import http from 'http';
import assert from 'assert';
import { ensureMongoRunning, stopMongoProcess } from './testHelper.js';

console.log('--- Running Phase 6 End-to-End Browser & Proxy Flow Tests ---');

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const payload = options.body !== undefined
      ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body))
      : null;

    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...(options.headers || {})
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
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

    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

function waitForServer(url, timeoutMs = 20000) {
  const startTime = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      request(url)
        .then(res => {
          if (res.status >= 200 && res.status < 400) resolve(res);
          else setTimeout(check, 500);
        })
        .catch(() => {
          if (Date.now() - startTime > timeoutMs) {
            reject(new Error(`Timeout waiting for ${url}`));
          } else {
            setTimeout(check, 500);
          }
        });
    };
    check();
  });
}

async function runE2E() {
  await ensureMongoRunning();

  console.log('[E2E Flow] Spawning Backend Server on port 5000...');
  const serverProcess = spawn(process.execPath, ['server.js'], {
    cwd: 'server',
    env: { ...process.env, MONGODB_URI: 'mongodb://127.0.0.1:27018/coy_discover_api_test', PORT: '5000' },
    stdio: 'ignore',
    shell: false
  });

  console.log('[E2E Flow] Spawning Vite Frontend on port 5173...');
  const clientProcess = spawn(process.execPath, ['node_modules/vite/bin/vite.js'], {
    cwd: 'client',
    stdio: 'ignore',
    shell: false
  });

  const cleanup = () => {
    console.log('[E2E Flow] Tearing down spawned test processes...');
    try {
      if (process.platform === 'win32') {
        if (serverProcess.pid) spawn('taskkill', ['/pid', serverProcess.pid, '/f', '/t']);
        if (clientProcess.pid) spawn('taskkill', ['/pid', clientProcess.pid, '/f', '/t']);
      } else {
        serverProcess.kill('SIGTERM');
        clientProcess.kill('SIGTERM');
      }
    } catch {
      // Ignore cleanup error
    }
    stopMongoProcess();
  };

  try {
    // 1. Verify backend health
    console.log('[E2E Flow] Waiting for Backend http://localhost:5000/api/health...');
    await waitForServer('http://localhost:5000/api/health');
    console.log('[PASS] Backend HTTP server is online');

    // 2. Verify Vite dev server
    console.log('[E2E Flow] Waiting for Vite http://localhost:5173...');
    const htmlRes = await waitForServer('http://localhost:5173');
    assert.strictEqual(htmlRes.status, 200);
    assert.ok(typeof htmlRes.body === 'string' && htmlRes.body.includes('id="root"'));
    console.log('[PASS] Vite Frontend serves HTML entry page (status 200)');

    // 3. Verify Vite API Proxy to Backend /api/health
    const proxyHealth = await request('http://localhost:5173/api/health');
    assert.strictEqual(proxyHealth.status, 200);
    assert.strictEqual(proxyHealth.body.success, true);
    console.log('[PASS] Vite /api proxy successfully forwards to Express backend');

    // 4. Verify Discover Feed via Vite Proxy
    const feedRes = await request('http://localhost:5173/api/feed');
    assert.strictEqual(feedRes.status, 200);
    assert.strictEqual(feedRes.body.success, true);
    assert.ok(Array.isArray(feedRes.body.data));
    assert.ok(feedRes.body.data.length > 0);
    console.log(`[PASS] GET /api/feed via Vite proxy returns ${feedRes.body.data.length} profiles`);

    const firstProfile = feedRes.body.data[0];
    assert.ok(firstProfile._id);
    assert.ok(firstProfile.name);
    assert.ok(firstProfile.photo);

    // 5. Verify Swipe Pass via Vite Proxy
    const passRes = await request('http://localhost:5173/api/swipe', {
      method: 'POST',
      body: { profileId: firstProfile._id, action: 'pass' }
    });
    // Either 200 (if unswiped) or 409 (if already swiped in dev db)
    assert.ok(passRes.status === 200 || passRes.status === 409);
    console.log(`[PASS] POST /api/swipe via Vite proxy handled successfully (HTTP ${passRes.status})`);

    // 6. Verify Matches endpoint via Vite Proxy
    const matchesRes = await request('http://localhost:5173/api/matches');
    assert.strictEqual(matchesRes.status, 200);
    assert.strictEqual(matchesRes.body.success, true);
    assert.ok(Array.isArray(matchesRes.body.data));
    console.log(`[PASS] GET /api/matches via Vite proxy returns HTTP 200 (Count: ${matchesRes.body.data.length})`);

    console.log('\n=== All E2E Proxy & Browser Network Flow Tests Passed ===\n');
    cleanup();
    process.exit(0);
  } catch (err) {
    console.error('[E2E Flow] Error during E2E verification:', err);
    cleanup();
    process.exit(1);
  }
}

runE2E();
