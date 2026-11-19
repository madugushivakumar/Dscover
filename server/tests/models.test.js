import assert from 'assert';
import mongoose from 'mongoose';
import Profile from '../models/Profile.js';
import Swipe from '../models/Swipe.js';
import Match from '../models/Match.js';

console.log('--- Running Phase 2 Model Validation Tests ---');

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

// ==========================================
// 1. Profile Model Validations
// ==========================================

runTest('Profile: Valid profile passes validation', () => {
  const profile = new Profile({
    seedKey: 'profile-valid-01',
    name: 'Test User',
    age: 25,
    photo: 'https://example.com/photo.jpg',
    bio: 'Test bio description',
    city: 'Hyderabad',
    interests: ['Music', 'Travel', 'Coding']
  });
  const err = profile.validateSync();
  assert.strictEqual(err, undefined);
});

runTest('Profile: Missing name is rejected', () => {
  const profile = new Profile({
    seedKey: 'profile-invalid-01',
    age: 25,
    photo: 'https://example.com/photo.jpg',
    bio: 'Test bio',
    city: 'Hyderabad',
    interests: ['Music', 'Travel', 'Coding']
  });
  const err = profile.validateSync();
  assert.ok(err && err.errors['name']);
});

runTest('Profile: Missing age is rejected', () => {
  const profile = new Profile({
    seedKey: 'profile-invalid-02',
    name: 'Test User',
    photo: 'https://example.com/photo.jpg',
    bio: 'Test bio',
    city: 'Hyderabad',
    interests: ['Music', 'Travel', 'Coding']
  });
  const err = profile.validateSync();
  assert.ok(err && err.errors['age']);
});

runTest('Profile: Age below 18 is rejected', () => {
  const profile = new Profile({
    seedKey: 'profile-invalid-03',
    name: 'Underage User',
    age: 17,
    photo: 'https://example.com/photo.jpg',
    bio: 'Test bio',
    city: 'Hyderabad',
    interests: ['Music', 'Travel', 'Coding']
  });
  const err = profile.validateSync();
  assert.ok(err && err.errors['age']);
  assert.match(err.errors['age'].message, /at least 18/i);
});

runTest('Profile: Missing photo is rejected', () => {
  const profile = new Profile({
    seedKey: 'profile-invalid-04',
    name: 'No Photo User',
    age: 22,
    bio: 'Test bio',
    city: 'Hyderabad',
    interests: ['Music', 'Travel', 'Coding']
  });
  const err = profile.validateSync();
  assert.ok(err && err.errors['photo']);
});

runTest('Profile: Empty interests array is rejected', () => {
  const profile = new Profile({
    seedKey: 'profile-invalid-05',
    name: 'No Interests User',
    age: 22,
    photo: 'https://example.com/photo.jpg',
    bio: 'Test bio',
    city: 'Hyderabad',
    interests: []
  });
  const err = profile.validateSync();
  assert.ok(err && err.errors['interests']);
});

runTest('Profile: Fewer than 3 interests is rejected', () => {
  const profile = new Profile({
    seedKey: 'profile-invalid-06',
    name: 'Too Few Interests User',
    age: 22,
    photo: 'https://example.com/photo.jpg',
    bio: 'Test bio',
    city: 'Hyderabad',
    interests: ['Music', 'Travel']
  });
  const err = profile.validateSync();
  assert.ok(err && err.errors['interests']);
  assert.match(err.errors['interests'].message, /at least 3/i);
});

// ==========================================
// 2. Swipe Model Validations
// ==========================================

runTest('Swipe: "like" action is accepted', () => {
  const swipe = new Swipe({
    actorId: 'demo-user',
    targetId: 'profile-12345',
    action: 'like'
  });
  const err = swipe.validateSync();
  assert.strictEqual(err, undefined);
});

runTest('Swipe: "pass" action is accepted', () => {
  const swipe = new Swipe({
    actorId: 'demo-user',
    targetId: 'profile-12345',
    action: 'pass'
  });
  const err = swipe.validateSync();
  assert.strictEqual(err, undefined);
});

runTest('Swipe: Invalid action is rejected', () => {
  const swipe = new Swipe({
    actorId: 'demo-user',
    targetId: 'profile-12345',
    action: 'superlike'
  });
  const err = swipe.validateSync();
  assert.ok(err && err.errors['action']);
});

runTest('Swipe: Missing actorId is rejected', () => {
  const swipe = new Swipe({
    targetId: 'profile-12345',
    action: 'like'
  });
  const err = swipe.validateSync();
  assert.ok(err && err.errors['actorId']);
});

runTest('Swipe: Missing targetId is rejected', () => {
  const swipe = new Swipe({
    actorId: 'demo-user',
    action: 'like'
  });
  const err = swipe.validateSync();
  assert.ok(err && err.errors['targetId']);
});

runTest('Swipe: Self-swipe (actorId === targetId) is rejected', () => {
  const swipe = new Swipe({
    actorId: 'user-self',
    targetId: 'user-self',
    action: 'like'
  });
  const err = swipe.validateSync();
  assert.ok(err && err.errors['targetId']);
  assert.match(err.errors['targetId'].message, /self-swiping/i);
});

// ==========================================
// 3. Match Model Validations
// ==========================================

runTest('Match: Valid match is accepted', () => {
  const match = new Match({
    demoUserId: 'demo-user',
    profileId: new mongoose.Types.ObjectId()
  });
  const err = match.validateSync();
  assert.strictEqual(err, undefined);
});

runTest('Match: Missing demoUserId is rejected', () => {
  const match = new Match({
    profileId: new mongoose.Types.ObjectId()
  });
  const err = match.validateSync();
  assert.ok(err && err.errors['demoUserId']);
});

runTest('Match: Missing profileId is rejected', () => {
  const match = new Match({
    demoUserId: 'demo-user'
  });
  const err = match.validateSync();
  assert.ok(err && err.errors['profileId']);
});

console.log(`\nModel Validation Results: ${passedTests}/${totalTests} tests passed.`);

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
