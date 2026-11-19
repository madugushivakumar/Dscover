import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { stopMongoProcess } from './testHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('   Coy Discover — Complete Project Test Runner      ');
console.log('====================================================\n');

const testSuites = [
  { name: 'Phase 1: Backend Health Check', file: 'health.test.js', expectedTests: 1 },
  { name: 'Phase 2: Model Validation Suite', file: 'models.test.js', expectedTests: 16 },
  { name: 'Phase 2: Seed Dataset Integrity Suite', file: 'seed-data.test.js', expectedTests: 8 },
  { name: 'Phase 2: Database Integration Suite', file: 'db-integration.test.js', expectedTests: 5 },
  { name: 'Phase 3: Feed API Test Suite', file: 'feed.test.js', expectedTests: 12 },
  { name: 'Phase 3: Swipe API Test Suite', file: 'swipe.test.js', expectedTests: 15 },
  { name: 'Phase 3: Matches API & Mutual Matching Suite', file: 'matches.test.js', expectedTests: 9 },
  { name: 'Phase 3: Privacy & Security Enforcement Suite', file: 'privacy.test.js', expectedTests: 6 },
  { name: 'Phase 3: Full API Lifecycle & Persistence Suite', file: 'api-integration.test.js', expectedTests: 6 },
  { name: 'Phase 4: Concurrency & Race Conditions', file: 'concurrency.test.js', expectedTests: 6 },
  { name: 'Phase 4: Match Failure Recovery & Reconciliation', file: 'recovery.test.js', expectedTests: 5 },
  { name: 'Phase 4: Deleted Profile Edge Cases', file: 'deleted-profiles.test.js', expectedTests: 4 },
  { name: 'Phase 4: Database Index Architecture & Uniqueness', file: 'indexes.test.js', expectedTests: 6 },
  { name: 'Phase 4: Feed Determinism & Order Stability', file: 'feed-ordering.test.js', expectedTests: 3 },
  { name: 'Phase 4: Request Abuse & Input Hardening', file: 'request-hardening.test.js', expectedTests: 8 },
  { name: 'Phase 4: Production Error Sanitization', file: 'production-errors.test.js', expectedTests: 6 },
  { name: 'Phase 4: Privacy & Anti-Leak Regression', file: 'privacy-regression.test.js', expectedTests: 6 },
  { name: 'Phase 4: Persistence & Server Restart Hardening', file: 'persistence-hardening.test.js', expectedTests: 6 },
  { name: 'Phase 5: Frontend Services & Backend API Integration', file: 'frontend-integration.test.js', expectedTests: 7 }
];

let allPassed = true;
let totalPassedTests = 0;
const results = [];

for (const suite of testSuites) {
  console.log(`\n>> Executing: ${suite.name}`);
  const targetPath = path.join(__dirname, suite.file);
  const result = spawnSync(process.execPath, [targetPath], {
    stdio: 'inherit',
    shell: false
  });

  if (result.status !== 0) {
    console.error(`\n[FAILED] ${suite.name} exited with status ${result.status}`);
    results.push({ name: suite.name, status: 'FAIL', tests: 0 });
    allPassed = false;
  } else {
    console.log(`[COMPLETED] ${suite.name} (${suite.expectedTests} tests)`);
    results.push({ name: suite.name, status: 'PASS', tests: suite.expectedTests });
    totalPassedTests += suite.expectedTests;
  }
}

console.log('\n====================================================');
console.log('   SUMMARY OF TEST SUITES EXECUTION                 ');
console.log('====================================================');
for (const r of results) {
  console.log(`  ${r.status.padEnd(6)} : ${r.name} (${r.tests} tests)`);
}
console.log('====================================================');
console.log(`   TOTAL TESTS: ${totalPassedTests} / ${testSuites.reduce((a, s) => a + s.expectedTests, 0)} PASSED across ${testSuites.length} SUITES`);
console.log('====================================================');

if (allPassed) {
  console.log('   ALL TEST SUITES PASSED SUCCESSFULLY!             ');
  console.log('====================================================\n');
  stopMongoProcess();
  process.exit(0);
} else {
  console.error('   ONE OR MORE TEST SUITES FAILED.                  ');
  console.log('====================================================\n');
  stopMongoProcess();
  process.exit(1);
}
