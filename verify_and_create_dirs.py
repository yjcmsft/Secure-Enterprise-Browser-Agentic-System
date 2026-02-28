#!/usr/bin/env python3
import os
import sys

# Change to project directory
project_dir = r'C:\Users\yingjungchen\Downloads\Secure-Enterprise-Browser-Agentic-System'
os.chdir(project_dir)

dirs = [
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
]

print("Creating project directory structure...\n")

success_count = 0
failure_count = 0

# Create directories
for d in dirs:
    try:
        os.makedirs(d, exist_ok=True)
        print(f"✓ Created: {d}")
        success_count += 1
    except Exception as e:
        print(f"✗ Failed to create {d}: {str(e)}")
        failure_count += 1

print(f"\n✓ Successfully created {success_count} directories")
if failure_count > 0:
    print(f"✗ Failed to create {failure_count} directories")

# Create .gitkeep files
print("\nCreating .gitkeep files...\n")

gitkeep_success = 0
gitkeep_failure = 0

for d in dirs:
    try:
        gitkeep_path = os.path.join(d, '.gitkeep')
        with open(gitkeep_path, 'w') as f:
            f.write('')
        print(f"✓ Created .gitkeep in: {d}")
        gitkeep_success += 1
    except Exception as e:
        print(f"✗ Failed to create .gitkeep in {d}: {str(e)}")
        gitkeep_failure += 1

print(f"\n✓ Successfully created {gitkeep_success} .gitkeep files")
if gitkeep_failure > 0:
    print(f"✗ Failed to create {gitkeep_failure} .gitkeep files")

# Verify directories
print("\n===== VERIFYING DIRECTORY STRUCTURE =====\n")

def list_dirs(dir_path, indent=''):
    try:
        items = sorted(os.listdir(dir_path))
        for item in items:
            full_path = os.path.join(dir_path, item)
            if os.path.isdir(full_path):
                print(f"{indent}📁 {item}/")
                if item in ['src', 'app-package', 'infra', '.github', 'tests']:
                    list_dirs(full_path, indent + '  ')
            elif item == '.gitkeep':
                print(f"{indent}  └─ .gitkeep")
    except Exception as e:
        print(f"Error listing {dir_path}: {str(e)}")

list_dirs('.')

print("\n✅ Project directory structure setup complete!")
