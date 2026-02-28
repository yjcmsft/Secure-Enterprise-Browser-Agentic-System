@echo off
REM Execute the directory creation script
call create-dirs.bat

echo.
echo ====================================
echo VERIFICATION: Directory Structure
echo ====================================
echo.

REM List all directories
dir /s /b /ad

echo.
echo ====================================
echo Directory creation and verification complete!
echo ====================================
