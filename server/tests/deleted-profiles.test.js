import assert from 'assert';
import mongoose from 'mongoose';
import { setupApiTestEnv, seedTestEnv, teardownApiTestEnv } from './testHelper.js';
import Profile from '../models/Profile.js';
import Swipe from '../models/Swipe.js';
import Match from '../models/Match.js';
import { incomingLikeSeedKeys } from '../seed/profileData.js';

console.log('--- Running Phase 4 Deleted Profile Edge Case Tests ---');

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

    // Case A: Profile deleted before swiping
    await step('Deleted Profile Case A: Swiping on a profile deleted before request returns 404', async () => {
      const target = nonIncomingProfiles[0];
      await Profile.deleteOne({ _id: target._id });

      const res = await request('/api/swipe', {
        method: 'POST',
        body: { profileId: target._id.toString(), action: 'like' }
      });

      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error.code, 'PROFILE_NOT_FOUND');

      const swipeCount = await Swipe.countDocuments({ targetId: target._id.toString() });
      assert.strictEqual(swipeCount, 0);
    });

    // Case B: Profile deleted after a pass
    await step('Deleted Profile Case B: Profile deleted after a pass leaves feed healthy without errors', async () => {
      const target = nonIncomingProfiles[1];
      const swipeRes = await request('/api/swipe', {
        method: 'POST',
        body: { profileId: target._id.toString(), action: 'pass' }
      });
      assert.strictEqual(swipeRes.status, 200);

      // Now delete the profile
      await Profile.deleteOne({ _id: target._id });

      const feedRes = await request('/api/feed');
      assert.strictEqual(feedRes.status, 200);
      assert.ok(Array.isArray(feedRes.body.data));
      const foundInFeed = feedRes.body.data.some((p) => p._id === target._id.toString());
      assert.strictEqual(foundInFeed, false);
    });

    // Case C: Profile deleted after a one-sided like
    await step('Deleted Profile Case C: Profile deleted after one-sided like does not appear in matches or feed', async () => {
      const target = nonIncomingProfiles[2];
      const swipeRes = await request('/api/swipe', {
        method: 'POST',
        body: { profileId: target._id.toString(), action: 'like' }
      });
      assert.strictEqual(swipeRes.status, 200);

      // Now delete the profile
      await Profile.deleteOne({ _id: target._id });

      const matchesRes = await request('/api/matches');
      assert.strictEqual(matchesRes.status, 200);
      assert.strictEqual(matchesRes.body.data.length, 0);
    });

    // Case D: Profile deleted after a mutual match (Orphaned Match)
    await step('Deleted Profile Case D: Mutual match profile deleted after matching is omitted cleanly from Matches view', async () => {
      const incomingProfile = await Profile.findOne({ seedKey: incomingLikeSeedKeys[0] }).lean();

      // Form a mutual match
      const swipeRes = await request('/api/swipe', {
        method: 'POST',
        body: { profileId: incomingProfile._id.toString(), action: 'like' }
      });
      assert.strictEqual(swipeRes.body.data.matched, true);

      // Confirm match exists in matches view
      const matchesBefore = await request('/api/matches');
      assert.strictEqual(matchesBefore.body.data.length, 1);

      // Now delete the matched Profile document
      await Profile.deleteOne({ _id: incomingProfile._id });

      // Match document still exists in DB as audit record
      const matchInDb = await Match.findOne({ profileId: incomingProfile._id });
      assert.ok(matchInDb, 'Historical Match record remains in DB');

      // GET /api/matches must NOT crash or return broken null/undefined profile
      const matchesAfter = await request('/api/matches');
      assert.strictEqual(matchesAfter.status, 200);
      assert.strictEqual(matchesAfter.body.success, true);
      assert.strictEqual(
        matchesAfter.body.data.length,
        0,
        'Orphaned match without valid Profile document is safely filtered out'
      );
    });

    console.log(`\nDeleted Profile Edge Case Results: ${passed}/${total} passed.\n`);
  } finally {
    await teardownApiTestEnv();
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Deleted profile tests failed with error:', err);
    process.exit(1);
  });
