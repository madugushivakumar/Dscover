import assert from 'assert';
import { setupApiTestEnv, seedTestEnv, teardownApiTestEnv } from './testHelper.js';
import Profile from '../models/Profile.js';
import Swipe from '../models/Swipe.js';
import Match from '../models/Match.js';
import { incomingLikeSeedKeys } from '../seed/profileData.js';

console.log('--- Running Phase 3 Full API Lifecycle & Persistence Integration Tests ---');

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

  let testEnv = await setupApiTestEnv();

  try {
    // ========================================================
    // Scenario 1: First-time discovery
    // ========================================================
    await step('Scenario 1: First-time discovery - fresh seed, feed populated, incoming likes secret', async () => {
      await seedTestEnv();

      const feedRes = await testEnv.request('/api/feed');
      assert.strictEqual(feedRes.status, 200);
      assert.strictEqual(feedRes.body.data.length, 36);

      const matchesRes = await testEnv.request('/api/matches');
      assert.strictEqual(matchesRes.status, 200);
      assert.strictEqual(matchesRes.body.data.length, 0);

      // Verify incoming likes are private
      const json = JSON.stringify(feedRes.body);
      assert.strictEqual(json.includes('alreadyLikedYou'), false);
    });

    // ========================================================
    // Scenario 2: Pass a profile
    // ========================================================
    const nonLikerProfiles = await Profile.find({
      seedKey: { $nin: incomingLikeSeedKeys }
    }).lean();
    const profileToPass = nonLikerProfiles[0];

    await step('Scenario 2: Pass a profile - excluded from feed, absent from matches', async () => {
      const passRes = await testEnv.request('/api/swipe', {
        method: 'POST',
        body: { profileId: profileToPass._id.toString(), action: 'pass' }
      });
      assert.strictEqual(passRes.status, 200);
      assert.strictEqual(passRes.body.data.action, 'pass');
      assert.strictEqual(passRes.body.data.matched, false);

      // Verify excluded from feed
      const feedRes = await testEnv.request('/api/feed');
      assert.strictEqual(feedRes.body.data.length, 35);
      const isPresentInFeed = feedRes.body.data.some((p) => p._id === profileToPass._id.toString());
      assert.strictEqual(isPresentInFeed, false);

      // Verify absent from matches
      const matchesRes = await testEnv.request('/api/matches');
      assert.strictEqual(matchesRes.body.data.length, 0);
    });

    // ========================================================
    // Scenario 3: Like without a match (one-sided like)
    // ========================================================
    const profileToOneSideLike = nonLikerProfiles[1];

    await step('Scenario 3: One-sided like - matched: false, absent from matches', async () => {
      const likeRes = await testEnv.request('/api/swipe', {
        method: 'POST',
        body: { profileId: profileToOneSideLike._id.toString(), action: 'like' }
      });
      assert.strictEqual(likeRes.status, 200);
      assert.strictEqual(likeRes.body.data.action, 'like');
      assert.strictEqual(likeRes.body.data.matched, false);
      assert.strictEqual(likeRes.body.data.profile._id, profileToOneSideLike._id.toString());

      // Verify excluded from feed
      const feedRes = await testEnv.request('/api/feed');
      assert.strictEqual(feedRes.body.data.length, 34);

      // Verify absent from matches
      const matchesRes = await testEnv.request('/api/matches');
      assert.strictEqual(matchesRes.body.data.length, 0);
    });

    // ========================================================
    // Scenario 4: Create a mutual match
    // ========================================================
    const incomingProfile = await Profile.findOne({ seedKey: incomingLikeSeedKeys[0] }).lean();

    await step('Scenario 4: Mutual like - matched: true, appears in matches', async () => {
      const matchRes = await testEnv.request('/api/swipe', {
        method: 'POST',
        body: { profileId: incomingProfile._id.toString(), action: 'like' }
      });
      assert.strictEqual(matchRes.status, 200);
      assert.strictEqual(matchRes.body.data.matched, true);
      assert.strictEqual(matchRes.body.data.match.profileId, incomingProfile._id.toString());

      // Verify excluded from feed
      const feedRes = await testEnv.request('/api/feed');
      assert.strictEqual(feedRes.body.data.length, 33);

      // Verify appears in matches
      const matchesRes = await testEnv.request('/api/matches');
      assert.strictEqual(matchesRes.status, 200);
      assert.strictEqual(matchesRes.body.data.length, 1);
      assert.strictEqual(matchesRes.body.data[0].profile._id, incomingProfile._id.toString());
    });

    // ========================================================
    // Scenario 5: Duplicate request protection
    // ========================================================
    await step('Scenario 5: Duplicate request returns 409 and creates zero duplicate records', async () => {
      const dupRes = await testEnv.request('/api/swipe', {
        method: 'POST',
        body: { profileId: incomingProfile._id.toString(), action: 'like' }
      });
      assert.strictEqual(dupRes.status, 409);
      assert.strictEqual(dupRes.body.success, false);
      assert.strictEqual(dupRes.body.error.code, 'DUPLICATE_SWIPE');

      // Verify only 1 swipe and 1 match exist in DB
      const swipeCount = await Swipe.countDocuments({
        actorId: 'demo-user',
        targetId: incomingProfile._id.toString()
      });
      assert.strictEqual(swipeCount, 1);

      const matchCount = await Match.countDocuments({
        demoUserId: 'demo-user',
        profileId: incomingProfile._id
      });
      assert.strictEqual(matchCount, 1);
    });

    // ========================================================
    // Scenario 6: Restart persistence
    // ========================================================
    await step('Scenario 6: Persistence across server restart - feeds and matches remain intact', async () => {
      // Teardown and simulate complete backend reboot
      await teardownApiTestEnv();

      // Restart test environment
      testEnv = await setupApiTestEnv();

      // Verify feed still excludes the 3 swiped profiles
      const feedRes = await testEnv.request('/api/feed');
      assert.strictEqual(feedRes.status, 200);
      assert.strictEqual(feedRes.body.data.length, 33);

      // Verify matches still contains the established mutual match
      const matchesRes = await testEnv.request('/api/matches');
      assert.strictEqual(matchesRes.status, 200);
      assert.strictEqual(matchesRes.body.data.length, 1);
      assert.strictEqual(matchesRes.body.data[0].profile._id, incomingProfile._id.toString());
    });

    console.log(`\nAPI Lifecycle & Persistence Integration Results: ${passed}/${total} passed.\n`);
    process.exit(0);
  } finally {
    await teardownApiTestEnv();
  }
}

runTests().catch((err) => {
  console.error('Lifecycle tests failed with error:', err);
  process.exit(1);
});
