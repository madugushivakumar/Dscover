import assert from 'assert';
import { setupApiTestEnv, seedTestEnv, teardownApiTestEnv } from './testHelper.js';
import Profile from '../models/Profile.js';
import Swipe from '../models/Swipe.js';
import Match from '../models/Match.js';
import { reconcileUserMatches } from '../services/matchReconciliationService.js';
import { incomingLikeSeedKeys } from '../seed/profileData.js';

console.log('--- Running Phase 4 Match Failure Recovery & Consistency Tests ---');

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

    const incomingProfile = await Profile.findOne({ seedKey: incomingLikeSeedKeys[0] }).lean();
    assert.ok(incomingProfile);

    // 6.1: Simulated failure of Match persistence during mutual swipe
    await step('Recovery 6.1: Simulated failure during match write returns 500 and prevents false matched: true', async () => {
      // Stub Match.findOneAndUpdate to simulate database write failure
      const originalFindOneAndUpdate = Match.findOneAndUpdate;
      Match.findOneAndUpdate = async () => {
        throw new Error('Simulated write failure during Match persistence');
      };

      try {
        const res = await request('/api/swipe', {
          method: 'POST',
          body: { profileId: incomingProfile._id.toString(), action: 'like' }
        });

        // Must return 500 Server Error
        assert.strictEqual(res.status, 500);
        assert.strictEqual(res.body.success, false);
        assert.strictEqual(res.body.data?.matched, undefined, 'Must not claim match succeeded');

        // Check DB state: Outgoing like exists, but Match does not
        const swipeDoc = await Swipe.findOne({
          actorId: 'demo-user',
          targetId: incomingProfile._id.toString(),
          action: 'like'
        });
        assert.ok(swipeDoc, 'Outgoing like was persisted before failure');

        const matchDoc = await Match.findOne({
          demoUserId: 'demo-user',
          profileId: incomingProfile._id
        });
        assert.strictEqual(matchDoc, null, 'Match record must not exist yet');
      } finally {
        // Restore original method
        Match.findOneAndUpdate = originalFindOneAndUpdate;
      }
    });

    // 6.2: Reconciling via reconcileUserMatches
    await step('Recovery 6.2: reconcileUserMatches repairs the missing Match document without user intervention', async () => {
      const result = await reconcileUserMatches('demo-user');
      assert.strictEqual(result.missingMatchesCreated, 1, 'Expected 1 missing match to be created');

      const matchDoc = await Match.findOne({
        demoUserId: 'demo-user',
        profileId: incomingProfile._id
      });
      assert.ok(matchDoc, 'Match document must now exist');
    });

    // 6.3: Idempotency of reconciliation
    await step('Recovery 6.3: Repeated reconciliation is idempotent and creates zero duplicates', async () => {
      const result = await reconcileUserMatches('demo-user');
      assert.strictEqual(result.missingMatchesCreated, 0, 'No new matches should be created on second run');

      const totalMatches = await Match.countDocuments({
        demoUserId: 'demo-user',
        profileId: incomingProfile._id
      });
      assert.strictEqual(totalMatches, 1);
    });

    // 6.4: Self-healing /api/matches view
    await step('Recovery 6.4: GET /api/matches displays the repaired match with accurate details', async () => {
      const res = await request('/api/matches');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.length, 1);
      assert.strictEqual(res.body.data[0].profile._id, incomingProfile._id.toString());
      assert.strictEqual(res.body.data[0].profile.name, incomingProfile.name);
    });

    // 6.5: One-sided likes and passes are never converted by reconciliation
    await step('Recovery 6.5: One-sided outgoing likes and passes are never converted into matches by reconciliation', async () => {
      const nonIncomingProfiles = await Profile.find({
        seedKey: { $nin: incomingLikeSeedKeys }
      }).lean();

      // Demo user passes profile A and likes profile B (neither liked demo user)
      await Swipe.create({ actorId: 'demo-user', targetId: nonIncomingProfiles[0]._id.toString(), action: 'pass' });
      await Swipe.create({ actorId: 'demo-user', targetId: nonIncomingProfiles[1]._id.toString(), action: 'like' });

      const reconResult = await reconcileUserMatches('demo-user');
      assert.strictEqual(reconResult.missingMatchesCreated, 0);

      const matchesRes = await request('/api/matches');
      assert.strictEqual(matchesRes.body.data.length, 1, 'Still only 1 match should exist');
    });

    console.log(`\nMatch Recovery Test Results: ${passed}/${total} passed.\n`);
  } finally {
    await teardownApiTestEnv();
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Recovery tests failed with error:', err);
    process.exit(1);
  });
