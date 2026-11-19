import assert from 'assert';
import mongoose from 'mongoose';
import { setupApiTestEnv, resetTestDb, teardownApiTestEnv } from './testHelper.js';
import Profile from '../models/Profile.js';
import Swipe from '../models/Swipe.js';
import Match from '../models/Match.js';

console.log('--- Running Phase 4 MongoDB Index Audit & Enforcement Tests ---');

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

  await setupApiTestEnv();

  try {
    await resetTestDb();

    // Ensure all schema indexes are synced to the MongoDB instance
    await Profile.syncIndexes();
    await Swipe.syncIndexes();
    await Match.syncIndexes();

    // 1. Inspect Profile collection indexes
    await step('Indexes 8.1: Profile collection has unique index on seedKey', async () => {
      const profileIndexes = await Profile.collection.indexes();
      const seedKeyIndex = profileIndexes.find((idx) => idx.key.seedKey === 1);

      assert.ok(seedKeyIndex, 'Index on seedKey: 1 not found in Profile collection');
      assert.strictEqual(seedKeyIndex.unique, true, 'Profile seedKey index must be marked unique');
      console.log(`       Verified Profile Index: "${seedKeyIndex.name}" with key { seedKey: 1 }, unique: true`);
    });

    // 2. Inspect Swipe collection indexes
    await step('Indexes 8.2: Swipe collection has compound unique (actorId, targetId), actorId, and targetId indexes', async () => {
      const swipeIndexes = await Swipe.collection.indexes();

      const compoundIndex = swipeIndexes.find(
        (idx) => idx.key.actorId === 1 && idx.key.targetId === 1
      );
      assert.ok(compoundIndex, 'Compound index on (actorId, targetId) not found in Swipe collection');
      assert.strictEqual(compoundIndex.unique, true, 'Swipe compound index must be marked unique');

      const actorIndex = swipeIndexes.find(
        (idx) => idx.key.actorId === 1 && idx.key.targetId === undefined
      );
      assert.ok(actorIndex, 'Index on actorId: 1 not found in Swipe collection');

      const targetIndex = swipeIndexes.find(
        (idx) => idx.key.targetId === 1 && idx.key.actorId === undefined
      );
      assert.ok(targetIndex, 'Index on targetId: 1 not found in Swipe collection');

      console.log(`       Verified Swipe Indexes: "${compoundIndex.name}" (unique), "${actorIndex.name}", "${targetIndex.name}"`);
    });

    // 3. Inspect Match collection indexes
    await step('Indexes 8.3: Match collection has compound unique (demoUserId, profileId) index', async () => {
      const matchIndexes = await Match.collection.indexes();
      const matchCompoundIndex = matchIndexes.find(
        (idx) => idx.key.demoUserId === 1 && idx.key.profileId === 1
      );

      assert.ok(matchCompoundIndex, 'Compound index on (demoUserId, profileId) not found in Match collection');
      assert.strictEqual(matchCompoundIndex.unique, true, 'Match compound index must be marked unique');
      console.log(`       Verified Match Index: "${matchCompoundIndex.name}" with key { demoUserId: 1, profileId: 1 }, unique: true`);
    });

    // 4. Test actual database enforcement of Profile seedKey uniqueness
    await step('Indexes 8.4: MongoDB rejects duplicate Profile seedKey with code 11000', async () => {
      await Profile.create({
        seedKey: 'enforced-seed-01',
        name: 'User One',
        age: 25,
        photo: 'https://example.com/p1.jpg',
        bio: 'Bio one',
        city: 'Mumbai',
        interests: ['Art', 'Design', 'Music']
      });

      let caught = null;
      try {
        await Profile.create({
          seedKey: 'enforced-seed-01',
          name: 'Duplicate Seed User',
          age: 26,
          photo: 'https://example.com/p2.jpg',
          bio: 'Bio two',
          city: 'Delhi',
          interests: ['Coffee', 'Tech', 'Music']
        });
      } catch (err) {
        caught = err;
      }

      assert.ok(caught, 'Expected duplicate key error');
      assert.strictEqual(caught.code, 11000);
    });

    // 5. Test actual database enforcement of Swipe (actorId, targetId) compound uniqueness
    await step('Indexes 8.5: MongoDB rejects duplicate Swipe (actorId, targetId) with code 11000', async () => {
      const dummyId = new mongoose.Types.ObjectId().toString();
      await Swipe.create({
        actorId: 'user-actor-99',
        targetId: dummyId,
        action: 'like'
      });

      let caught = null;
      try {
        await Swipe.create({
          actorId: 'user-actor-99',
          targetId: dummyId,
          action: 'pass'
        });
      } catch (err) {
        caught = err;
      }

      assert.ok(caught, 'Expected duplicate compound swipe error');
      assert.strictEqual(caught.code, 11000);
    });

    // 6. Test actual database enforcement of Match (demoUserId, profileId) compound uniqueness
    await step('Indexes 8.6: MongoDB rejects duplicate Match (demoUserId, profileId) with code 11000', async () => {
      const dummyProfileId = new mongoose.Types.ObjectId();
      await Match.create({
        demoUserId: 'demo-user',
        profileId: dummyProfileId
      });

      let caught = null;
      try {
        await Match.create({
          demoUserId: 'demo-user',
          profileId: dummyProfileId
        });
      } catch (err) {
        caught = err;
      }

      assert.ok(caught, 'Expected duplicate compound match error');
      assert.strictEqual(caught.code, 11000);
    });

    console.log(`\nMongoDB Index Audit Results: ${passed}/${total} passed.\n`);
  } finally {
    await teardownApiTestEnv();
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Index audit tests failed with error:', err);
    process.exit(1);
  });
