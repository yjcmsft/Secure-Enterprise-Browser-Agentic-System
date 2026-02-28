@echo off
cd /d "C:\Users\yingjungchen\Downloads\Secure-Enterprise-Browser-Agentic-System"

mkdir src\types
mkdir src\security
mkdir src\browser
mkdir src\api
mkdir src\skills
mkdir src\graph
mkdir src\orchestrator
mkdir app-package\openapi
mkdir infra\modules
mkdir infra\parameters
mkdir .github\workflows
mkdir tests\unit\skills
mkdir tests\unit\security
mkdir tests\unit\browser
mkdir tests\unit\api
mkdir tests\integration\workflows
mkdir tests\integration\security-flows
mkdir tests\e2e

echo All directories created successfully!

REM Verify the directories exist
echo.
echo Verifying directories...
tree /f /a
