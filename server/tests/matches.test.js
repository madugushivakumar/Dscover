import assert from 'assert';
import { setupApiTestEnv, seedTestEnv, teardownApiTestEnv } from './testHelper.js';
import Swipe from '../models/Swipe.js';
import Match from '../models/Match.js';
import Profile from '../models/Profile.js';
import { incomingLikeSeedKeys } from '../seed/profileData.js';

console.log('--- Running Phase 3 Matches API & Mutual Matching Logic Tests ---');

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

    // 1. Returns empty matches when no matches exist
    await step('Matches endpoint returns 200 with empty array when no matches exist', async () => {
      const res = await request('/api/matches');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.deepStrictEqual(res.body.data, []);
      assert.strictEqual(res.body.meta.count, 0);
      assert.strictEqual(res.body.message, 'No matches yet. Keep discovering!');
    });

    // Test D: Incoming like alone
    await step('Test D: Incoming likes alone do not generate matches and remain private', async () => {
      // 10 profiles liked the demo user in seed data
      const incomingCount = await Swipe.countDocuments({ targetId: 'demo-user', action: 'like' });
      assert.strictEqual(incomingCount, 10);

      const res = await request('/api/matches');
      assert.strictEqual(res.body.data.length, 0, 'Incoming likes alone must never appear in matches');
    });

    // Test B: One-sided like
    const nonIncomingProfile = await Profile.findOne({
      seedKey: { $nin: incomingLikeSeedKeys }
    }).lean();
    assert.ok(nonIncomingProfile);

    await step('Test B: One-sided outgoing like does not create a match', async () => {
      const res = await request('/api/swipe', {
        method: 'POST',
        body: { profileId: nonIncomingProfile._id.toString(), action: 'like' }
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.matched, false);
      assert.strictEqual(res.body.data.action, 'like');

      // Verify no match record created
      const matchDoc = await Match.findOne({
        demoUserId: 'demo-user',
        profileId: nonIncomingProfile._id
      });
      assert.strictEqual(matchDoc, null);

      // Verify matches endpoint still empty
      const matchesRes = await request('/api/matches');
      assert.strictEqual(matchesRes.body.data.length, 0);
    });

    // Test C: Pass with incoming like
    const incomingProfile1 = await Profile.findOne({ seedKey: incomingLikeSeedKeys[0] }).lean();
    assert.ok(incomingProfile1);

    await step('Test C: Passing a profile with an incoming like creates NO match and preserves privacy', async () => {
      const res = await request('/api/swipe', {
        method: 'POST',
        body: { profileId: incomingProfile1._id.toString(), action: 'pass' }
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.matched, false);
      assert.strictEqual(res.body.data.action, 'pass');

      // Match record must NOT exist
      const matchDoc = await Match.findOne({
        demoUserId: 'demo-user',
        profileId: incomingProfile1._id
      });
      assert.strictEqual(matchDoc, null);

      // Matches endpoint remains empty
      const matchesRes = await request('/api/matches');
      assert.strictEqual(matchesRes.body.data.length, 0);
    });

    // Test A: Mutual like
    const incomingProfile2 = await Profile.findOne({ seedKey: incomingLikeSeedKeys[1] }).lean();
    assert.ok(incomingProfile2);

    let matchRecordId = null;
    let matchCreatedAt = null;

    await step('Test A: Mutual like detects reciprocal swipe, persists Match, and returns match details', async () => {
      const res = await request('/api/swipe', {
        method: 'POST',
        body: { profileId: incomingProfile2._id.toString(), action: 'like' }
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.message, "It's a match!");
      assert.strictEqual(res.body.data.action, 'like');
      assert.strictEqual(res.body.data.matched, true);
      assert.ok(res.body.data.match);
      assert.strictEqual(res.body.data.match.profileId, incomingProfile2._id.toString());
      assert.strictEqual(res.body.data.match.name, incomingProfile2.name);
      assert.strictEqual(res.body.data.match.photo, incomingProfile2.photo);

      // Verify Match was persisted in DB
      const dbMatch = await Match.findOne({
        demoUserId: 'demo-user',
        profileId: incomingProfile2._id
      });
      assert.ok(dbMatch);
      matchRecordId = dbMatch._id.toString();
      matchCreatedAt = dbMatch.createdAt.toISOString();
    });

    // Verify GET /api/matches now returns the mutual match
    await step('GET /api/matches returns confirmed mutual match with accurate fields and timestamp', async () => {
      const res = await request('/api/matches');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.length, 1);
      assert.strictEqual(res.body.meta.count, 1);

      const matchItem = res.body.data[0];
      assert.strictEqual(matchItem._id, matchRecordId);
      assert.strictEqual(matchItem.profile._id, incomingProfile2._id.toString());
      assert.strictEqual(matchItem.profile.name, incomingProfile2.name);
      assert.strictEqual(matchItem.profile.age, incomingProfile2.age);
      assert.strictEqual(matchItem.profile.photo, incomingProfile2.photo);
      assert.strictEqual(matchItem.profile.bio, incomingProfile2.bio);
      assert.strictEqual(matchItem.profile.city, incomingProfile2.city);
      assert.deepStrictEqual(matchItem.profile.interests, incomingProfile2.interests);
      assert.strictEqual(matchItem.matchedAt, matchCreatedAt);
      assert.strictEqual(matchItem.profile.seedKey, undefined, 'seedKey must not be exposed');
    });

    // Test E: Duplicate match prevention
    await step('Test E: Duplicate match prevention ensures only one match record per profile', async () => {
      // Re-running findOneAndUpdate or match persistence
      const duplicateRes = await Match.findOneAndUpdate(
        { demoUserId: 'demo-user', profileId: incomingProfile2._id },
        { $setOnInsert: { demoUserId: 'demo-user', profileId: incomingProfile2._id } },
        { upsert: true, returnDocument: 'after' }
      );
      assert.strictEqual(duplicateRes._id.toString(), matchRecordId);

      const totalMatches = await Match.countDocuments({
        demoUserId: 'demo-user',
        profileId: incomingProfile2._id
      });
      assert.strictEqual(totalMatches, 1);
    });

    // Test F: Multiple incoming likes
    const incomingProfile3 = await Profile.findOne({ seedKey: incomingLikeSeedKeys[2] }).lean();
    assert.ok(incomingProfile3);

    await step('Test F: Multiple incoming likes: Matching a second profile creates second match without leaking others', async () => {
      const swipeRes = await request('/api/swipe', {
        method: 'POST',
        body: { profileId: incomingProfile3._id.toString(), action: 'like' }
      });
      assert.strictEqual(swipeRes.body.data.matched, true);

      const res = await request('/api/matches');
      assert.strictEqual(res.body.data.length, 2);
      assert.strictEqual(res.body.meta.count, 2);

      // Confirm only incomingProfile2 and incomingProfile3 are in matches
      const matchedProfileIds = res.body.data.map((m) => m.profile._id);
      assert.ok(matchedProfileIds.includes(incomingProfile2._id.toString()));
      assert.ok(matchedProfileIds.includes(incomingProfile3._id.toString()));

      // Other 7 incoming likes must NOT appear
      for (let i = 3; i < incomingLikeSeedKeys.length; i++) {
        const unswipedIncoming = await Profile.findOne({ seedKey: incomingLikeSeedKeys[i] });
        assert.strictEqual(matchedProfileIds.includes(unswipedIncoming._id.toString()), false);
      }
    });

    // Privacy verification on /api/matches
    await step('Matches endpoint does not expose raw Swipe records or other users matches', async () => {
      // Create a match for another user
      const otherProfile = await Profile.findOne({ seedKey: incomingLikeSeedKeys[4] });
      await Match.create({ demoUserId: 'other-user', profileId: otherProfile._id });

      const res = await request('/api/matches');
      // Must still be 2 for demo-user
      assert.strictEqual(res.body.data.length, 2);
      for (const m of res.body.data) {
        assert.strictEqual(m.actorId, undefined);
        assert.strictEqual(m.targetId, undefined);
        assert.strictEqual(m.action, undefined);
        assert.strictEqual(m.demoUserId, undefined);
      }
    });

    console.log(`\nMatches API Test Results: ${passed}/${total} passed.\n`);
    process.exit(0);
  } finally {
    await teardownApiTestEnv();
  }
}

runTests().catch((err) => {
  console.error('Matches tests failed with error:', err);
  process.exit(1);
});
