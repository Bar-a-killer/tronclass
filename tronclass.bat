@echo off
SETLOCAL

REM --- Configuration ---
set "ROOT_DIR=%~dp0"
set "FRONTEND_PORT=5173"
set "BACKEND_PORT=3000"

echo.
echo ===========================================
echo Starting Development Environment
echo ===========================================
echo.

REM --- Step 1: Install Dependencies (Synchronous) ---
echo [1/4] Checking dependencies... This may take a moment.
call npm install
if errorlevel 1 (
echo.
echo ERROR: npm install failed in root directory. Please check logs.
goto :end
)

echo.
echo [2/4] Installing client dependencies...
cd client
call npm install
if errorlevel 1 (
echo.
echo ERROR: npm install failed in client directory. Please check logs.
goto :end
)
cd ..
REM --- Step 2: Compile Main Application Code ---
echo.
echo [3/4] Compiling main application code (npm run build)...
REM runing build script to compile TypeScript code
call npm run build
if errorlevel 1 (
echo.
echo ERROR: Main application compilation failed. Check your TypeScript configuration.
goto :end
)
REM --- Step 2: Start Backend API Service (Non-blocking) ---
echo.
echo [4/4] Launching backend API service (Port %BACKEND_PORT%)...
start "Backend Server" cmd /k "npm run server"

REM --- Step 3: Start Frontend Vite Dev Server (Non-blocking) ---
echo Launching frontend Vite server (Port %FRONTEND_PORT%)...
start "Frontend Dev Server" cmd /k "cd client && npm run dev"

REM Give services a moment to start up
timeout /t 5 /nobreak >nul

REM --- Step 4: Open Browser ---
echo.
echo Opening browser to access the Web UI...
REM Assuming Vite starts on the default port 5173
start "Frontend UI" http://localhost:%FRONTEND_PORT%

:end
echo.
echo ===========================================
echo Setup complete. Close this window to stop services.
echo ===========================================
pause