@echo off
setlocal
cd /d "%~dp0"
echo.
echo ======================================================
echo    BEM-VINDO AO FUT PRO DASHBOARD
echo ======================================================
echo.
echo [1/2] Iniciando servidor de dados e interface...
echo [2/2] O navegador sera aberto automaticamente em instantes.
echo.
echo DICA: Mantenha esta janela aberta enquanto estiver usando.
echo Para encerrar, basta fechar esta janela.
echo.
echo ======================================================
echo.

npm run dev
