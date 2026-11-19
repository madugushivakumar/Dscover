import assert from 'assert';
import mongoose from 'mongoose';
import { setupApiTestEnv, seedTestEnv, teardownApiTestEnv } from './testHelper.js';
import Swipe from '../models/Swipe.js';
import Profile from '../models/Profile.js';

console.log('--- Running Phase 3 Swipe API Tests ---');

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
    const profileA = profiles[0];
    const profileB = profiles[1];
    const profileC = profiles[2];

    // 1. Valid like is recorded
    await step('Valid like is recorded successfully', async () => {
      const res = await request('/api/swipe', {
        method: 'POST',
        body: { profileId: profileA._id.toString(), action: 'like' }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.action, 'like');

      // Verify recorded in DB
      const dbSwipe = await Swipe.findOne({
        actorId: 'demo-user',
        targetId: profileA._id.toString()
      });
      assert.ok(dbSwipe);
      assert.strictEqual(dbSwipe.action, 'like');
    });

    // 2. Valid pass is recorded
    await step('Valid pass is recorded successfully', async () => {
      const res = await request('/api/swipe', {
        method: 'POST',
        body: { profileId: profileB._id.toString(), action: 'pass' }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.action, 'pass');
      assert.strictEqual(res.body.data.matched, false);

      // Verify recorded in DB
      const dbSwipe = await Swipe.findOne({
        actorId: 'demo-user',
        targetId: profileB._id.toString()
      });
      assert.ok(dbSwipe);
      assert.strictEqual(dbSwipe.action, 'pass');
    });

    // 3. Missing profile ID returns 400
    await step('Missing profileId returns 400', async () => {
      const res = await request('/api/swipe', {
        method: 'POST',
        body: { action: 'like' }
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error.code, 'MISSING_PROFILE_ID');
    });

    // 4. Invalid ObjectId returns 400
    await step('Invalid profileId format returns 400', async () => {
      const res = await request('/api/swipe', {
        method: 'POST',
        body: { profileId: 'invalid-id-123', action: 'like' }
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error.code, 'INVALID_PROFILE_ID');
    });

    // 5. Invalid action returns 400
    await step('Invalid action string returns 400', async () => {
      const res = await request('/api/swipe', {
        method: 'POST',
        body: { profileId: profileC._id.toString(), action: 'superlike' }
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error.code, 'INVALID_ACTION');
    });

    // 6. Missing action returns 400
    await step('Missing action returns 400', async () => {
      const res = await request('/api/swipe', {
        method: 'POST',
        body: { profileId: profileC._id.toString() }
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error.code, 'MISSING_ACTION');
    });

    // 7. Unknown profile returns 404
    await step('Unknown profile returns 404', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request('/api/swipe', {
        method: 'POST',
        body: { profileId: fakeId, action: 'like' }
      });
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error.code, 'PROFILE_NOT_FOUND');
    });

    // 8. Duplicate like returns 409
    await step('Duplicate like on same profile returns 409 Conflict', async () => {
      const res = await request('/api/swipe', {
        method: 'POST',
        body: { profileId: profileA._id.toString(), action: 'like' }
      });
      assert.strictEqual(res.status, 409);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error.code, 'DUPLICATE_SWIPE');
    });

    // 9. Duplicate pass returns 409
    await step('Duplicate pass on same profile returns 409 Conflict', async () => {
      const res = await request('/api/swipe', {
        method: 'POST',
        body: { profileId: profileB._id.toString(), action: 'pass' }
      });
      assert.strictEqual(res.status, 409);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error.code, 'DUPLICATE_SWIPE');
    });

    // 10. Like cannot be changed into pass
    await step('Attempting to change like into pass returns 409 and does not alter DB', async () => {
      const res = await request('/api/swipe', {
        method: 'POST',
        body: { profileId: profileA._id.toString(), action: 'pass' }
      });
      assert.strictEqual(res.status, 409);
      const dbSwipe = await Swipe.findOne({
        actorId: 'demo-user',
        targetId: profileA._id.toString()
      });
      assert.strictEqual(dbSwipe.action, 'like', 'Action must not be overwritten');
    });

    // 11. Pass cannot be changed into like
    await step('Attempting to change pass into like returns 409 and does not alter DB', async () => {
      const res = await request('/api/swipe', {
        method: 'POST',
        body: { profileId: profileB._id.toString(), action: 'like' }
      });
      assert.strictEqual(res.status, 409);
      const dbSwipe = await Swipe.findOne({
        actorId: 'demo-user',
        targetId: profileB._id.toString()
      });
      assert.strictEqual(dbSwipe.action, 'pass', 'Action must not be overwritten');
    });

    // 12. Request cannot override demo-user identity
    await step('Request cannot override demo-user identity via body injection', async () => {
      const res = await request('/api/swipe', {
        method: 'POST',
        body: {
          profileId: profileC._id.toString(),
          action: 'like',
          demoUserId: 'injected-user',
          userId: 'attacker-123'
        }
      });
      assert.strictEqual(res.status, 200);

      const injectedSwipe = await Swipe.findOne({ actorId: 'injected-user' });
      assert.strictEqual(injectedSwipe, null, 'Injected user must not be recorded');

      const legitSwipe = await Swipe.findOne({
        actorId: 'demo-user',
        targetId: profileC._id.toString()
      });
      assert.ok(legitSwipe);
    });

    // 13. Request cannot inject matched: true
    await step('Request cannot force matched: true via body parameters', async () => {
      const profileD = profiles[3];
      // Remove any incoming like from profileD
      await Swipe.deleteOne({ actorId: profileD._id.toString(), targetId: 'demo-user' });

      const res = await request('/api/swipe', {
        method: 'POST',
        body: {
          profileId: profileD._id.toString(),
          action: 'like',
          matched: true,
          isMatched: true
        }
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.matched, false, 'Backend must compute match status, ignoring input');
    });

    // 14. Request cannot inject arbitrary actorId or targetId
    await step('Request cannot inject arbitrary actorId or targetId', async () => {
      const profileE = profiles[4];
      const res = await request('/api/swipe', {
        method: 'POST',
        body: {
          profileId: profileE._id.toString(),
          action: 'like',
          actorId: 'fake-actor',
          targetId: 'fake-target'
        }
      });
      assert.strictEqual(res.status, 200);
      const fakeRecord = await Swipe.findOne({ actorId: 'fake-actor' });
      assert.strictEqual(fakeRecord, null);
    });

    // 15. Invalid or unexpected fields cannot manipulate database records
    await step('Unexpected fields are safely ignored and do not pollute DB', async () => {
      const profileF = profiles[5];
      const res = await request('/api/swipe', {
        method: 'POST',
        body: {
          profileId: profileF._id.toString(),
          action: 'pass',
          admin: true,
          role: 'superuser',
          $set: { hacked: true }
        }
      });
      assert.strictEqual(res.status, 200);
      const swipeDoc = await Swipe.findOne({
        actorId: 'demo-user',
        targetId: profileF._id.toString()
      }).lean();
      assert.strictEqual(swipeDoc.admin, undefined);
      assert.strictEqual(swipeDoc.role, undefined);
      assert.strictEqual(swipeDoc.hacked, undefined);
    });

    console.log(`\nSwipe API Test Results: ${passed}/${total} passed.\n`);
    process.exit(0);
  } finally {
    await teardownApiTestEnv();
  }
}

runTests().catch((err) => {
  console.error('Swipe tests failed with error:', err);
  process.exit(1);
});
