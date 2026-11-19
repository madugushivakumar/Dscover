import assert from 'assert';
import { mockProfiles, incomingLikeSeedKeys } from '../seed/profileData.js';

console.log('--- Running Phase 2 Seed Dataset Integrity Tests ---');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
  }
}

runTest('Seed Data: Contains at least 35 profiles', () => {
  assert.ok(mockProfiles.length >= 35, `Found ${mockProfiles.length} profiles, expected >= 35`);
});

runTest('Seed Data: All seedKeys are unique', () => {
  const keys = new Set();
  for (const p of mockProfiles) {
    assert.ok(!keys.has(p.seedKey), `Duplicate seedKey detected: ${p.seedKey}`);
    keys.add(p.seedKey);
  }
});

runTest('Seed Data: Every profile contains required fields with valid types', () => {
  for (const p of mockProfiles) {
    assert.ok(p.seedKey && typeof p.seedKey === 'string');
    assert.ok(p.name && typeof p.name === 'string');
    assert.ok(typeof p.age === 'number');
    assert.ok(p.photo && typeof p.photo === 'string');
    assert.ok(p.bio && typeof p.bio === 'string');
    assert.ok(p.city && typeof p.city === 'string');
    assert.ok(Array.isArray(p.interests));
  }
});

runTest('Seed Data: Every profile age is at least 18', () => {
  for (const p of mockProfiles) {
    assert.ok(p.age >= 18, `Profile ${p.seedKey} has age ${p.age} < 18`);
  }
});

runTest('Seed Data: Every profile has at least 3 distinct non-empty interests', () => {
  for (const p of mockProfiles) {
    assert.ok(
      p.interests.length >= 3,
      `Profile ${p.seedKey} has only ${p.interests.length} interests`
    );
    for (const interest of p.interests) {
      assert.ok(typeof interest === 'string' && interest.trim().length > 0);
    }
  }
});

runTest('Seed Data: At least 8 incoming likes are designated', () => {
  assert.ok(
    incomingLikeSeedKeys.length >= 8,
    `Found ${incomingLikeSeedKeys.length} incoming likes, expected >= 8`
  );
});

runTest('Seed Data: All incoming-like seedKeys correspond to existing mock profiles', () => {
  const profileKeys = new Set(mockProfiles.map(p => p.seedKey));
  for (const key of incomingLikeSeedKeys) {
    assert.ok(profileKeys.has(key), `Incoming like key "${key}" not found in mockProfiles`);
  }
});

runTest('Privacy Audit: Mock profiles do not contain incoming like or private swipe fields', () => {
  for (const p of mockProfiles) {
    assert.strictEqual(p.alreadyLikedYou, undefined, `Profile ${p.seedKey} exposes alreadyLikedYou`);
    assert.strictEqual(p.incomingLike, undefined, `Profile ${p.seedKey} exposes incomingLike`);
    assert.strictEqual(p.swipeStatus, undefined, `Profile ${p.seedKey} exposes swipeStatus`);
    assert.strictEqual(p.isMatch, undefined, `Profile ${p.seedKey} exposes isMatch`);
  }
});

console.log(`\nSeed Dataset Results: ${passedTests}/${totalTests} tests passed.`);

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
