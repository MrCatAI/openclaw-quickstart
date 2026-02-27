# OpenClaw Web Config Service Manager
# 用于管理 Web 配置服务器的安装、启动、停止和删除
#
# 用法:
#   .\web-config-service.ps1 install   - 安装为系统服务
#   .\web-config-service.ps1 start     - 启动服务
#   .\web-config-service.ps1 stop      - 停止服务
#   .\web-config-service.ps1 restart   - 重启服务
#   .\web-config-service.ps1 status    - 查看状态
#   .\web-config-service.ps1 uninstall - 卸载服务

$ErrorActionPreference = "Stop"

# 服务配置
$SERVICE_NAME = "OpenClawWebConfig"
$SERVICE_DISPLAY_NAME = "OpenClaw Web Configuration"
$SERVICE_DESC = "OpenClaw Web 配置服务 - 提供浏览器配置界面"
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$NODE_SCRIPT = Join-Path $SCRIPT_DIR "web-config.js"
$SERVICE_DIR = "$env:PROGRAMFILES\OpenClawWebConfig"
$LOG_DIR = Join-Path $env:PROGRAMDATA "OpenClawWebConfig\logs"

# 确保 UTF-8 输出
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

function Write-Color {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

function Write-Success { Write-Color "✓ $args" Green }
function Write-Error { Write-Color "✗ $args" Red }
function Write-Info { Write-Color "ℹ $args" Cyan }
function Write-Warning { Write-Color "⚠ $args" Yellow }

# 检查 Node.js
function Test-NodeJs {
    try {
        $null = node --version
        return $true
    } catch {
        return $false
    }
}

# 创建服务目录
function Initialize-ServiceDir {
    if (-not (Test-Path $SERVICE_DIR)) {
        New-Item -ItemType Directory -Path $SERVICE_DIR -Force | Out-Null
    }
    if (-not (Test-Path $LOG_DIR)) {
        New-Item -ItemType Directory -Path $LOG_DIR -Force | Out-Null
    }

    # 复制 web-config.js 到服务目录
    if (Test-Path $NODE_SCRIPT) {
        Copy-Item $NODE_SCRIPT -Destination (Join-Path $SERVICE_DIR "web-config.js") -Force
        Write-Success "已复制 web-config.js 到服务目录"
    } else {
        Write-Error "找不到 web-config.js 文件"
        return $false
    }

    # 创建服务启动脚本
    $serviceScript = @"
# OpenClaw Web Config Service Script
$ErrorActionPreference = "Stop"

# 设置环境变量
`$env:NODE_ENV = "production"
`$env:PORT = "18790"

# 设置工作目录
`$SERVICE_DIR = "$SERVICE_DIR"
`$LOG_DIR = "$LOG_DIR"

# 启动 Node.js 服务
try {
    Push-Location `$SERVICE_DIR
    & node "web-config.js"
} finally {
    Pop-Location
}
"@

    $scriptPath = Join-Path $SERVICE_DIR "service.ps1"
    $serviceScript | Out-File $scriptPath -Encoding UTF8 -Force

    return $true
}

# 检查 NSSM 是否可用
function Test-Nssm {
    $nssmPath = "C:\nssm\nssm.exe"
    if (Test-Path $nssmPath) {
        return $nssmPath
    }

    # 检查 PATH 中的 nssm
    try {
        $nssmInPath = Get-Command nssm -ErrorAction SilentlyContinue
        if ($nssmInPath) {
            return $nssmInPath.Source
        }
    } catch {}

    return $null
}

# 下载并安装 NSSM
function Install-Nssm {
    Write-Info "NSSM 未找到，尝试下载..."

    $nssmDir = "C:\nssm"
    $nssmPath = Join-Path $nssmDir "nssm.exe"

    try {
        # 创建目录
        if (-not (Test-Path $nssmDir)) {
            New-Item -ItemType Directory -Path $nssmDir -Force | Out-Null
        }

        # 下载 NSSM
        $nssmDownloadUrl = "https://nssm.cc/release/nssm-2.24.zip"
        $nssmZip = Join-Path $env:TEMP "nssm.zip"

        Write-Host "  下载 NSSM..." -ForegroundColor Gray
        Invoke-WebRequest -Uri $nssmDownloadUrl -OutFile $nssmZip -UseBasicParsing

        $extractPath = Join-Path $env:TEMP "nssm"
        Expand-Archive -Path $nssmZip -DestinationPath $extractPath -Force

        # 根据系统架构复制正确的 nssm.exe
        $arch = if ([Environment]::Is64BitOperatingSystem) { "win64" } else { "win32" }
        $sourceNssm = Join-Path $extractPath "nssm-2.24\$arch\nssm.exe"

        if (Test-Path $sourceNssm) {
            Copy-Item $sourceNssm -Destination $nssmPath -Force
        } else {
            # 兼容旧版本路径
            Copy-Item (Join-Path $extractPath "nssm-2.24\nssm.exe") -Destination $nssmPath -Force
        }

        Remove-Item $nssmZip -Force
        Remove-Item $extractPath -Recurse -Force

        Write-Success "NSSM 安装成功"
        return $nssmPath
    } catch {
        Write-Error "NSSM 下载失败: $_"
        return $null
    }
}

# 使用 NSSM 创建服务
function Install-ServiceWithNSSM {
    $nssmPath = Test-Nssm

    if (-not $nssmPath) {
        $nssmPath = Install-Nssm
        if (-not $nssmPath) {
            return $false
        }
    }

    # 创建批处理启动脚本
    $batchScript = @"
@echo off
set NODE_ENV=production
set PORT=18790
chcp 65001 >nul 2>&1
cd /d "$SERVICE_DIR"
node web-config.js
"@

    $batPath = Join-Path $SERVICE_DIR "start-service.bat"
    $batchScript | Out-File $batPath -Encoding ASCII -Force

    # 使用 NSSM 创建服务
    & $nssmPath install $SERVICE_NAME $batPath
    if ($LASTEXITCODE -ne 0) {
        Write-Error "NSSM 服务创建失败"
        return $false
    }

    & $nssmPath set $SERVICE_NAME Description $SERVICE_DESC
    & $nssmPath set $SERVICE_NAME AppDirectory $SERVICE_DIR
    & $nssmPath set $SERVICE_NAME AppEnvironmentExtra "NODE_ENV=production" "PORT=18790"

    # 设置服务自动启动
    & $nssmPath set $SERVICE_NAME Start SERVICE_AUTO_START

    # 配置服务恢复选项
    & $nssmPath set $SERVICE_NAME AppRestartDelay 5000
    & $nssmPath set $SERVICE_NAME AppThrottle 1500000
    & $nssmPath set $SERVICE_NAME AppExit Default Restart
    & $nssmPath set $SERVICE_NAME AppRestartDelay 5000

    Write-Success "服务创建成功 (使用 NSSM)"
    return $true
}

# 使用 PowerShell 创建简单服务
function Install-ServiceWithPowerShell {
    Write-Warning "NSSM 不可用，将使用后台进程方式 (需要手动启动)"

    # 创建启动快捷方式
    $startupFolder = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup"
    $shortcutPath = Join-Path $startupFolder "OpenClawWebConfig.lnk"

    # 使用 PowerShell 创建快捷方式
    $vbsScript = @"
Set WshShell = WScript.CreateObject("WScript.Shell")
Set Shortcut = WshShell.CreateShortcut("$shortcutPath")
Shortcut.TargetLocation = "node.exe"
Shortcut.Arguments = ""$SERVICE_DIR\web-config.js""
Shortcut.WorkingDirectory = "$SERVICE_DIR"
Shortcut.WindowStyle = 0
Shortcut.Save
"@

    $vbsPath = Join-Path $env:TEMP "create-shortcut.vbs"
    $vbsScript | Out-File $vbsPath -Encoding ASCII -Force
    & cscript //NoLogo $vbsPath
    Remove-Item $vbsPath -Force

    Write-Success "已创建开机自启动快捷方式"
    Write-Warning "使用 'start' 命令启动服务"
    return $true
}

# 安装服务
function Install-WebConfigService {
    Write-Info "安装 Web 配置服务..."

    if (-not (Test-NodeJs)) {
        Write-Error "未找到 Node.js，请先安装 Node.js"
        return
    }

    if (-not (Initialize-ServiceDir)) {
        Write-Error "初始化服务目录失败"
        return
    }

    # 尝试使用 NSSM
    if (-not (Install-ServiceWithNSSM)) {
        # 回退到 PowerShell 方式
        Install-ServiceWithPowerShell
    }

    Write-Host ""
    Write-Info "服务管理命令:"
    Write-Host "  启动:   .\web-config-service.ps1 start" -ForegroundColor Green
    Write-Host "  停止:   .\web-config-service.ps1 stop" -ForegroundColor Yellow
    Write-Host "  重启:   .\web-config-service.ps1 restart" -ForegroundColor Cyan
    Write-Host "  状态:   .\web-config-service.ps1 status" -ForegroundColor Cyan
    Write-Host "  卸载:   .\web-config-service.ps1 uninstall" -ForegroundColor Red
    Write-Host ""
    Write-Info "Web 配置地址: http://127.0.0.1:18790"
}

# 启动服务
function Start-WebConfigService {
    Write-Info "启动 Web 配置服务..."

    $nssmPath = Test-Nssm

    if ($nssmPath) {
        # 使用 NSSM 启动
        & $nssmPath start $SERVICE_NAME 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "服务已启动 (NSSM)"
            Write-Info "访问地址: http://127.0.0.1:18790"
            return
        }
    }

    # 后台启动服务
    try {
        $scriptToRun = if (Test-Path (Join-Path $SERVICE_DIR "web-config.js")) {
            Join-Path $SERVICE_DIR "web-config.js"
        } else {
            $NODE_SCRIPT
        }

        $workingDir = if (Test-Path $SERVICE_DIR) { $SERVICE_DIR } else { $SCRIPT_DIR }

        $process = Start-Process -FilePath "node" `
            -ArgumentList $scriptToRun `
            -WorkingDirectory $workingDir `
            -WindowStyle Hidden `
            -RedirectStandardOutput "$LOG_DIR\output.log" `
            -RedirectStandardError "$LOG_DIR\error.log" `
            -PassThru

        # 保存 PID
        $process.Id | Out-File (Join-Path $env:TEMP "openclaw-web-config.pid") -Force

        Write-Success "服务已启动 (后台进程)"
        Write-Info "PID: $($process.Id)"
        Write-Info "访问地址: http://127.0.0.1:18790"
        Write-Warning "使用 '.\web-config-service.ps1 stop' 停止服务"
    } catch {
        Write-Error "启动失败: $_"
    }
}

# 停止服务
function Stop-WebConfigService {
    Write-Info "停止 Web 配置服务..."

    $stopped = $false
    $nssmPath = Test-Nssm

    # 尝试使用 NSSM
    if ($nssmPath) {
        & $nssmPath stop $SERVICE_NAME 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "服务已停止 (NSSM)"
            $stopped = $true
        }
    }

    # 停止后台进程
    $pidFile = Join-Path $env:TEMP "openclaw-web-config.pid"
    if (Test-Path $pidFile) {
        try {
            $pid = Get-Content $pidFile
            $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($process) {
                $process.Kill()
                $stopped = $true
            }
            Remove-Item $pidFile -Force
        } catch {}
    }

    # 查找并停止 node.exe 进程
    try {
        $process = Get-Process node -ErrorAction SilentlyContinue | Where-Object {
            $_.CommandLine -like "*web-config*"
        }
        if ($process) {
            $process.Kill()
            $stopped = $true
        }
    } catch {}

    if ($stopped) {
        Write-Success "服务已停止"
    } else {
        Write-Warning "未找到运行中的服务"
    }
}

# 卸载服务
function Uninstall-WebConfigService {
    Write-Info "卸载 Web 配置服务..."

    $uninstalled = $false
    $nssmPath = Test-Nssm

    # 先停止服务
    Stop-WebConfigService

    # 使用 NSSM 删除服务
    if ($nssmPath) {
        & $nssmPath remove $SERVICE_NAME confirm
        if ($LASTEXITCODE -eq 0) {
            $uninstalled = $true
            Write-Success "服务已卸载 (NSSM)"
        }
    }

    # 删除开机自启动快捷方式
    $shortcutPath = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\OpenClawWebConfig.lnk"
    if (Test-Path $shortcutPath) {
        Remove-Item $shortcutPath -Force
        $uninstalled = $true
        Write-Success "已删除开机自启动快捷方式"
    }

    # 清理文件
    Write-Host ""
    $response = Read-Host "是否删除服务文件? [y/N]"
    if ($response -eq 'y' -or $response -eq 'Y') {
        if (Test-Path $SERVICE_DIR) {
            Remove-Item $SERVICE_DIR -Recurse -Force
            Write-Success "服务文件已删除"
        }
        if (Test-Path $LOG_DIR) {
            Remove-Item $LOG_DIR -Recurse -Force
            Write-Success "日志文件已删除"
        }
    }

    if (-not $uninstalled) {
        Write-Warning "服务可能未安装"
    }
}

# 检查服务状态
function Show-ServiceStatus {
    Write-Info "Web 配置服务状态:"
    Write-Host ""

    $running = $false
    $nssmPath = Test-Nssm

    # 检查 NSSM 服务
    if ($nssmPath) {
        try {
            $statusOutput = & $nssmPath status $SERVICE_NAME 2>&1
            if ($statusOutput -match "SERVICE_RUNNING") {
                $running = $true
                Write-Host "  状态: 运行中 (NSSM 服务)" -ForegroundColor Green
            } elseif ($statusOutput -match "SERVICE_STOPPED") {
                Write-Host "  状态: 已停止 (NSSM 服务)" -ForegroundColor Yellow
            }
        } catch {}
    }

    # 检查后台进程
    if (-not $running) {
        $pidFile = Join-Path $env:TEMP "openclaw-web-config.pid"
        if (Test-Path $pidFile) {
            $pid = Get-Content $pidFile
            try {
                $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
                if ($process) {
                    $running = $true
                    Write-Host "  状态: 运行中 (后台进程)" -ForegroundColor Green
                    Write-Host "  PID: $pid" -ForegroundColor Cyan
                } else {
                    Remove-Item $pidFile -Force
                }
            } catch {
                Remove-Item $pidFile -Force
            }
        }
    }

    # 检查端口
    try {
        $listener = Get-NetTCPConnection -LocalPort 18790 -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($listener) {
            $running = $true
            Write-Host "  端口: 18790 已监听" -ForegroundColor Green
        }
    } catch {}

    if (-not $running) {
        Write-Host "  状态: 未运行" -ForegroundColor Red
    }

    Write-Host ""
    Write-Host "  访问地址: http://127.0.0.1:18790" -ForegroundColor Cyan
    Write-Host ""
}

# 主函数
function Main {
    $command = if ($args.Count -gt 0) { $args[0].ToLower() } else { "status" }

    switch ($command) {
        "install" {
            Install-WebConfigService
        }
        "start" {
            Start-WebConfigService
        }
        "stop" {
            Stop-WebConfigService
        }
        "restart" {
            Stop-WebConfigService
            Start-Sleep -Seconds 1
            Start-WebConfigService
        }
        "status" {
            Show-ServiceStatus
        }
        "uninstall" {
            Uninstall-WebConfigService
        }
        default {
            Write-Host ""
            Write-Host "OpenClaw Web Config Service Manager" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "用法: .\web-config-service.ps1 [命令]" -ForegroundColor White
            Write-Host ""
            Write-Host "命令:" -ForegroundColor Yellow
            Write-Host "  install   - 安装为系统服务" -ForegroundColor Green
            Write-Host "  start     - 启动服务" -ForegroundColor Green
            Write-Host "  stop      - 停止服务" -ForegroundColor Yellow
            Write-Host "  restart   - 重启服务" -ForegroundColor Yellow
            Write-Host "  status    - 查看状态" -ForegroundColor Cyan
            Write-Host "  uninstall - 卸载服务" -ForegroundColor Red
            Write-Host ""
        }
    }
}

Main $args
