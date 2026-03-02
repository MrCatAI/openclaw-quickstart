@echo off
setlocal enabledelayedexpansion

REM ============================================================
REM OpenClaw Quick Install - Windows One-Click Installer
REM 
REM 用法: 
REM   1. 双击运行此文件
REM   2. 或在 CMD 中执行: quick-install.cmd
REM   3. 或在 PowerShell 中执行: .\quick-install.cmd
REM
REM 此脚本将:
REM   1. 检查并安装 Node.js 22+ (如果需要)
REM   2. 安装 OpenClaw
REM   3. 启动 Web 配置向导
REM   4. 等待用户完成配置
REM   5. 启动 OpenClaw Gateway 服务
REM ============================================================

title OpenClaw Quick Install

REM 颜色定义
for /F %%a in ('echo prompt $E^| cmd') do set "ESC=%%a"
set "RED=%ESC%[91m"
set "GREEN=%ESC%[92m"
set "YELLOW=%ESC%[93m"
set "CYAN=%ESC%[96m"
set "BOLD=%ESC%[1m"
set "RESET=%ESC%[0m"

echo.
echo %CYAN%%BOLD%============================================================%RESET%
echo %CYAN%%BOLD%                                                          %RESET%
echo %CYAN%%BOLD%   %RESET%%CYAN%%BOLD% OpenClaw Quick Install - Windows%RESET%
echo %CYAN%%BOLD%                                                          %RESET%
echo %CYAN%%BOLD%============================================================%RESET%
echo.
echo %YELLOW%此脚本将自动完成以下操作:%RESET%
echo   1. 检查并安装 Node.js 22+ (如果需要)
echo   2. 安装 OpenClaw
echo   3. 启动 Web 配置向导 (浏览器)
echo   4. 配置完成后启动 OpenClaw 服务
echo.
echo %CYAN%按任意键开始安装，或 Ctrl+C 取消...%RESET%
pause >nul

REM Step 1: 检查 Node.js
echo.
echo %CYAN%%BOLD%[1/4] 检查 Node.js 环境...%RESET%
echo.

node --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo %YELLOW%未检测到 Node.js，正在安装...%RESET%
    echo.
    
    REM 尝试使用 winget 安装
    winget --version >nul 2>&1
    if %ERRORLEVEL% equ 0 (
        echo %CYAN%使用 winget 安装 Node.js LTS...%RESET%
        winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
        
        REM 刷新环境变量
        for /f "tokens=2*" %%a in ('reg query "HKCU\Environment" /v Path 2^>nul') do set "USER_PATH=%%b"
        for /f "tokens=2*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "SYS_PATH=%%b"
        set "PATH=%SYS_PATH%;%USER_PATH%"
    ) else (
        echo %RED%错误: 未找到 winget，请手动安装 Node.js%RESET%
        echo %YELLOW%下载地址: https://nodejs.org/%RESET%
        echo.
        pause
        exit /b 1
    )
)

REM 验证 Node.js 版本
for /f "tokens=1 delims=v" %%a in ('node -v 2^>nul') do set NODE_VERSION=%%a
for /f "tokens=1 delims=." %%a in ("%NODE_VERSION%") do set NODE_MAJOR=%%a

if %NODE_MAJOR% LSS 22 (
    echo %RED%错误: Node.js 版本过低 (当前: v%NODE_VERSION%)，需要 v22 或更高%RESET%
    echo %YELLOW%请更新 Node.js: https://nodejs.org/%RESET%
    pause
    exit /b 1
)

echo %GREEN%Node.js v%NODE_VERSION% 已就绪%RESET%

REM Step 2: 安装 OpenClaw
echo.
echo %CYAN%%BOLD%[2/4] 安装 OpenClaw...%RESET%
echo.

