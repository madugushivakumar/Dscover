import { spawn } from 'child_process';
import http from 'http';

function waitForServer(url, timeoutMs = 15000) {
  const startTime = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      fetch(url)
        .then(res => {
          if (res.ok) resolve();
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

async function runTest() {
  console.log('[E2E Test] Starting backend on port 5000...');
  const serverProcess = spawn('node', ['server.js'], {
    cwd: 'server',
    stdio: 'inherit',
    shell: true
  });

  console.log('[E2E Test] Starting Vite frontend on port 5173...');
  const clientProcess = spawn('npm', ['run', 'dev'], {
    cwd: 'client',
    stdio: 'inherit',
    shell: true
  });

  const cleanup = () => {
    console.log('[E2E Test] Cleaning up child processes...');
    try {
      if (process.platform === 'win32') {
        if (serverProcess.pid) spawn('taskkill', ['/pid', serverProcess.pid, '/f', '/t']);
        if (clientProcess.pid) spawn('taskkill', ['/pid', clientProcess.pid, '/f', '/t']);
      } else {
        serverProcess.kill('SIGTERM');
        clientProcess.kill('SIGTERM');
      }
    } catch (e) {
      // Ignore cleanup error
    }
  };

  try {
    console.log('[E2E Test] Waiting for backend to be ready at http://localhost:5000/api/health...');
    await waitForServer('http://localhost:5000/api/health');
    console.log('[E2E Test] Backend is ready!');

    console.log('[E2E Test] Waiting for Vite server to be ready at http://localhost:5173...');
    await waitForServer('http://localhost:5173');
    console.log('[E2E Test] Vite server is ready!');

    console.log('[E2E Test] Testing proxy: Fetching http://localhost:5173/api/health via Vite...');
    const proxyRes = await fetch('http://localhost:5173/api/health');
    const proxyData = await proxyRes.json();
    console.log('[E2E Test] Proxy response received:', JSON.stringify(proxyData, null, 2));

    if (proxyRes.status === 200 && proxyData.success === true && proxyData.message === 'Coy Discover API is running') {
      console.log('[E2E Test] PASS: Vite proxy successfully forwarded /api/health to Express backend!');
      cleanup();
      process.exit(0);
    } else {
      console.error('[E2E Test] FAIL: Unexpected response from proxy');
      cleanup();
      process.exit(1);
    }
  } catch (err) {
    console.error('[E2E Test] Error during proxy verification:', err.message);
    cleanup();
    process.exit(1);
  }
}

runTest();
