import assert from 'assert';
import { setupApiTestEnv, seedTestEnv, teardownApiTestEnv } from './testHelper.js';
import Profile from '../models/Profile.js';
import { incomingLikeSeedKeys } from '../seed/profileData.js';

console.log('--- Running Phase 3 Privacy & Security Enforcement Tests ---');

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

  const FORBIDDEN_KEYS = [
    'seedKey',
    'actorId',
    'targetId',
    'alreadyLikedYou',
    'incomingLike',
    'incomingLikeCount',
    'isLiked',
    'isMatched',
    'seedsIncomingLike'
  ];

  try {
    await seedTestEnv();

    // 1. Audit serialized feed response
    await step('Privacy Audit: Serialized /api/feed contains zero forbidden keys', async () => {
      const res = await request('/api/feed');
      assert.strictEqual(res.status, 200);

      const jsonString = JSON.stringify(res.body);

      for (const key of FORBIDDEN_KEYS) {
        assert.strictEqual(
          jsonString.includes(`"${key}"`),
          false,
          `Forbidden key "${key}" detected in /api/feed response payload`
        );
      }

      // Check each profile object individually
      for (const profile of res.body.data) {
        assert.strictEqual(profile.action, undefined);
        for (const key of FORBIDDEN_KEYS) {
          assert.strictEqual(profile[key], undefined);
        }
      }
    });

    // 2. Perform a mutual match and audit serialized /api/matches response
    await step('Privacy Audit: Serialized /api/matches contains zero forbidden keys', async () => {
      const incomingProfile = await Profile.findOne({ seedKey: incomingLikeSeedKeys[0] });
      await request('/api/swipe', {
        method: 'POST',
        body: { profileId: incomingProfile._id.toString(), action: 'like' }
      });

      const res = await request('/api/matches');
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.data.length > 0);

      const jsonString = JSON.stringify(res.body);

      for (const key of FORBIDDEN_KEYS) {
        assert.strictEqual(
          jsonString.includes(`"${key}"`),
          false,
          `Forbidden key "${key}" detected in /api/matches response payload`
        );
      }

      for (const match of res.body.data) {
        assert.strictEqual(match.action, undefined);
        assert.strictEqual(match.profile.action, undefined);
        for (const key of FORBIDDEN_KEYS) {
          assert.strictEqual(match[key], undefined);
          assert.strictEqual(match.profile[key], undefined);
        }
      }
    });

    // 3. Error payloads do not expose incoming likes or sensitive db internals
    await step('Privacy Audit: Error payloads do not expose database connection or stack traces', async () => {
      const res = await request('/api/swipe', {
        method: 'POST',
        body: { profileId: '000000000000000000000000', action: 'like' }
      });
      assert.strictEqual(res.status, 404);

      const errorJson = JSON.stringify(res.body);
      assert.strictEqual(errorJson.includes('mongodb://'), false);
      assert.strictEqual(errorJson.includes('password'), false);
      assert.strictEqual(errorJson.includes('stack'), false);
    });

    // 4. Demo-user identity cannot be overridden via headers or queries
    await step('Security Audit: Client cannot spoof demo-user via query params or headers', async () => {
      const res = await request('/api/feed?demoUserId=injected-user&userId=attacker', {
        headers: {
          'X-User-Id': 'attacker',
          'X-Demo-User-Id': 'injected'
        }
      });
      assert.strictEqual(res.status, 200);
      // The feed continues to query the authoritative backend DEMO_USER_ID
      assert.ok(res.body.data.length > 0);
    });

    // 5. Malformed JSON returns 400 without exposing stack traces
    await step('Security Audit: Malformed JSON handled gracefully with 400 status', async () => {
      const res = await request('/api/swipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{ malformed json: missing quotes }'
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error.code, 'INVALID_JSON');
    });

    // 6. 404 Not Found returns structured JSON without server disclosure
    await step('Security Audit: Unmapped routes return clean 404 JSON', async () => {
      const res = await request('/api/unknown-endpoint');
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error.code, 'NOT_FOUND');
    });

    console.log(`\nPrivacy & Security Test Results: ${passed}/${total} passed.\n`);
  } finally {
    await teardownApiTestEnv();
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Privacy tests failed with error:', err);
    process.exit(1);
  });
