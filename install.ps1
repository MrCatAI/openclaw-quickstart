# OpenClaw Quickstart Installer
# Updated: 2025-03-02 (Simplified without ValidateSet)
#
# Quick Install:
#   iwr -useb https://raw.githubusercontent.com/MrCatAI/openclaw-quickstart/master/install.ps1 | iex
#
# China Mirror:
#   iwr -useb https://mirror.ghproxy.com/https://raw.githubusercontent.com/MrCatAI/openclaw-quickstart/master/install.ps1 | iex

# UTF-8 Encoding
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['*:Encoding'] = 'utf8'
chcp 65001 2>$null | Out-Null

$ErrorActionPreference = "Stop"

function Write-Color {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

function Write-Success { Write-Color "✓ " $args Green }
function Write-Error { Write-Color "✗ " $args Red }
function Write-Info { Write-Color "ℹ " $args Cyan }
function Write-Warning { Write-Color "! " $args Yellow }

# Banner
function Show-Banner {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║                                                          ║" -ForegroundColor Cyan
    Write-Host "║   🦞  OpenClaw 快速安装器                                  ║" -ForegroundColor Cyan
    Write-Host "║                                                          ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

# Check Node.js
function Test-NodeJs {
    try {
        $null = node --version
        return $true
    } catch {
        return $false
    }
}

# Install OpenClaw
function Install-OpenClaw {
    Write-Info "正在安装 OpenClaw..."

    # 使用 npx 直接运行安装，不全局安装
    Write-Host "OpenClaw 将通过 npx 方式运行，无需全局安装" -ForegroundColor Cyan
    Write-Host ""

    # 验证 npx 可用
    try {
        $null = npx --version
        Write-Success "npx 可用"
    } catch {
        throw "npm/npx 不可用，请先安装 Node.js"
    }

    return $true
}

# Run Configuration Wizard
function Start-Configuration {
    Write-Host ""
    Write-Info "启动配置向导..."
    Write-Host ""

    # 使用 npx 运行配置工具
    Write-Host "配置方式:" -ForegroundColor Yellow
    Write-Host "  1. Web 配置界面 (推荐)" -ForegroundColor Cyan
    Write-Host "  2. CLI 配置向导" -ForegroundColor Cyan
    Write-Host ""

    $choice = Read-Host "请选择 (1/2) [默认:1]"

    if ($choice -eq "2") {
        # CLI 配置
        Write-Host "启动 CLI 配置向导..." -ForegroundColor Cyan
        npx openclaw-quickstart
    } else {
        # Web 配置
        Write-Host "启动 Web 配置界面..." -ForegroundColor Cyan
        npx openclaw-web-config
    }
}

# Start Gateway
function Start-Gateway {
    Write-Host ""
    Write-Info "启动 OpenClaw Gateway..."

    # 检查配置文件
    $configPath = "$env:USERPROFILE\.openclaw\openclaw.json"
    if (Test-Path $configPath) {
        Write-Success "配置文件已存在"
    } else {
        Write-Warning "配置文件不存在，将使用默认配置"
    }

    # 启动 Gateway
    Write-Host "正在启动..." -ForegroundColor Yellow
    $gatewayCmd = "npx openclaw@latest gateway --allow-unconfigured"

    # 在后台启动
    $job = Start-Job -ScriptBlock {
        param($cmd)
        & cmd /c "$cmd > nul 2>&1"
    } -ArgumentList $gatewayCmd

    # 等待启动
    Start-Sleep -Seconds 5

    # 检查端口
    try {
        $listener = Get-NetTCPConnection -LocalPort 18789 -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($listener) {
            Write-Success "Gateway 启动成功！"
            Write-Host ""
            Write-Host "访问地址:" -ForegroundColor Green
            Write-Host "  Web 控制面板:  http://127.0.0.1:18789" -ForegroundColor Cyan
            Write-Host ""
        } else {
            Write-Warning "Gateway 可能正在启动中，请稍后访问"
        }
    } catch {
        Write-Warning "无法检测端口状态"
    }
}

# Main
function Main {
    Show-Banner

    Write-Success "检测到系统: Windows"
    Write-Host ""

    # 检查 Node.js
    if (-not (Test-NodeJs)) {
        Write-Error "未找到 Node.js"
        Write-Host ""
        Write-Host "请先安装 Node.js:" -ForegroundColor Yellow
        Write-Host "  方法 1: winget install OpenJS.NodeJS.LTS" -ForegroundColor Cyan
        Write-Host "  方法 2: https://nodejs.org" -ForegroundColor Cyan
        Write-Host ""
        return
    }

    $nodeVersion = node --version
    Write-Success "Node.js 版本: $nodeVersion"
    Write-Host ""

    # 安装/检查 OpenClaw
    if (-not (Install-OpenClaw)) {
        return
    }

    # 配置
    $skipConfig = $env:OPENCLAW_SKIP_CONFIG -eq "1"
    if (-not $skipConfig) {
        Start-Configuration
    }

    # 启动
    $skipStart = $env:OPENCLAW_SKIP_START -eq "1"
    if (-not $skipStart) {
        Start-Gateway
    }

    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║                                                          ║" -ForegroundColor Green
    Write-Host "║   安装完成！                                               ║" -ForegroundColor Green
    Write-Host "║                                                          ║" -ForegroundColor Green
    Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Host "常用命令:" -ForegroundColor Cyan
    Write-Host "  npx openclaw-quickstart          - 配置向导" -ForegroundColor White
    Write-Host "  npx openclaw-web-config          - Web 配置" -ForegroundColor White
    Write-Host "  npx openclaw@latest gateway       - 启动 Gateway" -ForegroundColor White
    Write-Host "  npx openclaw@latest agent --message '你好'  - 与 AI 对话" -ForegroundColor White
    Write-Host ""
}

# 运行主函数
Main
