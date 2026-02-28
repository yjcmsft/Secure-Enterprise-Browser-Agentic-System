@echo off
setlocal enabledelayedexpansion

cd /d "C:\Users\yingjungchen\Downloads\Secure-Enterprise-Browser-Agentic-System"

echo Creating directory structure...
echo.

REM Create all directories
mkdir "src\types" 2>nul
mkdir "src\security" 2>nul
mkdir "src\browser" 2>nul
mkdir "src\api" 2>nul
mkdir "src\skills" 2>nul
mkdir "src\graph" 2>nul
mkdir "src\orchestrator" 2>nul
mkdir "app-package\openapi" 2>nul
mkdir "infra\modules" 2>nul
mkdir "infra\parameters" 2>nul
mkdir ".github\workflows" 2>nul
mkdir "tests\unit\skills" 2>nul
mkdir "tests\unit\security" 2>nul
mkdir "tests\unit\browser" 2>nul
mkdir "tests\unit\api" 2>nul
mkdir "tests\integration\workflows" 2>nul
mkdir "tests\integration\security-flows" 2>nul
mkdir "tests\e2e" 2>nul

echo Creating .gitkeep files...
echo.

REM Create .gitkeep files
type nul > "src\types\.gitkeep"
type nul > "src\security\.gitkeep"
type nul > "src\browser\.gitkeep"
type nul > "src\api\.gitkeep"
type nul > "src\skills\.gitkeep"
type nul > "src\graph\.gitkeep"
type nul > "src\orchestrator\.gitkeep"
type nul > "app-package\openapi\.gitkeep"
type nul > "infra\modules\.gitkeep"
type nul > "infra\parameters\.gitkeep"
type nul > ".github\workflows\.gitkeep"
type nul > "tests\unit\skills\.gitkeep"
type nul > "tests\unit\security\.gitkeep"
type nul > "tests\unit\browser\.gitkeep"
type nul > "tests\unit\api\.gitkeep"
type nul > "tests\integration\workflows\.gitkeep"
type nul > "tests\integration\security-flows\.gitkeep"
type nul > "tests\e2e\.gitkeep"

echo.
echo ===== VERIFYING DIRECTORY STRUCTURE =====
echo.

REM Verify directories and .gitkeep files exist
set count=0
for /f "tokens=*" %%A in ('dir /s /b "src\types\.gitkeep" "src\security\.gitkeep" "src\browser\.gitkeep" "src\api\.gitkeep" "src\skills\.gitkeep" "src\graph\.gitkeep" "src\orchestrator\.gitkeep" "app-package\openapi\.gitkeep" "infra\modules\.gitkeep" "infra\parameters\.gitkeep" ".github\workflows\.gitkeep" "tests\unit\skills\.gitkeep" "tests\unit\security\.gitkeep" "tests\unit\browser\.gitkeep" "tests\unit\api\.gitkeep" "tests\integration\workflows\.gitkeep" "tests\integration\security-flows\.gitkeep" "tests\e2e\.gitkeep" 2^>nul') do (
    echo ✓ %%A
    set /a count+=1
)

echo.
echo Total .gitkeep files created: !count!/18
echo.
echo ✅ Project directory structure setup complete!
