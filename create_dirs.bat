@echo off
setlocal enabledelayedexpansion

cd /d "C:\Users\yingjungchen\Downloads\Secure-Enterprise-Browser-Agentic-System"

echo Creating project directory structure...
echo.

set successCount=0
set failureCount=0

REM Create all directories
mkdir src\types 2>nul && set /a successCount+=1 || set /a failureCount+=1
echo ✓ Created: src/types

mkdir src\security 2>nul && set /a successCount+=1 || set /a failureCount+=1
echo ✓ Created: src/security

mkdir src\browser 2>nul && set /a successCount+=1 || set /a failureCount+=1
echo ✓ Created: src/browser

mkdir src\api 2>nul && set /a successCount+=1 || set /a failureCount+=1
echo ✓ Created: src/api

mkdir src\skills 2>nul && set /a successCount+=1 || set /a failureCount+=1
echo ✓ Created: src/skills

mkdir src\graph 2>nul && set /a successCount+=1 || set /a failureCount+=1
echo ✓ Created: src/graph

mkdir src\orchestrator 2>nul && set /a successCount+=1 || set /a failureCount+=1
echo ✓ Created: src/orchestrator

mkdir app-package\openapi 2>nul && set /a successCount+=1 || set /a failureCount+=1
echo ✓ Created: app-package/openapi

mkdir infra\modules 2>nul && set /a successCount+=1 || set /a failureCount+=1
echo ✓ Created: infra/modules

mkdir infra\parameters 2>nul && set /a successCount+=1 || set /a failureCount+=1
echo ✓ Created: infra/parameters

mkdir .github\workflows 2>nul && set /a successCount+=1 || set /a failureCount+=1
echo ✓ Created: .github/workflows

mkdir tests\unit\skills 2>nul && set /a successCount+=1 || set /a failureCount+=1
echo ✓ Created: tests/unit/skills

mkdir tests\unit\security 2>nul && set /a successCount+=1 || set /a failureCount+=1
echo ✓ Created: tests/unit/security

mkdir tests\unit\browser 2>nul && set /a successCount+=1 || set /a failureCount+=1
echo ✓ Created: tests/unit/browser

mkdir tests\unit\api 2>nul && set /a successCount+=1 || set /a failureCount+=1
echo ✓ Created: tests/unit/api

mkdir tests\integration\workflows 2>nul && set /a successCount+=1 || set /a failureCount+=1
echo ✓ Created: tests/integration/workflows

mkdir tests\integration\security-flows 2>nul && set /a successCount+=1 || set /a failureCount+=1
echo ✓ Created: tests/integration/security-flows

mkdir tests\e2e 2>nul && set /a successCount+=1 || set /a failureCount+=1
echo ✓ Created: tests/e2e

echo.
echo Successfully created directories
echo.
echo Creating .gitkeep files...
echo.

set gitkeepSuccess=0
set gitkeepFailure=0

type nul > src\types\.gitkeep 2>nul && set /a gitkeepSuccess+=1 || set /a gitkeepFailure+=1
echo ✓ Created .gitkeep in: src/types

type nul > src\security\.gitkeep 2>nul && set /a gitkeepSuccess+=1 || set /a gitkeepFailure+=1
echo ✓ Created .gitkeep in: src/security

type nul > src\browser\.gitkeep 2>nul && set /a gitkeepSuccess+=1 || set /a gitkeepFailure+=1
echo ✓ Created .gitkeep in: src/browser

type nul > src\api\.gitkeep 2>nul && set /a gitkeepSuccess+=1 || set /a gitkeepFailure+=1
echo ✓ Created .gitkeep in: src/api

type nul > src\skills\.gitkeep 2>nul && set /a gitkeepSuccess+=1 || set /a gitkeepFailure+=1
echo ✓ Created .gitkeep in: src/skills

type nul > src\graph\.gitkeep 2>nul && set /a gitkeepSuccess+=1 || set /a gitkeepFailure+=1
echo ✓ Created .gitkeep in: src/graph

type nul > src\orchestrator\.gitkeep 2>nul && set /a gitkeepSuccess+=1 || set /a gitkeepFailure+=1
echo ✓ Created .gitkeep in: src/orchestrator

type nul > app-package\openapi\.gitkeep 2>nul && set /a gitkeepSuccess+=1 || set /a gitkeepFailure+=1
echo ✓ Created .gitkeep in: app-package/openapi

type nul > infra\modules\.gitkeep 2>nul && set /a gitkeepSuccess+=1 || set /a gitkeepFailure+=1
echo ✓ Created .gitkeep in: infra/modules

