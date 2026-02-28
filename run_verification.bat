@echo off
echo ========== Running Python Script ==========
cd /d "C:\Users\yingjungchen\Downloads\Secure-Enterprise-Browser-Agentic-System"
python verify_and_create_dirs.py

echo.
echo ========== Verifying .gitkeep Files ==========
powershell -Command "Get-ChildItem -Recurse -Filter '.gitkeep' -Path 'C:\Users\yingjungchen\Downloads\Secure-Enterprise-Browser-Agentic-System' | Select-Object FullName"

echo.
echo ========== Verification Complete ==========
