@echo off
REM This batch file creates all project directories and .gitkeep files
cd /d "C:\Users\yingjungchen\Downloads\Secure-Enterprise-Browser-Agentic-System"

REM Create all directories
for %%D in (
    "src\types"
    "src\security"
    "src\browser"
    "src\api"
    "src\skills"
    "src\graph"
    "src\orchestrator"
    "app-package\openapi"
    "infra\modules"
    "infra\parameters"
    ".github\workflows"
    "tests\unit\skills"
    "tests\unit\security"
    "tests\unit\browser"
    "tests\unit\api"
    "tests\integration\workflows"
    "tests\integration\security-flows"
    "tests\e2e"
) do (
    if not exist "%%D" (
        mkdir "%%D"
        echo Created: %%D
    )
    REM Create .gitkeep file
    type nul > "%%D\.gitkeep"
    echo Created .gitkeep in: %%D
)

echo.
echo All directories created successfully!
echo.
echo Verifying directory structure...
tree /f /a

pause
