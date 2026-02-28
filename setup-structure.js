#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Change to the project directory
const projectDir = 'C:\\Users\\yingjungchen\\Downloads\\Secure-Enterprise-Browser-Agentic-System';
process.chdir(projectDir);

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

console.log('Creating project directory structure...\n');

// Create all directories
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

// Now create .gitkeep files in each leaf directory
console.log('\nCreating .gitkeep files...\n');

let gitkeepSuccess = 0;
let gitkeepFailure = 0;

dirs.forEach(d => {
  try {
    const gitkeepPath = path.join(d, '.gitkeep');
    fs.writeFileSync(gitkeepPath, '');
    console.log(`✓ Created .gitkeep in: ${d}`);
    gitkeepSuccess++;
  } catch (err) {
    console.error(`✗ Failed to create .gitkeep in ${d}: ${err.message}`);
    gitkeepFailure++;
  }
});

console.log(`\n✓ Successfully created ${gitkeepSuccess} .gitkeep files`);
if (gitkeepFailure > 0) {
  console.log(`✗ Failed to create ${gitkeepFailure} .gitkeep files`);
}

// Verify directories exist
console.log('\n===== VERIFYING DIRECTORY STRUCTURE =====\n');

function listDirs(dir, indent = '') {
  try {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        console.log(`${indent}📁 ${file}/`);
        listDirs(filePath, indent + '  ');
      } else if (file === '.gitkeep') {
        console.log(`${indent}  └─ .gitkeep`);
      }
    });
  } catch (err) {
    console.error(`Error listing ${dir}: ${err.message}`);
  }
}

listDirs('.');

console.log('\n✅ Project directory structure setup complete!');
