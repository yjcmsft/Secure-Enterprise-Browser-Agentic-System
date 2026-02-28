const fs = require('fs');
const path = require('path');

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

console.log('Creating directories...\n');

dirs.forEach(d => {
  try {
    fs.mkdirSync(d, { recursive: true });
    console.log(`✓ Created: ${d}`);
  } catch (err) {
    console.error(`✗ Failed to create ${d}: ${err.message}`);
  }
});

console.log('\nAll directories created successfully!');

// Verify directories exist
console.log('\nVerifying directories...\n');
dirs.forEach(d => {
  if (fs.existsSync(d)) {
    console.log(`✓ Verified: ${d}`);
  } else {
    console.error(`✗ Missing: ${d}`);
  }
});
