const fs = require('fs');
const path = require('path');

// Change to the target directory
process.chdir('C:\\Users\\yingjungchen\\Downloads\\Secure-Enterprise-Browser-Agentic-System');

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

let successCount = 0;
let failureCount = 0;

dirs.forEach(d => {
  try {
    fs.mkdirSync(d, { recursive: true });
    console.log(`✓ Created: ${d}`);
    successCount++;
  } catch (err) {
    console.error(`✗ Failed to create ${d}: ${err.message}`);
    failureCount++;
  }
});

console.log(`\n✓ Successfully created ${successCount} directories`);
if (failureCount > 0) {
  console.log(`✗ Failed to create ${failureCount} directories`);
}
