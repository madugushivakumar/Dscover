import assert from 'assert';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { ensureMongoRunning } from './testHelper.js';
import Profile from '../models/Profile.js';
import Swipe from '../models/Swipe.js';
import Match from '../models/Match.js';
import { seedDatabase } from '../seed/seed.js';

const TEST_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27018/coy_discover_test';
const DEMO_USER_ID = 'demo-user-test';

console.log('--- Running Phase 2 Live Database Integration Tests ---');
console.log(`Connecting to test database at: ${TEST_URI}`);

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

  try {
    await ensureMongoRunning();
    await connectDB(TEST_URI);

    // Clean test collections before beginning
    await Profile.deleteMany({});
    await Swipe.deleteMany({});
    await Match.deleteMany({});
    await Profile.syncIndexes();
    await Swipe.syncIndexes();
    await Match.syncIndexes();

    // 1. Profile Unique Index on seedKey
    await step('Database Index: Profile seedKey unique index prevents duplicate seedKeys', async () => {
      await Profile.create({
        seedKey: 'uniq-key-01',
        name: 'First User',
        age: 25,
        photo: 'https://example.com/p1.jpg',
        bio: 'First bio',
        city: 'Mumbai',
        interests: ['Music', 'Art', 'Dance']
      });

      let duplicateError = null;
      try {
        await Profile.create({
          seedKey: 'uniq-key-01',
          name: 'Duplicate Key User',
          age: 26,
          photo: 'https://example.com/p2.jpg',
          bio: 'Second bio',
          city: 'Delhi',
          interests: ['Tech', 'Reading', 'Coffee']
        });
      } catch (err) {
        duplicateError = err;
      }

      assert.ok(duplicateError, 'Expected duplicate key error but none was thrown');
      assert.strictEqual(duplicateError.code, 11000);
    });

    // 2. Swipe Unique Compound Index on (actorId, targetId)
    await step('Database Index: Swipe compound index (actorId, targetId) prevents duplicate directional swipes', async () => {
      await Swipe.create({
        actorId: DEMO_USER_ID,
        targetId: 'profile-target-99',
        action: 'like'
      });

      let duplicateSwipeError = null;
      try {
        await Swipe.create({
          actorId: DEMO_USER_ID,
          targetId: 'profile-target-99',
          action: 'pass'
        });
      } catch (err) {
        duplicateSwipeError = err;
      }

      assert.ok(duplicateSwipeError, 'Expected duplicate swipe compound error');
      assert.strictEqual(duplicateSwipeError.code, 11000);
    });

    // 3. Match Unique Compound Index on (demoUserId, profileId)
    await step('Database Index: Match compound index (demoUserId, profileId) prevents duplicate matches', async () => {
      const sampleProfileId = new mongoose.Types.ObjectId();
      await Match.create({
        demoUserId: DEMO_USER_ID,
        profileId: sampleProfileId
      });

      let duplicateMatchError = null;
      try {
        await Match.create({
          demoUserId: DEMO_USER_ID,
          profileId: sampleProfileId
        });
      } catch (err) {
        duplicateMatchError = err;
      }

      assert.ok(duplicateMatchError, 'Expected duplicate match compound error');
      assert.strictEqual(duplicateMatchError.code, 11000);
    });

    // Clean up test collections for seed testing
    await Profile.deleteMany({});
    await Swipe.deleteMany({});
    await Match.deleteMany({});

    // 4. Test Seed Script Execution
    await step('Seed Verification: Initial seedDatabase execution seeds profiles and incoming likes', async () => {
      const result = await seedDatabase({
        uri: TEST_URI,
        demoUserId: DEMO_USER_ID,
        quiet: true
      });

      assert.ok(result.profilesSeeded >= 35, `Profiles seeded (${result.profilesSeeded}) must be >= 35`);
      assert.ok(result.incomingLikesSeeded >= 8, `Incoming likes (${result.incomingLikesSeeded}) must be >= 8`);

      const totalProfiles = await Profile.countDocuments();
      assert.strictEqual(totalProfiles, result.profilesSeeded);

      const totalIncomingLikes = await Swipe.countDocuments({
        targetId: DEMO_USER_ID,
        action: 'like'
      });
      assert.strictEqual(totalIncomingLikes, result.incomingLikesSeeded);
    });

    // 5. Test Seed Idempotency & Repeatability
    await step('Seed Verification: Re-running seedDatabase is idempotent and creates zero duplicates', async () => {
      const initialProfileCount = await Profile.countDocuments();
      const initialSwipeCount = await Swipe.countDocuments();

      // Create an existing unrelated match to verify seed doesn't delete existing data
      const dummyProfileId = new mongoose.Types.ObjectId();
      await Match.create({ demoUserId: DEMO_USER_ID, profileId: dummyProfileId });

      const repeatResult = await seedDatabase({
        uri: TEST_URI,
        demoUserId: DEMO_USER_ID,
        quiet: true
      });

      const afterProfileCount = await Profile.countDocuments();
      const afterSwipeCount = await Swipe.countDocuments();
      const existingMatch = await Match.findOne({ demoUserId: DEMO_USER_ID, profileId: dummyProfileId });

      assert.strictEqual(afterProfileCount, initialProfileCount, 'Profile count changed after re-seed');
      assert.strictEqual(afterSwipeCount, initialSwipeCount, 'Swipe count changed after re-seed');
      assert.strictEqual(repeatResult.profilesCreated, 0, 'New profiles were unexpectedly created on re-seed');
      assert.strictEqual(repeatResult.incomingLikesCreated, 0, 'New incoming likes were unexpectedly created on re-seed');
      assert.ok(existingMatch, 'Existing match was deleted during re-seed! Seed script must preserve data.');
    });

    console.log(`\nLive Database Integration Results: ${passed}/${total} passed.`);
    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error('\nDatabase Integration Test Suite Aborted with error:', err.message);
    try { await disconnectDB(); } catch {}
    process.exit(1);
  }
}

runTests();
