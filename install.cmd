@echo off
setlocal enabledelayedexpansion

REM OpenClaw 快速安装器 (Windows CMD)
REM 用法: curl -fsSL https://raw.githubusercontent.com/MrCatAI/openclaw-quickstart/main/install.cmd -o install.cmd && install.cmd && del install.cmd

set "SKIP_CONFIG=0"
set "SKIP_START=0"
set "TAG=latest"
set "INSTALL_METHOD=npm"
set "NO_GIT_UPDATE=0"
set "DRY_RUN=0"
set "TAG_SET=0"
set "INSTALL_PS1_URL="

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
echo   OpenClaw 快速安装器
echo   一键安装并配置模型
echo.

curl --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
  echo curl 未安装，请使用 PowerShell 安装器。 >&2
  exit /b 1
)

powershell -NoProfile -Command "$PSVersionTable.PSVersion.Major" >nul 2>&1
if %ERRORLEVEL% neq 0 (
  echo PowerShell 未安装，请先安装 PowerShell。 >&2
  exit /b 1
)

set "TMP=%TEMP%\openclaw-quickstart.ps1"

REM 允许通过环境变量覆盖 URL
if not "%OPENCLAW_INSTALL_PS1_URL%"=="" set "INSTALL_PS1_URL=%OPENCLAW_INSTALL_PS1_URL%"
if "%INSTALL_PS1_URL%"=="" set "INSTALL_PS1_URL=https://raw.githubusercontent.com/MrCatAI/openclaw-quickstart/main/install.ps1"

REM 优先使用本地文件
if exist "%~dp0install.ps1" (
  copy /Y "%~dp0install.ps1" "%TMP%" >nul
) else (
  curl -fsSL "%INSTALL_PS1_URL%" -o "%TMP%"
)
if %ERRORLEVEL% neq 0 (
  echo 下载 install.ps1 失败 >&2
  exit /b 1
)

REM 构建参数
set "PS_ARGS=-Tag ""%TAG%"" -InstallMethod ""%INSTALL_METHOD%"""
if "%SKIP_CONFIG%"=="1" set "PS_ARGS=%PS_ARGS% -SkipConfig"
if "%SKIP_START%"=="1" set "PS_ARGS=%PS_ARGS% -SkipStart"
if "%NO_GIT_UPDATE%"=="1" set "PS_ARGS=%PS_ARGS% -NoGitUpdate"
if "%DRY_RUN%"=="1" set "PS_ARGS=%PS_ARGS% -DryRun"

if "%DRY_RUN%"=="1" echo [OK] 模拟运行 ^(将委托给 install.ps1^)
powershell -NoProfile -ExecutionPolicy Bypass -File "%TMP%" %PS_ARGS%
set "RESULT=%ERRORLEVEL%"

del /f "%TMP%" >nul 2>&1

if %RESULT% neq 0 exit /b %RESULT%
exit /b 0

:usage
echo 用法: install.cmd [选项] [tag]
echo.
echo 选项:
echo   --skip-config    跳过模型配置
echo   --skip-start     跳过启动 Gateway
echo   --git            从 Git 仓库安装
echo   --npm            通过 npm 安装 ^(默认^)
echo   --tag ^<ver^>     指定版本标签 ^(默认: latest^)
echo   --no-git-update  跳过 git pull ^(用于 git 安装方式^)
echo   --dry-run        模拟运行，不实际执行更改
echo   --help           显示帮助
exit /b 0