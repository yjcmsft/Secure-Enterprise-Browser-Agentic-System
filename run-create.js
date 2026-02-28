#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

try {
  console.log('Creating project directories...\n');
  const output = execSync('node create-dirs.js', {
    cwd: path.dirname(__filename),
    encoding: 'utf-8',
    stdio: 'pipe'
  });
  console.log(output);
  process.exit(0);
} catch (error) {
  console.error('Error executing create-dirs.js:');
  console.error(error.message);
  process.exit(1);
}