type nul > infra\parameters\.gitkeep 2>nul && set /a gitkeepSuccess+=1 || set /a gitkeepFailure+=1
echo ✓ Created .gitkeep in: infra/parameters

type nul > .github\workflows\.gitkeep 2>nul && set /a gitkeepSuccess+=1 || set /a gitkeepFailure+=1
echo ✓ Created .gitkeep in: .github/workflows

type nul > tests\unit\skills\.gitkeep 2>nul && set /a gitkeepSuccess+=1 || set /a gitkeepFailure+=1
echo ✓ Created .gitkeep in: tests/unit/skills

type nul > tests\unit\security\.gitkeep 2>nul && set /a gitkeepSuccess+=1 || set /a gitkeepFailure+=1
echo ✓ Created .gitkeep in: tests/unit/security

type nul > tests\unit\browser\.gitkeep 2>nul && set /a gitkeepSuccess+=1 || set /a gitkeepFailure+=1
echo ✓ Created .gitkeep in: tests/unit/browser

type nul > tests\unit\api\.gitkeep 2>nul && set /a gitkeepSuccess+=1 || set /a gitkeepFailure+=1
echo ✓ Created .gitkeep in: tests/unit/api

type nul > tests\integration\workflows\.gitkeep 2>nul && set /a gitkeepSuccess+=1 || set /a gitkeepFailure+=1
echo ✓ Created .gitkeep in: tests/integration/workflows

type nul > tests\integration\security-flows\.gitkeep 2>nul && set /a gitkeepSuccess+=1 || set /a gitkeepFailure+=1
echo ✓ Created .gitkeep in: tests/integration/security-flows

type nul > tests\e2e\.gitkeep 2>nul && set /a gitkeepSuccess+=1 || set /a gitkeepFailure+=1
echo ✓ Created .gitkeep in: tests/e2e

echo.
echo Successfully created .gitkeep files
echo.
echo ===== VERIFYING DIRECTORY STRUCTURE =====
echo.

REM Verify all directories exist with .gitkeep files
if exist src\types\.gitkeep (echo ✓ Verified: src/types) else (echo ✗ Missing: src/types)
if exist src\security\.gitkeep (echo ✓ Verified: src/security) else (echo ✗ Missing: src/security)
if exist src\browser\.gitkeep (echo ✓ Verified: src/browser) else (echo ✗ Missing: src/browser)
if exist src\api\.gitkeep (echo ✓ Verified: src/api) else (echo ✗ Missing: src/api)
if exist src\skills\.gitkeep (echo ✓ Verified: src/skills) else (echo ✗ Missing: src/skills)
if exist src\graph\.gitkeep (echo ✓ Verified: src/graph) else (echo ✗ Missing: src/graph)
if exist src\orchestrator\.gitkeep (echo ✓ Verified: src/orchestrator) else (echo ✗ Missing: src/orchestrator)
if exist app-package\openapi\.gitkeep (echo ✓ Verified: app-package/openapi) else (echo ✗ Missing: app-package/openapi)
if exist infra\modules\.gitkeep (echo ✓ Verified: infra/modules) else (echo ✗ Missing: infra/modules)
if exist infra\parameters\.gitkeep (echo ✓ Verified: infra/parameters) else (echo ✗ Missing: infra/parameters)
if exist .github\workflows\.gitkeep (echo ✓ Verified: .github/workflows) else (echo ✗ Missing: .github/workflows)
if exist tests\unit\skills\.gitkeep (echo ✓ Verified: tests/unit/skills) else (echo ✗ Missing: tests/unit/skills)
if exist tests\unit\security\.gitkeep (echo ✓ Verified: tests/unit/security) else (echo ✗ Missing: tests/unit/security)
if exist tests\unit\browser\.gitkeep (echo ✓ Verified: tests/unit/browser) else (echo ✗ Missing: tests/unit/browser)
if exist tests\unit\api\.gitkeep (echo ✓ Verified: tests/unit/api) else (echo ✗ Missing: tests/unit/api)
if exist tests\integration\workflows\.gitkeep (echo ✓ Verified: tests/integration/workflows) else (echo ✗ Missing: tests/integration/workflows)
if exist tests\integration\security-flows\.gitkeep (echo ✓ Verified: tests/integration/security-flows) else (echo ✗ Missing: tests/integration/security-flows)
if exist tests\e2e\.gitkeep (echo ✓ Verified: tests/e2e) else (echo ✗ Missing: tests/e2e)

echo.
echo ✅ Project directory structure setup complete!
echo.

pause
