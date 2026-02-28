@echo off
REM This batch file creates 18 directories with .gitkeep files
REM Navigate to project directory
cd /d "C:\Users\yingjungchen\Downloads\Secure-Enterprise-Browser-Agentic-System"

setlocal enabledelayedexpansion

echo.
echo ===== Creating Directory Structure =====
echo.

REM Create directories - mkdir will create intermediate directories
mkdir "src\types" 2>nul
echo ✓ Created: src\types

mkdir "src\security" 2>nul
echo ✓ Created: src\security

mkdir "src\browser" 2>nul
echo ✓ Created: src\browser

mkdir "src\api" 2>nul
echo ✓ Created: src\api

mkdir "src\skills" 2>nul
echo ✓ Created: src\skills

mkdir "src\graph" 2>nul
echo ✓ Created: src\graph

mkdir "src\orchestrator" 2>nul
echo ✓ Created: src\orchestrator

mkdir "app-package\openapi" 2>nul
echo ✓ Created: app-package\openapi

mkdir "infra\modules" 2>nul
echo ✓ Created: infra\modules

mkdir "infra\parameters" 2>nul
echo ✓ Created: infra\parameters

mkdir ".github\workflows" 2>nul
echo ✓ Created: .github\workflows

mkdir "tests\unit\skills" 2>nul
echo ✓ Created: tests\unit\skills

mkdir "tests\unit\security" 2>nul
echo ✓ Created: tests\unit\security

mkdir "tests\unit\browser" 2>nul
echo ✓ Created: tests\unit\browser

mkdir "tests\unit\api" 2>nul
echo ✓ Created: tests\unit\api

mkdir "tests\integration\workflows" 2>nul
echo ✓ Created: tests\integration\workflows

mkdir "tests\integration\security-flows" 2>nul
echo ✓ Created: tests\integration\security-flows

mkdir "tests\e2e" 2>nul
echo ✓ Created: tests\e2e

echo.
echo ===== Creating .gitkeep Files =====
echo.

REM Create .gitkeep files using echo (creates empty or file with content)
echo. > "src\types\.gitkeep" 2>nul
echo ✓ Created .gitkeep in: src\types

echo. > "src\security\.gitkeep" 2>nul
echo ✓ Created .gitkeep in: src\security

echo. > "src\browser\.gitkeep" 2>nul
echo ✓ Created .gitkeep in: src\browser

echo. > "src\api\.gitkeep" 2>nul
echo ✓ Created .gitkeep in: src\api

echo. > "src\skills\.gitkeep" 2>nul
echo ✓ Created .gitkeep in: src\skills

echo. > "src\graph\.gitkeep" 2>nul
echo ✓ Created .gitkeep in: src\graph

echo. > "src\orchestrator\.gitkeep" 2>nul
echo ✓ Created .gitkeep in: src\orchestrator

echo. > "app-package\openapi\.gitkeep" 2>nul
echo ✓ Created .gitkeep in: app-package\openapi

echo. > "infra\modules\.gitkeep" 2>nul
echo ✓ Created .gitkeep in: infra\modules

echo. > "infra\parameters\.gitkeep" 2>nul
echo ✓ Created .gitkeep in: infra\parameters

echo. > ".github\workflows\.gitkeep" 2>nul
echo ✓ Created .gitkeep in: .github\workflows

echo. > "tests\unit\skills\.gitkeep" 2>nul
echo ✓ Created .gitkeep in: tests\unit\skills

echo. > "tests\unit\security\.gitkeep" 2>nul
echo ✓ Created .gitkeep in: tests\unit\security

echo. > "tests\unit\browser\.gitkeep" 2>nul
echo ✓ Created .gitkeep in: tests\unit\browser

echo. > "tests\unit\api\.gitkeep" 2>nul
echo ✓ Created .gitkeep in: tests\unit\api

echo. > "tests\integration\workflows\.gitkeep" 2>nul
echo ✓ Created .gitkeep in: tests\integration\workflows

echo. > "tests\integration\security-flows\.gitkeep" 2>nul
echo ✓ Created .gitkeep in: tests\integration\security-flows

echo. > "tests\e2e\.gitkeep" 2>nul
echo ✓ Created .gitkeep in: tests\e2e

echo.
echo ===== VERIFYING DIRECTORY STRUCTURE =====
echo.

REM Count and display .gitkeep files
for /r . %%F in (.gitkeep) do (
    echo ✓ %%F
)

echo.
echo ===== SUMMARY =====
echo.
echo Checking for all 18 .gitkeep files...
setlocal enabledelayedexpansion

set count=0
if exist "src\types\.gitkeep" set /a count+=1
if exist "src\security\.gitkeep" set /a count+=1
if exist "src\browser\.gitkeep" set /a count+=1
if exist "src\api\.gitkeep" set /a count+=1
if exist "src\skills\.gitkeep" set /a count+=1
if exist "src\graph\.gitkeep" set /a count+=1
if exist "src\orchestrator\.gitkeep" set /a count+=1
if exist "app-package\openapi\.gitkeep" set /a count+=1
if exist "infra\modules\.gitkeep" set /a count+=1
if exist "infra\parameters\.gitkeep" set /a count+=1
if exist ".github\workflows\.gitkeep" set /a count+=1
if exist "tests\unit\skills\.gitkeep" set /a count+=1
if exist "tests\unit\security\.gitkeep" set /a count+=1
if exist "tests\unit\browser\.gitkeep" set /a count+=1
if exist "tests\unit\api\.gitkeep" set /a count+=1
if exist "tests\integration\workflows\.gitkeep" set /a count+=1
if exist "tests\integration\security-flows\.gitkeep" set /a count+=1
if exist "tests\e2e\.gitkeep" set /a count+=1

echo Total .gitkeep files found: !count!/18
echo.

if !count! equ 18 (
    echo ✅ SUCCESS: All 18 directories with .gitkeep files have been created!
) else (
    echo ⚠️  WARNING: Only !count! out of 18 .gitkeep files were found.
)

echo.
pause
