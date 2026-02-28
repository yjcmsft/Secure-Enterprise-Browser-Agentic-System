#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Change to the script directory
process.chdir(__dirname);

const dirs = [
  'src/types',
  'src/security',
  'src/browser',
  'src/api',
  'src/skills',
  'src/graph',
  'src/orchestrator',
  'app-package/openapi',
  'infra/modules',
  'infra/parameters',
  '.github/workflows',
  'tests/unit/skills',
  'tests/unit/security',
  'tests/unit/browser',
  'tests/unit/api',
  'tests/integration/workflows',
  'tests/integration/security-flows',
  'tests/e2e'
];

console.log('Creating project directories...\n');

let successCount = 0;
let failureCount = 0;

dirs.forEach(d => {
  try {
    const fullPath = path.join(process.cwd(), d);
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`✓ Created: ${d}`);
    successCount++;
  } catch (err) {
    console.error(`✗ Failed to create ${d}: ${err.message}`);
    failureCount++;
  }
});

console.log(`\n========================================`);
console.log(`✓ Successfully created ${successCount} directories`);
if (failureCount > 0) {
  console.log(`✗ Failed to create ${failureCount} directories`);
}
console.log(`========================================\n`);

// Verify directories
console.log('Verifying created directories:\n');
dirs.forEach(d => {
  const fullPath = path.join(process.cwd(), d);
  if (fs.existsSync(fullPath)) {
    console.log(`✓ ${d}`);
  } else {
    console.log(`✗ ${d} (NOT FOUND)`);
  }
});

process.exit(failureCount > 0 ? 1 : 0);
