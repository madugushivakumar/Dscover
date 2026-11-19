import assert from 'assert';
import http from 'node:http';
import { setupApiTestEnv, seedTestEnv, teardownApiTestEnv } from './testHelper.js';
import { getFeed } from '../../client/src/services/feedService.js';
import { swipeProfile } from '../../client/src/services/swipeService.js';
import { getMatches } from '../../client/src/services/matchService.js';
import { ApiError } from '../../client/src/services/api.js';
import Profile from '../models/Profile.js';
import { incomingLikeSeedKeys } from '../seed/profileData.js';

console.log('--- Running Phase 5 Frontend Services & Backend API Integration Tests ---');

// Mock global.fetch for Node.js test environment using native node:http (avoids Windows libuv assertion)
let testPort = 0;
const originalFetch = global.fetch;

global.fetch = async (url, options = {}) => {
  return new Promise((resolve, reject) => {
    const fullPath = url.startsWith('/api') ? url : `/api${url}`;
    const payload = options.body !== undefined
      ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body))
      : null;

    const reqOptions = {
      hostname: '127.0.0.1',
      port: testPort,
      path: fullPath,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...(options.headers || {})
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          statusText: res.statusMessage,
          headers: {
            get: (name) => res.headers[name.toLowerCase()]
          },
          json: async () => JSON.parse(data),
          text: async () => data
        });
      });
    });

    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
};

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

  const { baseUrl } = await setupApiTestEnv();
  const parsedUrl = new URL(baseUrl);
  testPort = parseInt(parsedUrl.port, 10);

  try {
    await seedTestEnv();

    let nonIncomingProfiles;
    let incomingLikeProfile;

    // 1. feedService.getFeed()
    await step('Frontend Service: getFeed() retrieves unswiped discovery profiles', async () => {
      const result = await getFeed();
      assert.ok(result.profiles);
      assert.strictEqual(Array.isArray(result.profiles), true);
      assert.strictEqual(result.profiles.length, 36);
      assert.strictEqual(result.count, 36);

      const firstProfile = result.profiles[0];
      assert.ok(firstProfile._id);
      assert.ok(firstProfile.name);
      assert.ok(firstProfile.age);
      assert.ok(firstProfile.photo);
      assert.strictEqual(firstProfile.seedKey, undefined);
      assert.strictEqual(firstProfile.actorId, undefined);
      assert.strictEqual(firstProfile.targetId, undefined);
    });

    // 2. swipeService.swipeProfile() with "pass"
    await step('Frontend Service: swipeProfile() records pass and returns matched: false', async () => {
      // Find 2 non-incoming profiles
      nonIncomingProfiles = await Profile.find({ seedKey: { $nin: incomingLikeSeedKeys } }).limit(2);
      const passTarget = nonIncomingProfiles[0];

      const swipeRes = await swipeProfile(passTarget._id.toString(), 'pass');
      assert.strictEqual(swipeRes.action, 'pass');
      assert.strictEqual(swipeRes.matched, false);

      // Verify feed count decreased by 1
      const updatedFeed = await getFeed();
      assert.strictEqual(updatedFeed.count, 35);
      const ids = updatedFeed.profiles.map(p => p._id.toString());
      assert.strictEqual(ids.includes(passTarget._id.toString()), false);
    });

    // 3. swipeService.swipeProfile() with "like" on non-reciprocal profile
    await step('Frontend Service: swipeProfile() records one-sided like without match', async () => {
      const likeTarget = nonIncomingProfiles[1];
      const swipeRes = await swipeProfile(likeTarget._id.toString(), 'like');
      assert.strictEqual(swipeRes.action, 'like');
      assert.strictEqual(swipeRes.matched, false);

      // Verify not added to matches
      const matchesRes = await getMatches();
      assert.strictEqual(matchesRes.count, 0);
    });

    // 4. swipeService.swipeProfile() with "like" on reciprocal liker -> Mutual Match!
    await step('Frontend Service: swipeProfile() on incoming liker establishes confirmed mutual match', async () => {
      incomingLikeProfile = await Profile.findOne({ seedKey: incomingLikeSeedKeys[0] });
      const swipeRes = await swipeProfile(incomingLikeProfile._id.toString(), 'like');
      assert.strictEqual(swipeRes.action, 'like');
      assert.strictEqual(swipeRes.matched, true);
      assert.ok(swipeRes.match);
      assert.strictEqual(swipeRes.match.profileId.toString(), incomingLikeProfile._id.toString());
      assert.strictEqual(swipeRes.match.name, incomingLikeProfile.name);
    });

    // 5. matchService.getMatches()
    await step('Frontend Service: getMatches() retrieves confirmed mutual match with public profile fields', async () => {
      const matchRes = await getMatches();
      assert.ok(matchRes.matches);
      assert.strictEqual(matchRes.count, 1);
      assert.strictEqual(matchRes.matches.length, 1);

      const match = matchRes.matches[0];
      assert.ok(match._id);
      assert.ok(match.matchedAt);
      assert.strictEqual(match.profile._id.toString(), incomingLikeProfile._id.toString());
      assert.strictEqual(match.profile.name, incomingLikeProfile.name);
      assert.strictEqual(match.profile.seedKey, undefined);
      assert.strictEqual(match.profile.actorId, undefined);
    });

    // 6. swipeService.swipeProfile() duplicate rejection
    await step('Frontend Service: swipeProfile() on already swiped profile throws ApiError 409', async () => {
      try {
        await swipeProfile(incomingLikeProfile._id.toString(), 'like');
        assert.fail('Expected duplicate swipe to throw ApiError');
      } catch (err) {
        assert.ok(err instanceof ApiError);
        assert.strictEqual(err.status, 409);
        assert.strictEqual(err.code, 'DUPLICATE_SWIPE');
      }
    });

    // 7. swipeService.swipeProfile() invalid profile ID
    await step('Frontend Service: swipeProfile() with non-existent ID throws ApiError 404', async () => {
      try {
        await swipeProfile('507f1f77bcf86cd799439011', 'like');
        assert.fail('Expected non-existent profile to throw ApiError 404');
      } catch (err) {
        assert.ok(err instanceof ApiError);
        assert.strictEqual(err.status, 404);
        assert.strictEqual(err.code, 'PROFILE_NOT_FOUND');
      }
    });

    console.log(`\n=== All ${passed}/${total} Frontend Service Integration Tests Passed ===\n`);
  } finally {
    global.fetch = originalFetch;
    await teardownApiTestEnv();
  }
}

runTests().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error('Frontend integration test suite failed:', err);
  process.exit(1);
});
