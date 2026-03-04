const { execSync } = require('child_process');
const path = require('path');

const dir = 'C:\\Users\\yingjungchen\\Downloads\\Secure-Enterprise-Browser-Agentic-System';
process.chdir(dir);

const files = [
  'create-dirs.bat',
  'create_dirs.bat',
  'create-all-dirs.bat',
  'create_all_dirs.bat',
  'temp-create-dirs.bat',
  'run-create-dirs.bat',
  'run-setup.bat',
  'manual_setup.bat',
  'verify-dirs.bat',
  'run_verification.bat',
  'create-dirs.js',
  'exec-create-dirs.js',
  'execute-create-dirs.js',
  'temp-create.js',
  'run-create.js',
  'run-commands.js',
  'quick_setup.py',
  'setup_structure.py',
  'verify_and_create_dirs.py'
];

try {
  const cmd = `git rm ${files.join(' ')}`;
  console.log('Executing:', cmd);
  execSync(cmd, { stdio: 'inherit' });
  console.log('Files removed successfully');
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
