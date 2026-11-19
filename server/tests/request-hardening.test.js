import assert from 'assert';
import { setupApiTestEnv, seedTestEnv, teardownApiTestEnv } from './testHelper.js';
import Profile from '../models/Profile.js';
import Swipe from '../models/Swipe.js';

console.log('--- Running Phase 4 Request Hardening & Input Abuse Tests ---');

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

  const { request } = await setupApiTestEnv();

  try {
    await seedTestEnv();
    const profiles = await Profile.find().lean();
    const sampleProfile = profiles[0];

    // 10.1: Missing & Malformed input checks
    await step('Hardening 10.1a: Null/undefined body is rejected with 400', async () => {
      const res = await request('/api/swipe', {
        method: 'POST',
        body: null
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
    });

    await step('Hardening 10.1b: Array instead of object is rejected with 400', async () => {
      const res = await request('/api/swipe', {
        method: 'POST',
        body: [{ profileId: sampleProfile._id.toString(), action: 'like' }]
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error.code, 'INVALID_REQUEST_BODY');
    });

    await step('Hardening 10.1c: Numeric profileId is rejected with 400', async () => {
      const res = await request('/api/swipe', {
        method: 'POST',
        body: { profileId: 123456789, action: 'like' }
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error.code, 'INVALID_PROFILE_ID');
    });

    await step('Hardening 10.1d: Uppercase action "LIKE" is rejected with 400', async () => {
      const res = await request('/api/swipe', {
        method: 'POST',
        body: { profileId: sampleProfile._id.toString(), action: 'LIKE' }
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error.code, 'INVALID_ACTION');
    });

    await step('Hardening 10.1e: Whitespace-only action is rejected with 400', async () => {
      const res = await request('/api/swipe', {
        method: 'POST',
        body: { profileId: sampleProfile._id.toString(), action: '   ' }
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error.code, 'MISSING_ACTION');
    });

    // 10.2: Unexpected field injection
    await step('Hardening 10.2: Injected fields (demoUserId, isMatched, createdAt) are safely ignored', async () => {
      const target = profiles[1];
      const res = await request('/api/swipe', {
        method: 'POST',
        body: {
          profileId: target._id.toString(),
          action: 'like',
          demoUserId: 'attacker',
          actorId: 'attacker',
          targetId: 'attacker',
          matched: true,
          isMatched: true,
          createdAt: '2099-01-01T00:00:00.000Z'
        }
      });
      assert.strictEqual(res.status, 200);

      // Verify DB record contains zero attacker attributes
      const swipeDoc = await Swipe.findOne({
        actorId: 'demo-user',
        targetId: target._id.toString()
      }).lean();

      assert.ok(swipeDoc);
      assert.strictEqual(swipeDoc.actorId, 'demo-user');
      assert.strictEqual(swipeDoc.matched, undefined);
      assert.strictEqual(swipeDoc.isMatched, undefined);
      assert.notStrictEqual(swipeDoc.createdAt.toISOString(), '2099-01-01T00:00:00.000Z');
    });

    // 10.3: Oversized request body limit (10kb)
    await step('Hardening 10.3: Oversized payload (>10kb) returns HTTP 413 Payload Too Large', async () => {
      // Build a 15kb JSON payload
      const hugePadding = 'A'.repeat(15 * 1024);
      const res = await request('/api/swipe', {
        method: 'POST',
        body: {
          profileId: sampleProfile._id.toString(),
          action: 'like',
          padding: hugePadding
        }
      });

      assert.strictEqual(res.status, 413);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error.code, 'PAYLOAD_TOO_LARGE');

      // Verify server remains healthy and answers normal requests
      const healthCheck = await request('/api/health');
      assert.strictEqual(healthCheck.status, 200);
    });

    // 10.4: Query parameter pollution
    await step('Hardening 10.4: Query parameter pollution cannot alter demo identity on feed or matches', async () => {
      const feedRes = await request('/api/feed?demoUserId=hacker&userId=hacker');
      assert.strictEqual(feedRes.status, 200);
      assert.ok(feedRes.body.data.length > 0);

      const matchesRes = await request('/api/matches?demoUserId=hacker&userId=hacker');
      assert.strictEqual(matchesRes.status, 200);
    });

    console.log(`\nRequest Hardening Test Results: ${passed}/${total} passed.\n`);
  } finally {
    await teardownApiTestEnv();
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Request hardening tests failed with error:', err);
    process.exit(1);
  });
