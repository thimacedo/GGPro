@echo off
taskkill /f /im node.exe >nul 2>&1
if exist "dist" rmdir /s /q "dist" >nul 2>&1
exit /b 0