const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const projectDir = 'C:\\Users\\yingjungchen\\Downloads\\Secure-Enterprise-Browser-Agentic-System';

try {
  console.log('===== RUNNING CREATE-DIRS.BAT =====\n');
  
  // Run the batch file
  const result = execSync('cmd /c create-dirs.bat', { 
    cwd: projectDir,
    stdio: 'inherit'
  });
  
  console.log('\n\n===== DIRECTORY STRUCTURE (dir /s) =====\n');
  
  // Run dir /s
  execSync('cmd /c dir /s', { 
    cwd: projectDir,
    stdio: 'inherit'
  });
  
} catch (error) {
  console.error('Error executing commands:', error.message);
  process.exit(1);
}
