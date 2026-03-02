# OpenClaw Quickstart Installer
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

function Write-Success { Write-Color "[OK] " $args Green }
function Write-Error { Write-Color "[ERROR] " $args Red }
function Write-Info { Write-Color "[INFO] " $args Cyan }
function Write-Warning { Write-Color "[WARN] " $args Yellow }

# Banner
function Show-Banner {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "  OpenClaw Quickstart Installer" -ForegroundColor Cyan
    Write-Host "  https://github.com/MrCatAI/openclaw-quickstart" -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
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
    Write-Info "Checking OpenClaw..."

    Write-Host "OpenClaw runs via npx, no global installation required." -ForegroundColor Cyan
    Write-Host ""

    # Verify npx is available
    try {
        $null = npx --version
        Write-Success "npx is available"
    } catch {
        throw "npm/npx not available. Please install Node.js first."
    }

    return $true
}

# Run Web Configuration
function Start-WebConfiguration {
    Write-Host ""
    Write-Info "Starting Web Configuration..."
    Write-Host ""

    Write-Host "Opening web config at: http://127.0.0.1:18792" -ForegroundColor Cyan
    Write-Host ""

    npx openclaw-web-config
}

# Start Gateway
function Start-Gateway {
    Write-Host ""
    Write-Info "Starting OpenClaw Gateway..."

    # Check config file
    $configPath = "$env:USERPROFILE\.openclaw\openclaw.json"
    if (Test-Path $configPath) {
        Write-Success "Config file exists"
    } else {
        Write-Warning "Config file not found, using default config"
    }

    # Start Gateway
    Write-Host "Starting..." -ForegroundColor Yellow
    $gatewayCmd = "npx openclaw@latest gateway --allow-unconfigured"

    # Start in background
    $job = Start-Job -ScriptBlock {
        param($cmd)
        & cmd /c "$cmd > nul 2>&1"
    } -ArgumentList $gatewayCmd

    # Wait for startup
    Start-Sleep -Seconds 5

    # Check port
    try {
        $listener = Get-NetTCPConnection -LocalPort 18789 -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($listener) {
            Write-Success "Gateway started successfully!"
            Write-Host ""
            Write-Host "Access URLs:" -ForegroundColor Green
            Write-Host "  Web Control Panel:  http://127.0.0.1:18789" -ForegroundColor Cyan
            Write-Host ""
        } else {
            Write-Warning "Gateway may be starting, please wait a moment"
        }
    } catch {
        Write-Warning "Cannot detect port status"
    }
}

# Main
function Main {
    Show-Banner

    Write-Success "Detected OS: Windows"
    Write-Host ""

    # Check Node.js
    if (-not (Test-NodeJs)) {
        Write-Error "Node.js not found"
        Write-Host ""
        Write-Host "Please install Node.js first:" -ForegroundColor Yellow
        Write-Host "  Method 1: winget install OpenJS.NodeJS.LTS" -ForegroundColor Cyan
        Write-Host "  Method 2: https://nodejs.org" -ForegroundColor Cyan
        Write-Host ""
        return
    }

    $nodeVersion = node --version
    Write-Success "Node.js version: $nodeVersion"
    Write-Host ""

    # Check OpenClaw
    if (-not (Test-OpenClaw)) {
        return
    }

    # Start Web Configuration
    $skipConfig = $env:OPENCLAW_SKIP_CONFIG -eq "1"
    if (-not $skipConfig) {
        Start-WebConfiguration
    }

    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host "  Setup Complete!" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "  1. Complete configuration in the web browser" -ForegroundColor White
    Write-Host "  2. Gateway will start automatically after config" -ForegroundColor White
    Write-Host ""
    Write-Host "Common Commands:" -ForegroundColor Cyan
    Write-Host "  npx openclaw-web-config              - Web Configuration" -ForegroundColor White
    Write-Host "  npx openclaw@latest gateway           - Start Gateway" -ForegroundColor White
    Write-Host "  npx openclaw@latest agent --message 'hi' - Chat with AI" -ForegroundColor White
    Write-Host ""
}

# Run main function
Main
