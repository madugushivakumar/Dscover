import assert from 'assert';
import { setupApiTestEnv, seedTestEnv, teardownApiTestEnv } from './testHelper.js';
import Profile from '../models/Profile.js';
import Swipe from '../models/Swipe.js';
import Match from '../models/Match.js';
import { incomingLikeSeedKeys } from '../seed/profileData.js';

console.log('--- Running Phase 4 Concurrency & Race-Condition Tests ---');

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

    const nonIncomingProfiles = await Profile.find({
      seedKey: { $nin: incomingLikeSeedKeys }
    }).lean();

    // 5.1: Two simultaneous identical requests
    await step('Concurrency 5.1: Two simultaneous identical swipes -> 1 succeeds (200), 1 conflicts (409), 1 DB record', async () => {
      const target = nonIncomingProfiles[0];
      const payload = { profileId: target._id.toString(), action: 'like' };

      const [res1, res2] = await Promise.all([
        request('/api/swipe', { method: 'POST', body: payload }),
        request('/api/swipe', { method: 'POST', body: payload })
      ]);

      const statuses = [res1.status, res2.status].sort();
      assert.deepStrictEqual(statuses, [200, 409], `Expected statuses [200, 409] but got [${statuses.join(', ')}]`);

      // Verify exact DB state
      const dbSwipes = await Swipe.find({ actorId: 'demo-user', targetId: target._id.toString() });
      assert.strictEqual(dbSwipes.length, 1, 'Expected exactly one Swipe document in MongoDB');
    });

    // 5.2a: Five simultaneous identical requests
    await step('Concurrency 5.2a: 5 simultaneous identical swipes -> 1 succeeds (200), 4 conflict (409), 1 DB record', async () => {
      const target = nonIncomingProfiles[1];
      const payload = { profileId: target._id.toString(), action: 'pass' };

      const results = await Promise.all(
        Array.from({ length: 5 }, () =>
          request('/api/swipe', { method: 'POST', body: payload })
        )
      );

      const successCount = results.filter((r) => r.status === 200).length;
      const conflictCount = results.filter((r) => r.status === 409).length;

      assert.strictEqual(successCount, 1, `Expected 1 success, got ${successCount}`);
      assert.strictEqual(conflictCount, 4, `Expected 4 conflicts, got ${conflictCount}`);

      const dbSwipes = await Swipe.find({ actorId: 'demo-user', targetId: target._id.toString() });
      assert.strictEqual(dbSwipes.length, 1, 'Expected exactly 1 Swipe document in MongoDB');
    });

    // 5.2b: Ten simultaneous identical requests
    await step('Concurrency 5.2b: 10 simultaneous identical swipes -> 1 succeeds (200), 9 conflict (409), 1 DB record', async () => {
      const target = nonIncomingProfiles[2];
      const payload = { profileId: target._id.toString(), action: 'like' };

      const results = await Promise.all(
        Array.from({ length: 10 }, () =>
          request('/api/swipe', { method: 'POST', body: payload })
        )
      );

      const successCount = results.filter((r) => r.status === 200).length;
      const conflictCount = results.filter((r) => r.status === 409).length;

      assert.strictEqual(successCount, 1, `Expected 1 success, got ${successCount}`);
      assert.strictEqual(conflictCount, 9, `Expected 9 conflicts, got ${conflictCount}`);

      const dbSwipes = await Swipe.find({ actorId: 'demo-user', targetId: target._id.toString() });
      assert.strictEqual(dbSwipes.length, 1, 'Expected exactly 1 Swipe document in MongoDB');
    });

    // 5.3: Concurrent swipes on different profiles
    await step('Concurrency 5.3: Concurrent swipes on different profiles all succeed without cross-interference', async () => {
      const batch = nonIncomingProfiles.slice(3, 8); // 5 distinct profiles
      const results = await Promise.all(
        batch.map((p, idx) =>
          request('/api/swipe', {
            method: 'POST',
            body: {
              profileId: p._id.toString(),
              action: idx % 2 === 0 ? 'like' : 'pass'
            }
          })
        )
      );

      for (const res of results) {
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.success, true);
      }

      for (const p of batch) {
        const count = await Swipe.countDocuments({
          actorId: 'demo-user',
          targetId: p._id.toString()
        });
        assert.strictEqual(count, 1);
      }
    });

    // 5.4: Concurrent mutual likes on multiple incoming profiles
    await step('Concurrency 5.4: Concurrent mutual likes on multiple incoming profiles create matches without duplication', async () => {
      const incomingProfiles = await Profile.find({
        seedKey: { $in: incomingLikeSeedKeys.slice(0, 4) }
      }).lean();

      const results = await Promise.all(
        incomingProfiles.map((p) =>
          request('/api/swipe', {
            method: 'POST',
            body: { profileId: p._id.toString(), action: 'like' }
          })
        )
      );

      for (const res of results) {
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.data.matched, true);
      }

      for (const p of incomingProfiles) {
        const matchCount = await Match.countDocuments({
          demoUserId: 'demo-user',
          profileId: p._id
        });
        assert.strictEqual(matchCount, 1, `Expected exactly 1 Match for profile ${p.name}`);
      }
    });

    // 5.5: Concurrent attempts to create the same Match record
    await step('Concurrency 5.5: Concurrent direct match upserts produce exactly 1 Match document in MongoDB', async () => {
      const sampleProfile = nonIncomingProfiles[10];

      await Promise.all(
        Array.from({ length: 5 }, () =>
          Match.findOneAndUpdate(
            { demoUserId: 'demo-user', profileId: sampleProfile._id },
            { $setOnInsert: { demoUserId: 'demo-user', profileId: sampleProfile._id } },
            { upsert: true, returnDocument: 'after' }
          )
        )
      );

      const matchCount = await Match.countDocuments({
        demoUserId: 'demo-user',
        profileId: sampleProfile._id
      });
      assert.strictEqual(matchCount, 1, 'Expected only one unique Match record in DB');
    });

    console.log(`\nConcurrency Test Results: ${passed}/${total} passed.\n`);
  } finally {
    await teardownApiTestEnv();
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Concurrency tests failed with error:', err);
    process.exit(1);
  });
