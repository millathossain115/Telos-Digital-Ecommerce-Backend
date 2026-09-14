@echo off
title TelosCart E-Commerce Backend
echo ========================================================
echo   Starting TelosCart E-Commerce Backend Environment
echo   Website: https://www.teloscart.website/
echo ========================================================
echo.

:: 1. Verify .env file
if not exist ".env" (
    echo [INFO] .env not found. Copying from .env.example...
    copy ".env.example" ".env"
    echo [OK] Created .env
)

:: 2. Verify node_modules
if not exist "node_modules\" (
    echo [INFO] node_modules not found. Installing dependencies...
    call npm install
)

:: 3. Run Prisma client generation
echo [INFO] Generating Prisma Client...
call npm run db:generate

:: 4. Start Dev Server
echo.
echo ========================================================
echo   Running Backend Server (Port 5000)
echo   Backend URL:   http://localhost:5000/api/v1
echo   Swagger Docs:  http://localhost:5000/api/v1/docs
echo   Health Check:  http://localhost:5000/api/v1/health
echo ========================================================
echo.

call npm run dev
pause
