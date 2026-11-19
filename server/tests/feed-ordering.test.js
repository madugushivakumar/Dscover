import assert from 'assert';
import { setupApiTestEnv, seedTestEnv, teardownApiTestEnv } from './testHelper.js';
import Profile from '../models/Profile.js';

console.log('--- Running Phase 4 Feed Ordering & Determinism Tests ---');

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

    let baselineFeedIds = [];

    // 1. Stable repeated requests without state change
    await step('Feed Ordering 9.1: Consecutive GET /api/feed calls produce 100% identical ordering', async () => {
      const res1 = await request('/api/feed');
      const res2 = await request('/api/feed');
      const res3 = await request('/api/feed');

      assert.strictEqual(res1.status, 200);
      assert.strictEqual(res2.status, 200);
      assert.strictEqual(res3.status, 200);

      const ids1 = res1.body.data.map((p) => p._id);
      const ids2 = res2.body.data.map((p) => p._id);
      const ids3 = res3.body.data.map((p) => p._id);

      assert.deepStrictEqual(ids1, ids2, 'Feed ordering changed between call 1 and call 2');
      assert.deepStrictEqual(ids2, ids3, 'Feed ordering changed between call 2 and call 3');
      baselineFeedIds = ids1;
    });

    // 2. Stable ordering after a swipe
    await step('Feed Ordering 9.2: Swiping on a profile excludes that profile and preserves relative order of remaining items', async () => {
      const targetId = baselineFeedIds[0];

      const swipeRes = await request('/api/swipe', {
        method: 'POST',
        body: { profileId: targetId, action: 'like' }
      });
      assert.strictEqual(swipeRes.status, 200);

      const resAfter = await request('/api/feed');
      assert.strictEqual(resAfter.status, 200);
      const afterIds = resAfter.body.data.map((p) => p._id);

      assert.strictEqual(afterIds.length, baselineFeedIds.length - 1);
      assert.strictEqual(afterIds.includes(targetId), false, 'Swiped profile was not excluded');

      // The remaining profiles must match baseline exactly, omitting only the swiped target
      const expectedRemaining = baselineFeedIds.filter((id) => id !== targetId);
      assert.deepStrictEqual(afterIds, expectedRemaining, 'Relative ordering of remaining profiles shifted');
    });

    // 3. Second swipe preservation
    await step('Feed Ordering 9.3: Second swipe (pass) maintains strict deterministic ordering', async () => {
      const resCurrent = await request('/api/feed');
      const currentIds = resCurrent.body.data.map((p) => p._id);
      const secondTargetId = currentIds[2]; // Swipe middle profile

      await request('/api/swipe', {
        method: 'POST',
        body: { profileId: secondTargetId, action: 'pass' }
      });

      const resNext = await request('/api/feed');
      const nextIds = resNext.body.data.map((p) => p._id);
      const expectedNext = currentIds.filter((id) => id !== secondTargetId);

      assert.deepStrictEqual(nextIds, expectedNext);
    });

    console.log(`\nFeed Ordering Test Results: ${passed}/${total} passed.\n`);
  } finally {
    await teardownApiTestEnv();
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Feed ordering tests failed with error:', err);
    process.exit(1);
  });
