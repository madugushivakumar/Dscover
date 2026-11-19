import assert from 'assert';
import { setupApiTestEnv, seedTestEnv, teardownApiTestEnv } from './testHelper.js';
import Swipe from '../models/Swipe.js';
import Profile from '../models/Profile.js';
import { incomingLikeSeedKeys } from '../seed/profileData.js';

console.log('--- Running Phase 3 Feed API Tests ---');

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
    // Seed fresh test database
    await seedTestEnv();

    // 1. Returns HTTP 200
    await step('Feed endpoint returns HTTP 200', async () => {
      const res = await request('/api/feed');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
    });

    // 2. Initially contains eligible profiles
    let initialProfiles = [];
    await step('Feed initially contains eligible profiles (36 mock profiles)', async () => {
      const res = await request('/api/feed');
      assert.ok(Array.isArray(res.body.data));
      assert.strictEqual(res.body.data.length, 36);
      assert.strictEqual(res.body.meta.count, 36);
      assert.strictEqual(res.body.meta.hasMore, false);
      initialProfiles = res.body.data;
    });

    // 3. Profiles have all required public fields
    await step('Profiles have all required public fields', async () => {
      for (const p of initialProfiles) {
        assert.ok(p._id, 'Missing _id');
        assert.ok(p.name, 'Missing name');
        assert.ok(typeof p.age === 'number', 'Age must be number');
        assert.ok(p.photo, 'Missing photo');
        assert.ok(p.bio, 'Missing bio');
        assert.ok(p.city, 'Missing city');
        assert.ok(Array.isArray(p.interests) && p.interests.length >= 3, 'Interests must have >= 3 items');
      }
    });

    // 4. seedKey is not exposed
    await step('Profile seedKey is not exposed in feed', async () => {
      for (const p of initialProfiles) {
        assert.strictEqual(p.seedKey, undefined, `seedKey exposed on profile ${p.name}`);
      }
    });

    // 5. Incoming-like status is not exposed
    await step('Incoming-like status (alreadyLikedYou, incomingLike, etc.) is not exposed', async () => {
      for (const p of initialProfiles) {
        assert.strictEqual(p.alreadyLikedYou, undefined);
        assert.strictEqual(p.incomingLike, undefined);
        assert.strictEqual(p.isLiked, undefined);
        assert.strictEqual(p.isMatched, undefined);
      }
    });

    // 6. Incoming-like count is not exposed
    await step('Incoming-like count is not exposed in response', async () => {
      assert.strictEqual(initialProfiles[0].incomingLikeCount, undefined);
      const res = await request('/api/feed');
      assert.strictEqual(res.body.meta.incomingLikeCount, undefined);
      assert.strictEqual(res.body.meta.likesReceived, undefined);
    });

    // 7. Raw Swipe fields are not exposed
    await step('Raw Swipe fields (actorId, targetId, action) are not exposed', async () => {
      for (const p of initialProfiles) {
        assert.strictEqual(p.actorId, undefined);
        assert.strictEqual(p.targetId, undefined);
        assert.strictEqual(p.action, undefined);
      }
    });

    // 8. Profile liked by the demo user is excluded from feed
    await step('Profile liked by the demo user is excluded from subsequent feed calls', async () => {
      const profileToLike = initialProfiles[0];
      await Swipe.create({
        actorId: 'demo-user',
        targetId: profileToLike._id,
        action: 'like'
      });

      const res = await request('/api/feed');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.length, 35);
      const found = res.body.data.some((p) => p._id === profileToLike._id);
      assert.strictEqual(found, false, 'Liked profile was not excluded from feed');
    });

    // 9. Profile passed by the demo user is excluded from feed
    await step('Profile passed by the demo user is excluded from subsequent feed calls', async () => {
      const profileToPass = initialProfiles[1];
      await Swipe.create({
        actorId: 'demo-user',
        targetId: profileToPass._id,
        action: 'pass'
      });

      const res = await request('/api/feed');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.length, 34);
      const found = res.body.data.some((p) => p._id === profileToPass._id);
      assert.strictEqual(found, false, 'Passed profile was not excluded from feed');
    });

    // 10. Profile with an incoming like but no outgoing swipe remains in the feed
    await step('Profile with an incoming like but no outgoing swipe remains discoverable in the feed', async () => {
      // Find an incoming like profile that has not been swiped on by demo user
      const incomingProfileDoc = await Profile.findOne({ seedKey: incomingLikeSeedKeys[4] });
      assert.ok(incomingProfileDoc);

      const res = await request('/api/feed');
      const found = res.body.data.some((p) => p._id === incomingProfileDoc._id.toString());
      assert.strictEqual(
        found,
        true,
        'Profile with incoming like should remain in the feed until swiped on by demo user'
      );
    });

    // 11. Feed returns an empty array when all profiles have been swiped on
    await step('Feed returns empty array and 200 status when all profiles swiped on', async () => {
      const allProfiles = await Profile.find().select('_id');
      for (const p of allProfiles) {
        await Swipe.updateOne(
          { actorId: 'demo-user', targetId: p._id.toString() },
          { $setOnInsert: { actorId: 'demo-user', targetId: p._id.toString(), action: 'pass' } },
          { upsert: true }
        );
      }

      const res = await request('/api/feed');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.deepStrictEqual(res.body.data, []);
      assert.strictEqual(res.body.meta.count, 0);
      assert.strictEqual(res.body.meta.hasMore, false);
      assert.strictEqual(res.body.message, "You've discovered everyone for now.");
    });

    // 12. Feed does not reveal which profiles liked the demo user
    await step('Feed does not leak any indicator of incoming likers', async () => {
      await seedTestEnv();
      const res = await request('/api/feed');
      const responseText = JSON.stringify(res.body);

      assert.strictEqual(responseText.includes('alreadyLikedYou'), false);
      assert.strictEqual(responseText.includes('incomingLike'), false);
      assert.strictEqual(responseText.includes('likedYou'), false);
    });

    console.log(`\nFeed API Test Results: ${passed}/${total} passed.\n`);
    process.exit(0);
  } finally {
    await teardownApiTestEnv();
  }
}

runTests().catch((err) => {
  console.error('Feed tests failed with error:', err);
  process.exit(1);
});
