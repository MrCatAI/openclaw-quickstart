@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1

REM OpenClaw quickstart installer wrapper (Windows CMD)
REM Usage:
REM   curl -fsSL https://openclaw.ai/install.cmd -o install.cmd && install.cmd && del install.cmd

set "SKIP_CONFIG=0"
set "SKIP_START=0"
set "TAG=latest"
set "INSTALL_METHOD=npm"
set "NO_GIT_UPDATE=0"
set "DRY_RUN=0"
set "TAG_SET=0"
set "INSTALL_PS1_URL="
set "BASE_URL="

:parse_args
if "%~1"=="" goto :args_done

if /i "%~1"=="--help" goto :usage
if /i "%~1"=="--skip-config" set "SKIP_CONFIG=1"
if /i "%~1"=="--skip-start" set "SKIP_START=1"
if /i "%~1"=="--git" set "INSTALL_METHOD=git"
if /i "%~1"=="--npm" set "INSTALL_METHOD=npm"
if /i "%~1"=="--no-git-update" set "NO_GIT_UPDATE=1"
if /i "%~1"=="--dry-run" set "DRY_RUN=1"

if /i "%~1"=="--tag" (
  if not "%~2"=="" (
    set "TAG=%~2"
    set "TAG_SET=1"
    shift
  )
  shift
  goto :parse_args
)

set "ARG=%~1"
if not "%ARG%"=="" (
  if not "%ARG:~0,1%"=="-" (
    if "%TAG_SET%"=="0" (
      set "TAG=%ARG%"
      set "TAG_SET=1"
    )
  )
)

shift
goto :parse_args

:args_done
echo.
echo OpenClaw quickstart installer
echo.

curl --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
  echo curl is required. Use PowerShell installer instead.>&2
  exit /b 1
)

powershell -NoProfile -Command "$PSVersionTable.PSVersion.Major" >nul 2>&1
if %ERRORLEVEL% neq 0 (
  echo PowerShell is required.>&2
  exit /b 1
)

set "TMP=%TEMP%\openclaw-quickstart.ps1"

if not "%OPENCLAW_QUICKSTART_BASE_URL%"=="" (
  set "BASE_URL=%OPENCLAW_QUICKSTART_BASE_URL%"
  if "!BASE_URL:~-1!"=="/" set "BASE_URL=!BASE_URL:~0,-1!"
)
if not "%OPENCLAW_INSTALL_PS1_URL%"=="" set "INSTALL_PS1_URL=%OPENCLAW_INSTALL_PS1_URL%"
if "%INSTALL_PS1_URL%"=="" if not "%BASE_URL%"=="" set "INSTALL_PS1_URL=%BASE_URL%/install.ps1"
if "%INSTALL_PS1_URL%"=="" set "INSTALL_PS1_URL=https://openclaw.ai/install.ps1"

if exist "%~dp0install.ps1" (
  copy /Y "%~dp0install.ps1" "%TMP%" >nul
) else (
  curl -fsSL "%INSTALL_PS1_URL%" -o "%TMP%"
)
if %ERRORLEVEL% neq 0 (
  echo Failed to get install.ps1.>&2
  exit /b 1
)

set "PS_ARGS=-Tag ""%TAG%"" -InstallMethod ""%INSTALL_METHOD%"""
if "%SKIP_CONFIG%"=="1" set "PS_ARGS=%PS_ARGS% -SkipConfig"
if "%SKIP_START%"=="1" set "PS_ARGS=%PS_ARGS% -SkipStart"
if "%NO_GIT_UPDATE%"=="1" set "PS_ARGS=%PS_ARGS% -NoGitUpdate"
if "%DRY_RUN%"=="1" set "PS_ARGS=%PS_ARGS% -DryRun"

if "%DRY_RUN%"=="1" echo [OK] dry run enabled
powershell -NoProfile -ExecutionPolicy Bypass -File "%TMP%" %PS_ARGS%
set "RESULT=%ERRORLEVEL%"

del /f "%TMP%" >nul 2>&1
if %RESULT% neq 0 exit /b %RESULT%
exit /b 0

:usage
echo Usage: install.cmd [options] [tag]
echo.
echo Options:
echo   --skip-config    Skip model/channel config
echo   --skip-start     Skip starting Gateway
echo   --git            Install from Git repository
echo   --npm            Install via npm ^(default^)
echo   --tag ^<ver^>      Version tag ^(default: latest^)
echo   --no-git-update  Skip git pull for git install
echo   --dry-run        Print actions without changing system
echo   --help           Show this help
exit /b 0