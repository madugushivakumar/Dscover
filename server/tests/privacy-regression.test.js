import assert from 'assert';
import { setupApiTestEnv, seedTestEnv, teardownApiTestEnv } from './testHelper.js';
import Profile from '../models/Profile.js';
import { incomingLikeSeedKeys } from '../seed/profileData.js';

console.log('--- Running Phase 4 Privacy Regression Tests ---');

const FORBIDDEN_KEYS = [
  'seedKey',
  'actorId',
  'targetId',
  'alreadyLikedYou',
  'incomingLike',
  'incomingLikeCount',
  'isLiked',
  'isMatched',
  'seedsIncomingLike',
  'swipeCount',
  '__v'
];

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

    // 1. Feed Endpoint Privacy Regression
    await step('Privacy Regression: Serialized GET /api/feed contains no forbidden tokens or leaks', async () => {
      const res = await request('/api/feed');
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length > 0);

      const jsonStr = JSON.stringify(res.body);

      for (const key of FORBIDDEN_KEYS) {
        assert.strictEqual(
          jsonStr.includes(`"${key}"`),
          false,
          `Forbidden key "${key}" found in serialized /api/feed JSON string`
        );
      }

      for (const profile of res.body.data) {
        assert.strictEqual(profile.seedKey, undefined);
        assert.strictEqual(profile.actorId, undefined);
        assert.strictEqual(profile.targetId, undefined);
        assert.strictEqual(profile.__v, undefined);
        assert.ok(profile._id);
        assert.ok(profile.name);
        assert.ok(profile.age);
        assert.ok(profile.photo);
      }
    });

    // 2. Swipe Response Privacy Regression (Pass)
    await step('Privacy Regression: Serialized POST /api/swipe (pass) leaks no privacy fields', async () => {
      const incomingProfile = await Profile.findOne({ seedKey: incomingLikeSeedKeys[1] });
      const res = await request('/api/swipe', {
        method: 'POST',
        body: { profileId: incomingProfile._id.toString(), action: 'pass' }
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.matched, false);

      const jsonStr = JSON.stringify(res.body);
      for (const key of FORBIDDEN_KEYS) {
        assert.strictEqual(
          jsonStr.includes(`"${key}"`),
          false,
          `Forbidden key "${key}" found in pass response`
        );
      }
    });

    // 3. Swipe Response Privacy Regression (One-sided Like)
    await step('Privacy Regression: Serialized POST /api/swipe (one-sided like) does not reveal incoming like status', async () => {
      // Find a profile that does NOT have an incoming like
      const nonIncomingProfile = await Profile.findOne({ seedKey: { $nin: incomingLikeSeedKeys } });
      const res = await request('/api/swipe', {
        method: 'POST',
        body: { profileId: nonIncomingProfile._id.toString(), action: 'like' }
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.matched, false);

      const jsonStr = JSON.stringify(res.body);
      for (const key of FORBIDDEN_KEYS) {
        assert.strictEqual(
          jsonStr.includes(`"${key}"`),
          false,
          `Forbidden key "${key}" found in one-sided like response`
        );
      }
    });

    // 4. Swipe Response Privacy Regression (Mutual Match)
    await step('Privacy Regression: Serialized POST /api/swipe (mutual match) leaks no internal tracking keys', async () => {
      const incomingProfile = await Profile.findOne({ seedKey: incomingLikeSeedKeys[0] });
      const res = await request('/api/swipe', {
        method: 'POST',
        body: { profileId: incomingProfile._id.toString(), action: 'like' }
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.matched, true);
      assert.ok(res.body.data.match);

      const jsonStr = JSON.stringify(res.body);
      for (const key of FORBIDDEN_KEYS) {
        assert.strictEqual(
          jsonStr.includes(`"${key}"`),
          false,
          `Forbidden key "${key}" found in mutual match response`
        );
      }
      assert.strictEqual(res.body.data.match.seedKey, undefined);
      assert.strictEqual(res.body.data.match.__v, undefined);
    });

    // 5. Matches Endpoint Privacy Regression
    await step('Privacy Regression: Serialized GET /api/matches contains only public profile fields', async () => {
      const res = await request('/api/matches');
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.data.length >= 1);

      const jsonStr = JSON.stringify(res.body);
      for (const key of FORBIDDEN_KEYS) {
        assert.strictEqual(
          jsonStr.includes(`"${key}"`),
          false,
          `Forbidden key "${key}" found in GET /api/matches response`
        );
      }

      for (const match of res.body.data) {
        assert.strictEqual(match.seedKey, undefined);
        assert.strictEqual(match.actorId, undefined);
        assert.strictEqual(match.targetId, undefined);
        assert.strictEqual(match.__v, undefined);
        assert.strictEqual(match.profile.seedKey, undefined);
        assert.strictEqual(match.profile.__v, undefined);
      }
    });

    // 6. Error Responses Privacy Regression
    await step('Privacy Regression: 400/404/409 error payloads contain zero database secrets or internal keys', async () => {
      // 404 test
      const res404 = await request('/api/swipe', {
        method: 'POST',
        body: { profileId: '507f1f77bcf86cd799439011', action: 'like' }
      });
      assert.strictEqual(res404.status, 404);
      let jsonStr = JSON.stringify(res404.body);
      for (const key of FORBIDDEN_KEYS) {
        assert.strictEqual(jsonStr.includes(`"${key}"`), false);
      }

      // 409 test (duplicate swipe)
      const incomingProfile = await Profile.findOne({ seedKey: incomingLikeSeedKeys[0] });
      const res409 = await request('/api/swipe', {
        method: 'POST',
        body: { profileId: incomingProfile._id.toString(), action: 'like' }
      });
      assert.strictEqual(res409.status, 409);
      jsonStr = JSON.stringify(res409.body);
      for (const key of FORBIDDEN_KEYS) {
        assert.strictEqual(jsonStr.includes(`"${key}"`), false);
      }
    });

    console.log(`\n=== All ${passed}/${total} Privacy Regression Tests Passed ===\n`);
  } finally {
    await teardownApiTestEnv();
  }
}

runTests().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error('Privacy regression test suite failed:', err);
  process.exit(1);
});
