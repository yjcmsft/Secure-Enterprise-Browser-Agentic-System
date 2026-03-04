const fs = require('fs');
const path = require('path');

const directories = [
  'tests/unit/graph',
  'tests/unit/orchestrator',
  'tests/unit/config',
  'tests/unit/agui',
  'tests/unit/foundry',
  'src/fabric',
  'tests/unit/fabric'
];

directories.forEach(d => {
  fs.mkdirSync(d, { recursive: true });
  console.log(`Created: ${d}`);
});

console.log('All directories created successfully!');
