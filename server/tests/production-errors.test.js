import assert from 'assert';
import { setupApiTestEnv, seedTestEnv, teardownApiTestEnv } from './testHelper.js';
import Profile from '../models/Profile.js';

console.log('--- Running Phase 4 Production Error Handling & Sanitization Tests ---');

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

  // Force NODE_ENV to production for this test suite
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';

  const { request } = await setupApiTestEnv();

  try {
    await seedTestEnv();
    const profiles = await Profile.find().lean();
    const sampleProfile = profiles[0];

    // Helper to verify payload is free of sensitive information
    const assertSanitized = (body) => {
      const serialized = JSON.stringify(body);
      assert.strictEqual(serialized.includes('stack'), false, 'Stack trace leaked in production');
      assert.strictEqual(serialized.includes('at '), false, 'Call stack frame leaked');
      assert.strictEqual(serialized.includes('mongodb://'), false, 'MongoDB URI leaked');
      assert.strictEqual(serialized.includes('password'), false, 'Password field leaked');
      assert.strictEqual(serialized.includes('C:\\'), false, 'Local file path leaked');
    };

    // 11.1: Malformed JSON error
    await step('Production Errors 11.1: Malformed JSON returns sanitized 400 INVALID_JSON', async () => {
      const res = await request('/api/swipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{ broken json'
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error.code, 'INVALID_JSON');
      assertSanitized(res.body);
    });

    // 11.2: CastError (invalid ObjectId format)
    await step('Production Errors 11.2: Invalid ObjectId returns sanitized 400 INVALID_PROFILE_ID', async () => {
      const res = await request('/api/swipe', {
        method: 'POST',
        body: { profileId: 'not-a-valid-id', action: 'like' }
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error.code, 'INVALID_PROFILE_ID');
      assertSanitized(res.body);
    });

    // 11.3: Unmapped route 404
    await step('Production Errors 11.3: Unmapped route returns sanitized 404 NOT_FOUND', async () => {
      const res = await request('/api/this-does-not-exist');
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.error.code, 'NOT_FOUND');
      assertSanitized(res.body);
    });

    // 11.4: Oversized request 413
    await step('Production Errors 11.4: Oversized request returns sanitized 413 PAYLOAD_TOO_LARGE', async () => {
      const hugePadding = 'Z'.repeat(12 * 1024);
      const res = await request('/api/swipe', {
        method: 'POST',
        body: { profileId: sampleProfile._id.toString(), action: 'pass', padding: hugePadding }
      });
      assert.strictEqual(res.status, 413);
      assert.strictEqual(res.body.error.code, 'PAYLOAD_TOO_LARGE');
      assertSanitized(res.body);
    });

    // 11.5: Duplicate key error (409)
    await step('Production Errors 11.5: Duplicate swipe returns sanitized 409 DUPLICATE_SWIPE', async () => {
      await request('/api/swipe', {
        method: 'POST',
        body: { profileId: sampleProfile._id.toString(), action: 'like' }
      });

      const dupRes = await request('/api/swipe', {
        method: 'POST',
        body: { profileId: sampleProfile._id.toString(), action: 'like' }
      });
      assert.strictEqual(dupRes.status, 409);
      assert.strictEqual(dupRes.body.error.code, 'DUPLICATE_SWIPE');
      assertSanitized(dupRes.body);
    });

    // 11.6: Generic internal 500 server error
    await step('Production Errors 11.6: Internal 500 error sanitizes message and conceals stack trace', async () => {
      // Temporarily stub Profile.findById to throw unexpected internal error
      const originalFindById = Profile.findById;
      Profile.findById = () => {
        throw new Error('Secret internal database connection pool exhausted');
      };

      try {
        const otherProfile = profiles[1];
        const res = await request('/api/swipe', {
          method: 'POST',
          body: { profileId: otherProfile._id.toString(), action: 'like' }
        });

        assert.strictEqual(res.status, 500);
        assert.strictEqual(res.body.success, false);
        assert.strictEqual(res.body.error.code, 'INTERNAL_SERVER_ERROR');
        assert.strictEqual(res.body.message, 'An unexpected internal server error occurred.');
        assert.strictEqual(res.body.error.details, undefined);
        assertSanitized(res.body);
      } finally {
        Profile.findById = originalFindById;
      }
    });

    console.log(`\nProduction Error Handling Results: ${passed}/${total} passed.\n`);
  } finally {
    process.env.NODE_ENV = originalEnv;
    await teardownApiTestEnv();
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Production error tests failed with error:', err);
    process.exit(1);
  });
