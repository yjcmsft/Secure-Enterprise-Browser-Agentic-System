@echo off
setlocal enabledelayedexpansion
echo ============================================
echo  Secure Enterprise Browser Agentic System
echo  Build, Test, and Push Script
echo ============================================
echo.

:: Step 1: Install dependencies
echo [1/5] Installing dependencies...
call npm ci --ignore-scripts
if %ERRORLEVEL% NEQ 0 (
    echo WARN: npm ci failed, trying npm install...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: npm install failed. Exiting.
        exit /b 1
    )
)
echo OK: Dependencies installed.
echo.

:: Step 2: TypeScript type check
echo [2/5] Running TypeScript type check...
call npx tsc --noEmit
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: TypeScript type check failed. Fix errors above before pushing.
    exit /b 1
)
echo OK: TypeScript type check passed.
echo.

:: Step 3: Build
echo [3/5] Building project...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Build failed. Fix errors above before pushing.
    exit /b 1
)
echo OK: Build succeeded.
echo.

:: Step 4: Run tests
echo [4/5] Running tests...
call npm test
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Tests failed. Fix failures above before pushing.
    exit /b 1
)
echo OK: All tests passed.
echo.

:: Step 5: Git commit and push
echo [5/5] Committing and pushing to GitHub...
git add -A
git status

echo.
set /p COMMIT_MSG="Enter commit message (or press Enter for default): "
if "!COMMIT_MSG!"=="" set COMMIT_MSG=feat: complete implementation of Secure Enterprise Browser Agentic System

git commit -m "!COMMIT_MSG!" -m "" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
if %ERRORLEVEL% NEQ 0 (
    echo WARN: Nothing to commit or commit failed.
)

:: Check if remote exists
git remote -v 2>nul | findstr "origin" >nul
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo No git remote 'origin' found.
    set /p REPO_URL="Enter your GitHub repo URL: "
    git remote add origin !REPO_URL!
)

:: Get current branch name
for /f "tokens=*" %%b in ('git rev-parse --abbrev-ref HEAD') do set BRANCH=%%b
echo Pushing to origin/%BRANCH%...
git push -u origin %BRANCH%
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Push failed. Check your remote URL and credentials.
    exit /b 1
)

echo.
echo ============================================
echo  SUCCESS: Build, test, and push complete!
echo ============================================