REM 检查是否已安装
openclaw --version >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo %GREEN%OpenClaw 已安装%RESET%
    for /f "delims=" %%a in ('openclaw --version 2^>nul') do echo %CYAN%当前版本: %%a%RESET%
) else (
    echo %CYAN%正在安装 OpenClaw (可能需要几分钟)...%RESET%
    call npm install -g openclaw@latest --no-fund --no-audit
    
    if %ERRORLEVEL% neq 0 (
        echo %RED%安装失败，请检查网络连接或尝试手动安装:%RESET%
        echo %YELLOW%  npm install -g openclaw@latest%RESET%
        pause
        exit /b 1
    )
    echo %GREEN%OpenClaw 安装成功！%RESET%
)

REM Step 3: 启动 Web 配置向导
echo.
echo %CYAN%%BOLD%[3/4] 启动配置向导...%RESET%
echo.

REM 获取脚本所在目录
set "SCRIPT_DIR=%~dp0"

echo %CYAN%正在启动 Web 配置服务...%RESET%
echo %YELLOW%配置页面将自动在浏览器中打开%RESET%
echo.

REM 在后台启动 web-config.js
start /b node "%SCRIPT_DIR%..\web-config.js"

REM 等待服务启动
timeout /t 3 /nobreak >nul

REM 打开浏览器
start http://127.0.0.1:18792

echo.
echo %GREEN%============================================================%RESET%
echo %GREEN%  Web 配置向导已在浏览器中打开%RESET%
echo %GREEN%============================================================%RESET%
echo.
echo %YELLOW%请在浏览器中完成以下配置:%RESET%
echo   1. 选择 AI 模型提供商
echo   2. 输入 API Key
echo   3. 选择聊天渠道 (可选)
echo   4. 点击 "保存并启动"
echo.
echo %CYAN%配置完成后，此窗口将自动继续...%RESET%
echo.

REM 等待配置文件生成
set "CONFIG_FILE=%USERPROFILE%\.openclaw\openclaw.json"
set "CONFIG_WAIT=0"
set "CONFIG_MAX_WAIT=300"

:wait_config
if exist "%CONFIG_FILE%" goto :config_done
timeout /t 1 /nobreak >nul
set /a CONFIG_WAIT+=1

if %CONFIG_WAIT% LSS %CONFIG_MAX_WAIT% goto :wait_config

echo %YELLOW%等待配置超时，请手动完成配置后按任意键继续...%RESET%
pause >nul

:config_done
echo %GREEN%配置已完成！%RESET%

REM Step 4: 启动 OpenClaw 服务
echo.
echo %CYAN%%BOLD%[4/4] 启动 OpenClaw 服务...%RESET%
echo.

REM 停止 web-config 服务 (通过端口)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":18792" ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)

REM 安装并启动 Gateway 守护进程
echo %CYAN%配置 Gateway 守护进程...%RESET%
openclaw onboard --install-daemon >nul 2>&1

echo %CYAN%启动 Gateway...%RESET%
start /b openclaw gateway

timeout /t 3 /nobreak >nul

REM 显示完成信息
echo.
echo %GREEN%%BOLD%============================================================%RESET%
echo %GREEN%%BOLD%                                                          %RESET%
echo %GREEN%%BOLD%   OpenClaw 安装并配置完成！                              %RESET%
echo %GREEN%%BOLD%                                                          %RESET%
echo %GREEN%%BOLD%============================================================%RESET%
echo.
echo %CYAN%访问信息:%RESET%
echo   Web 界面: %YELLOW%http://127.0.0.1:18789%RESET%
echo   配置文件: %YELLOW%%CONFIG_FILE%%RESET%
echo.
echo %CYAN%常用命令:%RESET%
echo   %YELLOW%openclaw agent --message "你好"%RESET%     - 与 AI 对话
echo   %YELLOW%openclaw gateway status%RESET%             - 查看服务状态
echo   %YELLOW%openclaw gateway stop%RESET%               - 停止服务
echo   %YELLOW%openclaw dashboard%RESET%                  - 打开管理界面
echo.
echo %CYAN%渠道管理 (如已配置):%RESET%
echo   %YELLOW%openclaw pairing list%RESET%               - 查看配对请求
echo   %YELLOW%openclaw pairing approve telegram 123456%RESET% - 批准配对
echo.
echo %GREEN%按任意键退出此窗口 (OpenClaw 将继续在后台运行)%RESET%
pause >nul
