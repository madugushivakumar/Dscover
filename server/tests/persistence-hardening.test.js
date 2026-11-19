import assert from 'assert';
import http from 'node:http';
import mongoose from 'mongoose';
import { setupApiTestEnv, seedTestEnv, teardownApiTestEnv } from './testHelper.js';
import app from '../app.js';
import Profile from '../models/Profile.js';
import Swipe from '../models/Swipe.js';
import Match from '../models/Match.js';
import { incomingLikeSeedKeys } from '../seed/profileData.js';

console.log('--- Running Phase 4 Persistence & Restart Hardening Tests ---');

function httpRequest(serverPort, path, options = {}) {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: '127.0.0.1',
      port: serverPort,
      path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let body;
        try {
          body = JSON.parse(data);
        } catch {
          body = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body });
      });
    });

    req.on('error', reject);

    if (options.body) {
      const payload = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      req.write(payload);
    }
    req.end();
  });
}

async function runTests() {
  let passed = 0;
  let total = 0;

  async function step(name, fn) {
    total++;
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err.message);
      throw err;
    }
  }

  // Setup initial test env
  const { request: initialRequest } = await setupApiTestEnv();

  try {
    await seedTestEnv();

    let passedProfileId;
    let oneSidedLikeProfileId;
    let mutualLikeProfileId;
    let feedRemainingBeforeRestart;
    let feedProfilesBeforeRestart;

    // 1. Create state before restart
    await step('State Setup: Record pass, one-sided like, and mutual match before restart', async () => {
      // Find non-incoming profiles
      const nonIncoming = await Profile.find({ seedKey: { $nin: incomingLikeSeedKeys } }).limit(2);
      const incomingProfile = await Profile.findOne({ seedKey: incomingLikeSeedKeys[0] });

      passedProfileId = nonIncoming[0]._id.toString();
      oneSidedLikeProfileId = nonIncoming[1]._id.toString();
      mutualLikeProfileId = incomingProfile._id.toString();

      // Pass
      const passRes = await initialRequest('/api/swipe', {
        method: 'POST',
        body: { profileId: passedProfileId, action: 'pass' }
      });
      assert.strictEqual(passRes.status, 200);

      // One-sided like
      const likeRes = await initialRequest('/api/swipe', {
        method: 'POST',
        body: { profileId: oneSidedLikeProfileId, action: 'like' }
      });
      assert.strictEqual(likeRes.status, 200);
      assert.strictEqual(likeRes.body.data.matched, false);

      // Mutual like
      const mutualRes = await initialRequest('/api/swipe', {
        method: 'POST',
        body: { profileId: mutualLikeProfileId, action: 'like' }
      });
      assert.strictEqual(mutualRes.status, 200);
      assert.strictEqual(mutualRes.body.data.matched, true);

      // Fetch feed
      const feedRes = await initialRequest('/api/feed');
      assert.strictEqual(feedRes.status, 200);
      feedRemainingBeforeRestart = feedRes.body.data.length;
      feedProfilesBeforeRestart = feedRes.body.data.map(p => p._id);

      assert.strictEqual(feedRemainingBeforeRestart, 36 - 3); // 33 remaining
    });

    let newRequest;

    // 2. Simulate Backend Server Restart
    await step('Simulation: Terminate HTTP server and reboot fresh server instance', async () => {
      await teardownApiTestEnv();
      const rebooted = await setupApiTestEnv();
      newRequest = rebooted.request;
    });

    // 3. Verify Feed State Post-Restart
    await step('Persistence Verification: Feed excludes all swiped profiles identically post-restart', async () => {
      const feedRes = await newRequest('/api/feed');
      assert.strictEqual(feedRes.status, 200);
      assert.strictEqual(feedRes.body.data.length, feedRemainingBeforeRestart);

      const currentIds = feedRes.body.data.map(p => p._id);
      assert.deepStrictEqual(currentIds, feedProfilesBeforeRestart);

      // Ensure swiped profiles do not appear
      assert.strictEqual(currentIds.includes(passedProfileId), false);
      assert.strictEqual(currentIds.includes(oneSidedLikeProfileId), false);
      assert.strictEqual(currentIds.includes(mutualLikeProfileId), false);
    });

    // 4. Verify Matches State Post-Restart
    await step('Persistence Verification: Confirmed mutual matches persist intact post-restart', async () => {
      const matchRes = await newRequest('/api/matches');
      assert.strictEqual(matchRes.status, 200);
      assert.strictEqual(matchRes.body.data.length, 1);
      assert.strictEqual(matchRes.body.data[0].profile._id, mutualLikeProfileId);
    });

    // 5. Verify Idempotency and Conflict Rejection Post-Restart
    await step('Persistence Verification: Re-swiping on previously swiped profiles returns 409 Conflict post-restart', async () => {
      const duplicateRes = await newRequest('/api/swipe', {
        method: 'POST',
        body: { profileId: passedProfileId, action: 'like' }
      });
      assert.strictEqual(duplicateRes.status, 409);
      assert.strictEqual(duplicateRes.body.error?.code, 'DUPLICATE_SWIPE');
    });

    // 6. Verify Database Document Integrity
    await step('Persistence Verification: Zero duplicate swipes or matches in underlying database', async () => {
      const demoSwipes = await Swipe.find({ actorId: 'demo-user' });
      assert.strictEqual(demoSwipes.length, 3);

      const demoMatches = await Match.find({ demoUserId: 'demo-user' });
      assert.strictEqual(demoMatches.length, 1);
    });

    console.log(`\n=== All ${passed}/${total} Persistence Hardening Tests Passed ===\n`);
  } finally {
    await teardownApiTestEnv();
  }
}

runTests().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error('Persistence hardening test suite failed:', err);
  process.exit(1);
});
