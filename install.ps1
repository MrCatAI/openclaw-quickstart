# OpenClaw Quickstart Installer
#
# Quick Install:
#   iwr -useb https://raw.githubusercontent.com/MrCatAI/openclaw-quickstart/main/install.ps1 | iex
#
# China (Mirror):
#   iwr -useb https://mirror.ghproxy.com/https://raw.githubusercontent.com/MrCatAI/openclaw-quickstart/main/install.ps1 | iex

# 参数定义 (必须在脚本开头)
param(
    [string]$Tag = "latest",
    [ValidateSet("npm", "git")]
    [string]$InstallMethod = "npm",
    [string]$GitDir,
    [switch]$NoGitUpdate,
    [switch]$DryRun,
    [switch]$SkipConfig,
    [switch]$SkipStart
)

# UTF-8 Encoding Setup
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['*:Encoding'] = 'utf8'
chcp 65001 2>$null | Out-Null

# Encoding diagnostic - only show if there might be an issue
if ($Host.Name -eq 'ConsoleHost') {
    $currentCodePage = [Console]::OutputEncoding.CodePage
    if ($currentCodePage -ne 65001 -and $currentCodePage -ne 1200 -and $currentCodePage -ne 1201) {
        Write-Warning "Console code page is $currentCodePage, UTF-8 (65001) recommended for Chinese display"
        Write-Host "If you see '?' instead of Chinese/emoji, try:" -ForegroundColor Yellow
        Write-Host "  1. Use Windows Terminal instead of classic Console" -ForegroundColor Cyan
        Write-Host "  2. Run: chcp 65001 before executing this script" -ForegroundColor Cyan
        Write-Host "  3. Set PowerShell UTF-8 encoding in settings" -ForegroundColor Cyan
        Write-Host ""
    }
}

$ErrorActionPreference = "Stop"

# 支持环境变量覆盖
if (-not $PSBoundParameters.ContainsKey('Tag') -and $env:OPENCLAW_TAG) { $Tag = $env:OPENCLAW_TAG }
if (-not $PSBoundParameters.ContainsKey('InstallMethod') -and $env:OPENCLAW_INSTALL_METHOD) { $InstallMethod = $env:OPENCLAW_INSTALL_METHOD }
if (-not $PSBoundParameters.ContainsKey('GitDir') -and $env:OPENCLAW_GIT_DIR) { $GitDir = $env:OPENCLAW_GIT_DIR }
if (-not $PSBoundParameters.ContainsKey('NoGitUpdate') -and $env:OPENCLAW_GIT_UPDATE -eq "0") { $NoGitUpdate = $true }
if (-not $PSBoundParameters.ContainsKey('DryRun') -and $env:OPENCLAW_DRY_RUN -eq "1") { $DryRun = $true }
if (-not $PSBoundParameters.ContainsKey('SkipConfig') -and $env:OPENCLAW_SKIP_CONFIG -eq "1") { $SkipConfig = $true }
if (-not $PSBoundParameters.ContainsKey('SkipStart') -and $env:OPENCLAW_SKIP_START -eq "1") { $SkipStart = $true }

$CONFIG_DIR = "$env:USERPROFILE\.openclaw"
$CONFIG_FILE = "$CONFIG_DIR\openclaw.json"

# 全局变量
$script:MODEL_BASE_URL = ""
$script:MODEL_API_KEY = ""
$script:MODEL_ID = ""
$script:MODEL_API_TYPE = ""
$script:MODEL_CONTEXT = ""
$script:MODEL_MAX_TOKENS = ""
$script:CHANNELS_CONFIG = @{}

function Write-Banner {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║                                                          ║" -ForegroundColor Cyan
    Write-Host "║   🦞  OpenClaw 快速安装器                                ║" -ForegroundColor Cyan
    Write-Host "║                                                          ║" -ForegroundColor Cyan
    Write-Host "║   一键安装并配置您的 AI 助手                              ║" -ForegroundColor Cyan
    Write-Host "║                                                          ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "OpenClaw 是一个强大的 AI 个人助手，可以:" -ForegroundColor Magenta
    Write-Host "  • 在 Telegram / Discord / 飞书 等平台与您对话" -ForegroundColor Magenta
    Write-Host "  • 使用各种 AI 模型 (GPT-4o, Claude, DeepSeek, Kimi 等)" -ForegroundColor Magenta
    Write-Host "  • 自动化处理各种任务" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "本安装器将引导您完成:" -ForegroundColor Yellow
    Write-Host "  1️⃣  安装 OpenClaw" -ForegroundColor Yellow
    Write-Host "  2️⃣  配置 AI 模型" -ForegroundColor Yellow
    Write-Host "  3️⃣  配置聊天渠道 (可选)" -ForegroundColor Yellow
    Write-Host "  4️⃣  启动服务" -ForegroundColor Yellow
    Write-Host ""
}

function Write-Success($msg) {
    Write-Host "✓ $msg" -ForegroundColor Green
}

function Write-Warning($msg) {
    Write-Host "! $msg" -ForegroundColor Yellow
}

function Write-Error($msg) {
    Write-Host "✗ $msg" -ForegroundColor Red
}

function Write-Step($msg) {
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "  $msg" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host ""
}

# 设置 Git 目录默认值
if ([string]::IsNullOrWhiteSpace($GitDir)) {
    $userHome = [Environment]::GetFolderPath("UserProfile")
    $GitDir = (Join-Path $userHome "openclaw")
}

# 显示安装计划
if ($DryRun) {
    Write-Host ""
    Write-Host "[OK] 模拟运行模式" -ForegroundColor Green
    Write-Host "[OK] 安装方式: $InstallMethod" -ForegroundColor Green
    if ($InstallMethod -eq "git") {
        Write-Host "[OK] Git 目录: $GitDir" -ForegroundColor Green
        if ($NoGitUpdate) {
            Write-Host "[OK] Git 更新: 已禁用" -ForegroundColor Green
        } else {
            Write-Host "[OK] Git 更新: 已启用" -ForegroundColor Green
        }
    }
    Write-Host "[OK] 版本标签: $Tag" -ForegroundColor Green
    if ($SkipConfig) {
        Write-Host "[OK] 配置步骤: 已跳过" -ForegroundColor Green
    }
    if ($SkipStart) {
        Write-Host "[OK] 启动步骤: 已跳过" -ForegroundColor Green
    }
    Write-Host ""
    exit 0
}

# ============================================
# Node.js 检测和安装 (完全遵循 OpenClaw 官方逻辑)
# ============================================

function Get-NodeMajorVersion {
    try {
        $nodeVersion = node -v 2>$null
        if ($nodeVersion) {
            $major = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
            if ($major -ge 0) {
                return $major
            }
        }
    } catch {}
    return $null
}

function Write-ActiveNodePaths {
    try {
        $nodePath = Get-Command node -ErrorAction SilentlyContinue
        if ($nodePath) {
            $nodeVersion = node -v 2>$null
            Write-Success "当前 Node.js: $($nodeVersion) ($($nodePath.Source))"
            
            $npmPath = Get-Command npm -ErrorAction SilentlyContinue
            if ($npmPath) {
                $npmVersion = npm -v 2>$null
                Write-Success "当前 npm: $($npmVersion) ($($npmPath.Source))"
            }
        }
    } catch {}
}

function Check-Node {
    try {
        $nodeVersion = node -v 2>$null
        if ($nodeVersion) {
            $version = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
            if ($version -ge 22) {
                Write-Success "检测到 Node.js $nodeVersion ✓"
                Write-ActiveNodePaths
                return $true
            } else {
                Write-Warning "检测到 Node.js $nodeVersion，需要 v22 或更高版本"
                return $false
            }
        }
    } catch {}
    Write-Warning "未检测到 Node.js"
    return $false
}

function Install-Node {
    Write-Host ""
    Write-Host "正在为 Windows 安装 Node.js..." -ForegroundColor Cyan
    
    # Try winget first (Windows 11 / Windows 10 with App Installer)
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Write-Host "  使用 winget 安装..." -ForegroundColor Gray
        try {
            winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
            
            # Refresh PATH
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
            Write-Success "通过 winget 安装 Node.js 成功"
            return $true
        } catch {
            Write-Warning "winget 安装失败，尝试其他方式..."
        }
    }
    
    # Try Chocolatey
    if (Get-Command choco -ErrorAction SilentlyContinue) {
        Write-Host "  使用 Chocolatey 安装..." -ForegroundColor Gray
        try {
            choco install nodejs-lts -y
            
            # Refresh PATH
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
            Write-Success "通过 Chocolatey 安装 Node.js 成功"
            return $true
        } catch {
            Write-Warning "Chocolatey 安装失败，尝试其他方式..."
        }
    }
    
    # Try Scoop
    if (Get-Command scoop -ErrorAction SilentlyContinue) {
        Write-Host "  使用 Scoop 安装..." -ForegroundColor Gray
        try {
            scoop install nodejs-lts
            Write-Success "通过 Scoop 安装 Node.js 成功"
            return $true
        } catch {
            Write-Warning "Scoop 安装失败"
        }
    }
    
    # Manual download fallback
    Write-Error "未找到包管理器 (winget, choco 或 scoop)"
    Write-Host ""
    Write-Host "请手动安装 Node.js 22+:" -ForegroundColor Yellow
    Write-Host "  方法 1: 访问 https://nodejs.org 下载安装" -ForegroundColor Cyan
    Write-Host "  方法 2: winget install OpenJS.NodeJS.LTS" -ForegroundColor Cyan
    Write-Host "  方法 3: choco install nodejs-lts" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "安装后请重启 PowerShell 并重新运行此脚本" -ForegroundColor Yellow
    return $false
}

# ============================================
# OpenClaw 安装
# ============================================

function Check-OpenClaw {
    try {
        $openclawCmd = Get-Command openclaw -ErrorAction Stop
        $version = openclaw --version 2>$null
        Write-Success "OpenClaw 已安装: $version"
        return $true
    } catch {
        return $false
    }
}

function Ensure-OpenClawOnPath {
    if (Get-Command openclaw -ErrorAction SilentlyContinue) {
        return $true
    }

    $npmPrefix = $null
    try {
        $npmPrefix = (npm config get prefix 2>$null).Trim()
    } catch {
        $npmPrefix = $null
    }

    if (-not [string]::IsNullOrWhiteSpace($npmPrefix)) {
        # Windows npm global bin is in the prefix directory, not prefix/bin
        $npmBin = $npmPrefix
        $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
        if (-not ($userPath -split ";" | Where-Object { $_ -ieq $npmBin })) {
            [Environment]::SetEnvironmentVariable("Path", "$userPath;$npmBin", "User")
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
            Write-Warning "已将 $npmBin 添加到用户 PATH (如命令未找到请重启终端)"
        }
        if (Test-Path (Join-Path $npmBin "openclaw.cmd")) {
            return $true
        }
    }

    Write-Warning "openclaw 尚未在 PATH 中"
    Write-Host "请重启 PowerShell 或将 npm 全局 bin 目录添加到 PATH" -ForegroundColor Yellow
    if ($npmPrefix) {
        Write-Host "预期路径: $npmPrefix" -ForegroundColor Cyan
    } else {
        Write-Host '提示: 运行 "npm config get prefix" 查找 npm 全局路径' -ForegroundColor Gray
    }
    return $false
}

# 清理旧版子模块
function Remove-LegacySubmodule {
    param([string]$RepoDir)
    if ([string]::IsNullOrWhiteSpace($RepoDir)) {
        return
    }
    $legacyDir = Join-Path $RepoDir "Peekaboo"
    if (Test-Path $legacyDir) {
        Write-Warning "正在移除旧版子模块: $legacyDir"
        Remove-Item -Recurse -Force $legacyDir -ErrorAction SilentlyContinue
    }
}

# 清理 NPM 冲突路径
function Cleanup-NpmOpenclawPaths {
    $npmRoot = $null
    try {
        $npmRoot = (npm root -g 2>$null).Trim()
    } catch {
        return
    }
    if ([string]::IsNullOrWhiteSpace($npmRoot) -or $npmRoot -notlike "*node_modules*") {
        return
    }
    Get-ChildItem -Path $npmRoot -Filter ".openclaw-*" -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    $openclawDir = Join-Path $npmRoot "openclaw"
    if (Test-Path $openclawDir) {
        Remove-Item -Recurse -Force $openclawDir -ErrorAction SilentlyContinue
    }
}

# 提取 NPM 错误信息
function Get-NpmErrorDiagnostics($npmOutput) {
    $diagnostics = @{}
    
    # 检查常见错误
    if ($npmOutput -match "spawn git" -or $npmOutput -match "ENOENT.*git") {
        $diagnostics['missingGit'] = $true
    }
    if ($npmOutput -match "ENOTEMPTY.*openclaw") {
        $diagnostics['staleDirectory'] = $true
    }
    if ($npmOutput -match "EEXIST") {
        $diagnostics['fileExists'] = $true
    }
    if ($npmOutput -match "not found: make|make: command not found|cmake: command not found") {
        $diagnostics['missingBuildTools'] = $true
    }
    
    return $diagnostics
}

function Install-OpenClaw {
    Write-Host ""
    Write-Host "正在安装 OpenClaw..." -ForegroundColor Cyan
    Write-Host "这可能需要几分钟时间，请耐心等待..."
    
    # 清理旧版子模块
    $userHome = [Environment]::GetFolderPath("UserProfile")
    $defaultGitDir = Join-Path $userHome "openclaw"
    Remove-LegacySubmodule -RepoDir $defaultGitDir
    
    # Save current npm config
    $prevLogLevel = $env:NPM_CONFIG_LOGLEVEL
    $prevFund = $env:NPM_CONFIG_FUND
    $prevAudit = $env:NPM_CONFIG_AUDIT
    $prevNotifier = $env:NPM_CONFIG_UPDATE_NOTIFIER
    
    $env:NPM_CONFIG_LOGLEVEL = "error"
    $env:NPM_CONFIG_FUND = "false"
    $env:NPM_CONFIG_AUDIT = "false"
    $env:NPM_CONFIG_UPDATE_NOTIFIER = "false"
    
    $npmOutput = @()
    $installSuccess = $false
    $attemptedFix = $false
    
    try {
        # 第一次安装尝试
        $npmOutput = npm install -g openclaw@latest 2>&1
        if ($LASTEXITCODE -eq 0) {
            $installSuccess = $true
        } else {
            # 分析错误
            $diagnostics = Get-NpmErrorDiagnostics ($npmOutput -join "`n")
            
            # 尝试1: 清理 NPM 冲突路径
            if ($diagnostics['staleDirectory'] -or $diagnostics['fileExists']) {
                Write-Warning "检测到 npm 残留目录或文件冲突，正在清理..."
                Cleanup-NpmOpenclawPaths
                $attemptedFix = $true
                
                $npmOutput = npm install -g openclaw@latest 2>&1
                if ($LASTEXITCODE -eq 0) {
                    $installSuccess = $true
                }
            }
            
            # 尝试2: 使用 --force 参数
            if (-not $installSuccess) {
                Write-Warning "尝试使用强制安装模式..."
                $attemptedFix = $true
                $npmOutput = npm install -g openclaw@latest --force 2>&1
                if ($LASTEXITCODE -eq 0) {
                    $installSuccess = $true
                }
            }
        }
        
        if ($installSuccess) {
            # 检查是否在 PATH 中
            if (Get-Command openclaw -ErrorAction SilentlyContinue) {
                Write-Success "OpenClaw 安装成功！"
                return $true
            }
            
            # 尝试添加到 PATH
            Ensure-OpenClawOnPath | Out-Null
            if (Get-Command openclaw -ErrorAction SilentlyContinue) {
                Write-Success "OpenClaw 安装成功！"
                return $true
            }
            
            Write-Warning "OpenClaw 已安装但可能需要重启终端才能使用"
            return $true
        }
        
        # 安装失败，显示诊断信息
        Write-Error "OpenClaw 安装失败"
        
        if ($attemptedFix) {
            Write-Warning "自动修复后仍然安装失败"
        }
        
        # 显示具体错误
        $diagnostics = Get-NpmErrorDiagnostics ($npmOutput -join "`n")
        if ($diagnostics['missingGit']) {
            Write-Host "错误: 缺少 Git。请安装 Git for Windows:" -ForegroundColor Red
            Write-Host "  https://git-scm.com/download/win" -ForegroundColor Cyan
        }
        if ($diagnostics['missingBuildTools']) {
            Write-Host "错误: 缺少构建工具 (make/cmake)。某些依赖需要编译。" -ForegroundColor Red
        }
        
        Write-Host "`n错误输出:" -ForegroundColor Yellow
        $npmOutput | ForEach-Object { Write-Host $_ }
        
        Write-Host "`n请尝试手动安装: npm install -g openclaw@latest" -ForegroundColor Yellow
        return $false
        
    } finally {
        $env:NPM_CONFIG_LOGLEVEL = $prevLogLevel
        $env:NPM_CONFIG_FUND = $prevFund
        $env:NPM_CONFIG_AUDIT = $prevAudit
        $env:NPM_CONFIG_UPDATE_NOTIFIER = $prevNotifier
    }
}

# ============================================
# 用户交互
# ============================================

function Prompt-Input($prompt, $default = "") {
    if ($default) {
        Write-Host "$prompt [$default]: " -ForegroundColor Cyan -NoNewline
    } else {
        Write-Host "${prompt}: " -ForegroundColor Cyan -NoNewline
    }
    
    $value = Read-Host
    if ([string]::IsNullOrWhiteSpace($value) -and $default) {
        return $default
    }
    return $value
}

function Prompt-Choice($prompt, [string[]]$options) {
    Write-Host $prompt -ForegroundColor Cyan
    for ($i = 1; $i -le $options.Count; $i++) {
        Write-Host "  $i) $($options[$i-1])" -ForegroundColor Yellow
    }
    Write-Host "请输入数字选择 [1]: " -ForegroundColor Cyan -NoNewline
    
    $choice = Read-Host
    if ([string]::IsNullOrWhiteSpace($choice)) {
        return $options[0]
    }
    if ($choice -match '^\d+$' -and [int]$choice -ge 1 -and [int]$choice -le $options.Count) {
        return $options[[int]$choice - 1]
    }
    return $options[0]
}

function Prompt-YesNo($prompt, $default = "n") {
    Write-Host "$prompt [$default]: " -ForegroundColor Cyan -NoNewline
    $answer = Read-Host
    if ([string]::IsNullOrWhiteSpace($answer)) {
        return $default -eq "y"
    }
    return $answer -match '^[Yy]'
}

# ============================================
# 模型配置
# ============================================

function Show-ModelProviders {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Magenta
    Write-Host "  常用 AI 模型提供商" -ForegroundColor Magenta
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "🌍 国际模型:" -ForegroundColor White
    Write-Host "  OpenAI        - GPT-4o, GPT-4-turbo" -ForegroundColor Yellow
    Write-Host "                  API: https://api.openai.com/v1"
    Write-Host ""
    Write-Host "  Anthropic     - Claude Sonnet, Claude Opus" -ForegroundColor Yellow
    Write-Host "                  API: https://api.anthropic.com (anthropic-messages)"
    Write-Host ""
    Write-Host "🇨🇳 国内模型:" -ForegroundColor White
    Write-Host "  DeepSeek      - DeepSeek-V3, DeepSeek-Chat" -ForegroundColor Yellow
    Write-Host "                  API: https://api.deepseek.com/v1"
    Write-Host ""
    Write-Host "  Kimi (月之暗面) - Kimi K2, moonshot-v1" -ForegroundColor Yellow
    Write-Host "                  API: https://api.moonshot.cn/v1"
    Write-Host ""
    Write-Host "  智谱 GLM       - GLM-4, GLM-4-Plus" -ForegroundColor Yellow
    Write-Host "                  API: https://open.bigmodel.cn/api/paas/v4"
    Write-Host ""
    Write-Host "  通义千问       - Qwen-Turbo, Qwen-Plus" -ForegroundColor Yellow
    Write-Host "                  API: https://dashscope.aliyuncs.com/compatible-mode/v1"
    Write-Host ""
    Write-Host "💻 本地模型:" -ForegroundColor White
    Write-Host "  Ollama        - Llama, Qwen, DeepSeek 本地版" -ForegroundColor Yellow
    Write-Host "                  API: http://127.0.0.1:11434/v1"
    Write-Host ""
}

function Configure-Model {
    Write-Step "第 1 步：配置 AI 模型"
    
    Write-Host "OpenClaw 需要连接一个 AI 模型才能工作。" -ForegroundColor White
    Write-Host ""
    Write-Host "您可以获取 API Key:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  OpenAI      → https://platform.openai.com/api-keys" -ForegroundColor Cyan
    Write-Host "  DeepSeek    → https://platform.deepseek.com" -ForegroundColor Cyan
    Write-Host "  Kimi        → https://platform.moonshot.cn" -ForegroundColor Cyan
    Write-Host "  智谱        → https://open.bigmodel.cn" -ForegroundColor Cyan
    Write-Host "  通义千问    → https://dashscope.console.aliyun.com" -ForegroundColor Cyan
    Write-Host ""
    
    if (Prompt-YesNo "是否查看详细模型提供商列表? (y/N)" "n") {
        Show-ModelProviders
    }
    
    # API 类型
    Write-Host ""
    Write-Host "请选择 API 类型:" -ForegroundColor White
    Write-Host "  openai-responses     - OpenAI 兼容 API (GPT, DeepSeek, Kimi, GLM, Qwen 等)" -ForegroundColor Yellow
    Write-Host "  anthropic-messages   - Anthropic 兼容 API (Claude)" -ForegroundColor Yellow
    Write-Host ""
    
    $apiTypeDisplay = Prompt-Choice "请选择 API 类型" @("openai-responses (推荐，兼容大多数模型)", "anthropic-messages (Claude)")
    $script:MODEL_API_TYPE = $apiTypeDisplay.Split(' ')[0]
    
    # Base URL
    Write-Host ""
    Write-Host "请输入 API 地址 (Base URL):" -ForegroundColor White
    
    $defaultUrl = switch ($script:MODEL_API_TYPE) {
        "openai-responses" {
            Write-Host ""
            Write-Host "常用地址:"
            Write-Host "  OpenAI:     https://api.openai.com/v1" -ForegroundColor Cyan
            Write-Host "  DeepSeek:   https://api.deepseek.com/v1" -ForegroundColor Cyan
            Write-Host "  Kimi:       https://api.moonshot.cn/v1" -ForegroundColor Cyan
            Write-Host "  智谱:       https://open.bigmodel.cn/api/paas/v4" -ForegroundColor Cyan
            Write-Host "  通义千问:   https://dashscope.aliyuncs.com/compatible-mode/v1" -ForegroundColor Cyan
            Write-Host "  Ollama:     http://127.0.0.1:11434/v1" -ForegroundColor Cyan
            "https://api.openai.com/v1"
        }
        "anthropic-messages" { "https://api.anthropic.com" }
        default { "https://api.example.com/v1" }
    }
    
    $script:MODEL_BASE_URL = Prompt-Input "API 地址" $defaultUrl
    
    # API Key
    Write-Host ""
    Write-Host "请输入 API Key:" -ForegroundColor White
    Write-Host "提示: API Key 通常以 sk- 开头，从模型提供商网站获取" -ForegroundColor Yellow
    Write-Host ""
    
    $script:MODEL_API_KEY = Prompt-Input "API Key"
    while ([string]::IsNullOrWhiteSpace($script:MODEL_API_KEY)) {
        Write-Error "API Key 不能为空！"
        Write-Host "请访问模型提供商网站获取 API Key" -ForegroundColor Yellow
        $script:MODEL_API_KEY = Prompt-Input "API Key"
    }
    
    # Model ID
    Write-Host ""
    Write-Host "请输入模型 ID:" -ForegroundColor White
    Write-Host ""
    Write-Host "常用模型 ID:"
    Write-Host "  gpt-4o           - OpenAI GPT-4o" -ForegroundColor Cyan
    Write-Host "  gpt-4-turbo      - OpenAI GPT-4 Turbo" -ForegroundColor Cyan
    Write-Host "  deepseek-chat    - DeepSeek V3" -ForegroundColor Cyan
    Write-Host "  moonshot-v1-8k   - Kimi V1" -ForegroundColor Cyan
    Write-Host "  glm-4            - 智谱 GLM-4" -ForegroundColor Cyan
    Write-Host "  qwen-turbo       - 通义千问" -ForegroundColor Cyan
    Write-Host "  claude-sonnet-4-5 - Claude Sonnet" -ForegroundColor Cyan
    Write-Host ""
    
    $script:MODEL_ID = Prompt-Input "模型 ID" "gpt-4o"
    
    # 高级选项
    Write-Host ""
    if (Prompt-YesNo "是否配置高级选项? (上下文窗口、最大输出) (y/N)" "n") {
        $script:MODEL_CONTEXT = Prompt-Input "上下文窗口大小 (tokens)" "128000"
        $script:MODEL_MAX_TOKENS = Prompt-Input "最大输出 tokens" "8192"
    } else {
        $script:MODEL_CONTEXT = "128000"
        $script:MODEL_MAX_TOKENS = "8192"
    }
    
    Write-Success "模型配置完成！"
}

# ============================================
# Telegram 配置
# ============================================

function Configure-Telegram {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Magenta
    Write-Host "  📱 Telegram 机器人配置" -ForegroundColor Magenta
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "Telegram 是什么?" -ForegroundColor White
    Write-Host "  Telegram 是一款流行的即时通讯应用，您可以在 Telegram 中与 AI 助手对话。"
    Write-Host ""
    Write-Host "如何获取 Telegram Bot Token?" -ForegroundColor White
    Write-Host ""
    Write-Host "  步骤 1: 在 Telegram 中搜索 @BotFather" -ForegroundColor Yellow
    Write-Host "  步骤 2: 发送 /newbot 命令" -ForegroundColor Yellow
    Write-Host "  步骤 3: 按提示设置机器人名称" -ForegroundColor Yellow
    Write-Host "  步骤 4: 复制返回的 Token (格式: 1234567890:ABCdefGHI...)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  详细教程: https://core.telegram.org/bots/tutorial" -ForegroundColor Cyan
    Write-Host ""
    
    $botToken = Prompt-Input "请输入 Telegram Bot Token (留空跳过)"
    
    if (-not [string]::IsNullOrWhiteSpace($botToken)) {
        $script:CHANNELS_CONFIG["telegram"] = @{
            enabled = $true
            botToken = $botToken
            dmPolicy = "pairing"
            groupPolicy = "open"
        }
        Write-Success "Telegram 配置完成！"
        Write-Host ""
        Write-Host "提示: 首次使用需要在 Telegram 中向机器人发送消息，然后运行:" -ForegroundColor Yellow
        Write-Host "  openclaw pairing list           # 查看配对请求" -ForegroundColor Cyan
        Write-Host "  openclaw pairing approve telegram <代码>  # 批准配对" -ForegroundColor Cyan
        return $true
    }
    return $false
}

# ============================================
# Discord 配置
# ============================================

function Configure-Discord {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Magenta
    Write-Host "  🎮 Discord 机器人配置" -ForegroundColor Magenta
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "Discord 是什么?" -ForegroundColor White
    Write-Host "  Discord 是一款流行的社群聊天应用，特别受游戏玩家和开发者欢迎。"
    Write-Host ""
    Write-Host "如何创建 Discord 机器人?" -ForegroundColor White
    Write-Host ""
    Write-Host "  步骤 1: 访问 https://discord.com/developers/applications" -ForegroundColor Yellow
    Write-Host "  步骤 2: 点击 New Application 创建应用" -ForegroundColor Yellow
    Write-Host "  步骤 3: 左侧菜单选择 Bot，点击 Add Bot" -ForegroundColor Yellow
    Write-Host "  步骤 4: 启用以下 Intents:" -ForegroundColor Yellow
    Write-Host "           • Message Content Intent (必需)" -ForegroundColor Cyan
    Write-Host "           • Server Members Intent (推荐)" -ForegroundColor Cyan
    Write-Host "  步骤 5: 点击 Reset Token 获取 Token" -ForegroundColor Yellow
    Write-Host "  步骤 6: 左侧选择 OAuth2，勾选 bot 和 applications.commands" -ForegroundColor Yellow
    Write-Host "  步骤 7: 复制邀请链接，将机器人添加到服务器" -ForegroundColor Yellow
    Write-Host ""
    
    $botToken = Prompt-Input "请输入 Discord Bot Token (留空跳过)"
    
    if (-not [string]::IsNullOrWhiteSpace($botToken)) {
        Write-Host ""
        Write-Host "请输入 Discord 服务器 ID (可选):" -ForegroundColor Cyan
        Write-Host "获取方法: Discord 设置 → 高级 → 开发者模式 (开启)" -ForegroundColor Yellow
        Write-Host "然后右键点击服务器 → 复制服务器 ID" -ForegroundColor Yellow
        
        $serverId = Prompt-Input "服务器 ID (留空跳过)"
        
        $discordConfig = @{
            enabled = $true
            token = $botToken
            dmPolicy = "pairing"
        }
        
        if (-not [string]::IsNullOrWhiteSpace($serverId)) {
            $discordConfig["guilds"] = @{
                $serverId = @{
                    requireMention = $false
                }
            }
        }
        
        $script:CHANNELS_CONFIG["discord"] = $discordConfig
        Write-Success "Discord 配置完成！"
        return $true
    }
    return $false
}

# ============================================
# 飞书/Lark 配置
# ============================================

function Configure-Feishu {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Magenta
    Write-Host "  🪽 飞书 / Lark 机器人配置" -ForegroundColor Magenta
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "飞书是什么?" -ForegroundColor White
    Write-Host "  飞书是字节跳动推出的企业协作平台，在国内和国际分别叫飞书和 Lark。"
    Write-Host ""
    Write-Host "如何创建飞书机器人?" -ForegroundColor White
    Write-Host ""
    Write-Host "  步骤 1: 访问 https://open.feishu.cn/app (国际版: https://open.larksuite.com/app)" -ForegroundColor Yellow
    Write-Host "  步骤 2: 点击 创建企业自建应用" -ForegroundColor Yellow
    Write-Host "  步骤 3: 在 凭证与基础信息 页面获取 App ID 和 App Secret" -ForegroundColor Yellow
    Write-Host "  步骤 4: 在 权限管理 中添加权限:" -ForegroundColor Yellow
    Write-Host "           • im:message (获取与发送消息)" -ForegroundColor Cyan
    Write-Host "           • im:message:send_as_bot (以应用身份发消息)" -ForegroundColor Cyan
    Write-Host "  步骤 5: 在 应用功能 → 机器人 中启用机器人" -ForegroundColor Yellow
    Write-Host "  步骤 6: 在 事件订阅 中:" -ForegroundColor Yellow
    Write-Host "           • 选择 使用长连接接收事件" -ForegroundColor Cyan
    Write-Host "           • 添加事件: im.message.receive_v1" -ForegroundColor Cyan
    Write-Host "  步骤 7: 创建版本并提交发布" -ForegroundColor Yellow
    Write-Host ""
    
    $appId = Prompt-Input "请输入飞书 App ID (格式: cli_xxx，留空跳过)"
    
    if (-not [string]::IsNullOrWhiteSpace($appId)) {
        $appSecret = Prompt-Input "请输入飞书 App Secret"
        
        if (-not [string]::IsNullOrWhiteSpace($appSecret)) {
            $domainDisplay = Prompt-Choice "请选择域名" @("feishu (国内飞书)", "lark (国际版)")
            $domain = $domainDisplay.Split(' ')[0]
            
            $script:CHANNELS_CONFIG["feishu"] = @{
                enabled = $true
                domain = $domain
                accounts = @{
                    "default" = @{
                        appId = $appId
                        appSecret = $appSecret
                        domain = $domain
                    }
                }
                dmPolicy = "pairing"
                groupPolicy = "open"
            }
            
            Write-Host ""
            Write-Host "正在安装飞书插件..." -ForegroundColor Cyan
            npm install -g @max1874/feishu --silent 2>$null
            
            Write-Success "飞书配置完成！"
            Write-Host ""
            Write-Host "提示: 确保应用已发布并通过审核，机器人才能正常工作" -ForegroundColor Yellow
            return $true
        }
    }
    return $false
}

# ============================================
# 渠道配置
# ============================================

function Configure-Channels {
    Write-Step "第 2 步：配置聊天渠道 (可选)"
    
    Write-Host "您可以让 OpenClaw 在多个聊天平台工作:" -ForegroundColor White
    Write-Host ""
    Write-Host "  📱 Telegram   - 流行的即时通讯应用" -ForegroundColor Yellow
    Write-Host "  🎮 Discord    - 游戏玩家和开发者社区" -ForegroundColor Yellow
    Write-Host "  🪽 飞书/Lark  - 企业协作平台" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "提示: 您可以稍后通过编辑配置文件添加更多渠道" -ForegroundColor Cyan
    Write-Host ""
    
    if (Prompt-YesNo "是否配置 Telegram? (y/N)" "n") {
        Configure-Telegram
    }
    
    if (Prompt-YesNo "是否配置 Discord? (y/N)" "n") {
        Configure-Discord
    }
    
    if (Prompt-YesNo "是否配置飞书/Lark? (y/N)" "n") {
        Configure-Feishu
    }
}

# ============================================
# 生成配置文件
# ============================================

function Generate-Config {
    $channelsJson = "{}"
    if ($script:CHANNELS_CONFIG.Count -gt 0) {
        $channelsJson = $script:CHANNELS_CONFIG | ConvertTo-Json -Depth 10
    }
    
    return @"
{
  agent: {
    workspace: "~/.openclaw/workspace",
    model: { primary: "custom/$($script:MODEL_ID)" }
  },
  models: {
    mode: "merge",
    providers: {
      "custom": {
        baseUrl: "$($script:MODEL_BASE_URL)",
        apiKey: "$($script:MODEL_API_KEY)",
        api: "$($script:MODEL_API_TYPE)",
        models: [
          {
            id: "$($script:MODEL_ID)",
            name: "$($script:MODEL_ID)",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: $($script:MODEL_CONTEXT),
            maxTokens: $($script:MODEL_MAX_TOKENS)
          }
        ]
      }
    }
  },
  channels: $channelsJson,
  session: {
    dmScope: "per-channel-peer"
  }
}
"@
}

function Save-Config {
    if (-not (Test-Path $CONFIG_DIR)) {
        New-Item -ItemType Directory -Force -Path $CONFIG_DIR | Out-Null
    }
    if (-not (Test-Path "$CONFIG_DIR\workspace")) {
        New-Item -ItemType Directory -Force -Path "$CONFIG_DIR\workspace" | Out-Null
    }
    
    $config = Generate-Config
    $config | Out-File -FilePath $CONFIG_FILE -Encoding UTF8
    
    Write-Success "配置文件已保存到: $CONFIG_FILE"
}

# ============================================
# 启动 Gateway
# ============================================

function Start-Gateway {
    Write-Step "第 3 步：启动 OpenClaw Gateway"
    
    Write-Host "正在启动 OpenClaw 服务..." -ForegroundColor White
    Write-Host ""
    
    Write-Host "正在配置 Gateway 守护进程..." -ForegroundColor Cyan
    try {
        openclaw onboard --install-daemon 2>$null
    } catch {}
    
    Write-Host "正在启动 Gateway..." -ForegroundColor Cyan
    Start-Process -FilePath "openclaw" -ArgumentList "gateway" -NoNewWindow
    
    Start-Sleep -Seconds 3
    
    # 显示完成信息
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║                                                          ║" -ForegroundColor Green
    Write-Host "║   🎉 OpenClaw 已成功安装并启动！                         ║" -ForegroundColor Green
    Write-Host "║                                                          ║" -ForegroundColor Green
    Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "📋 访问信息:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Web 界面:   " -NoNewline; Write-Host "http://127.0.0.1:18789" -ForegroundColor Yellow
    Write-Host "  配置文件:   " -NoNewline; Write-Host $CONFIG_FILE -ForegroundColor Yellow
    Write-Host "  工作目录:   " -NoNewline; Write-Host "$CONFIG_DIR\workspace" -ForegroundColor Yellow
    Write-Host ""
    
    Write-Host "🛠️ 常用命令:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  openclaw agent --message '你好'" -ForegroundColor Cyan
    Write-Host "      → 在命令行与 AI 助手对话"
    Write-Host ""
    Write-Host "  openclaw gateway status" -ForegroundColor Cyan
    Write-Host "      → 查看服务状态"
    Write-Host ""
    Write-Host "  openclaw gateway stop" -ForegroundColor Cyan
    Write-Host "      → 停止服务"
    Write-Host ""
    Write-Host "  openclaw gateway start" -ForegroundColor Cyan
    Write-Host "      → 启动服务"
    Write-Host ""
    Write-Host "  openclaw dashboard" -ForegroundColor Cyan
    Write-Host "      → 打开 Web 管理界面"
    Write-Host ""
    
    if ($script:CHANNELS_CONFIG.Count -gt 0) {
        Write-Host "📱 渠道管理:" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  openclaw channels status" -ForegroundColor Cyan
        Write-Host "      → 查看所有渠道状态"
        Write-Host ""
        Write-Host "  openclaw pairing list" -ForegroundColor Cyan
        Write-Host "      → 查看配对请求"
        Write-Host ""
        Write-Host "  openclaw pairing approve <渠道> <代码>" -ForegroundColor Cyan
        Write-Host "      → 批准配对 (首次使用需要配对验证)"
        Write-Host ""
        Write-Host "💡 提示: 首次使用时，向机器人发送消息后会收到配对码，" -ForegroundColor Yellow
        Write-Host "   使用上面的命令批准配对即可开始对话。" -ForegroundColor Yellow
        Write-Host ""
    }
    
    Write-Host "📚 更多帮助:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  官方文档:   https://docs.openclaw.ai" -ForegroundColor Cyan
    Write-Host "  问题反馈:   https://github.com/openclaw/openclaw/issues" -ForegroundColor Cyan
    Write-Host ""
}

# ============================================
# 主流程
# ============================================

Write-Banner

Write-Success "检测到系统: Windows"

# 步骤 0: 环境检查
Write-Step "第 0 步：检查环境"

if (-not (Check-Node)) {
    Write-Host ""
    Write-Host "需要安装 Node.js 22 或更高版本" -ForegroundColor Yellow
    
    if (Prompt-YesNo "是否自动安装 Node.js? (Y/n)" "y") {
        if (-not (Install-Node)) {
            Write-Host "请手动安装 Node.js 后重新运行此脚本" -ForegroundColor Yellow
            exit 1
        }
        
        # 验证安装
        if (-not (Check-Node)) {
            Write-Error "Node.js 安装可能需要重启终端才能生效"
            Write-Host "请关闭此 PowerShell 窗口，打开新窗口后重新运行此脚本" -ForegroundColor Yellow
            Write-Host "或手动安装: https://nodejs.org" -ForegroundColor Yellow
            exit 1
        }
    } else {
        Write-Host "请手动安装 Node.js 22+ 后重新运行此脚本" -ForegroundColor Yellow
        Write-Host "  访问: https://nodejs.org" -ForegroundColor Cyan
        Write-Host "  或使用: winget install OpenJS.NodeJS.LTS" -ForegroundColor Cyan
        exit 1
    }
}

# 检查 OpenClaw
if (-not (Check-OpenClaw)) {
    Write-Host ""
    if (Prompt-YesNo "是否安装 OpenClaw? (Y/n)" "y") {
        if (-not (Install-OpenClaw)) {
            exit 1
        }
    } else {
        Write-Host "请手动安装: npm install -g openclaw@latest" -ForegroundColor Yellow
        exit 1
    }
}

# 检查现有配置
if (Test-Path $CONFIG_FILE) {
    Write-Host ""
    Write-Warning "检测到已有配置文件: $CONFIG_FILE"

    if (Prompt-YesNo "是否重新配置? (y/N)" "n") {
        Write-Success "跳过配置，直接启动..."
        Start-Gateway
        exit 0
    }
}

# 选择配置方式
Write-Host ""
Write-Step "选择配置方式"
Write-Host "请选择配置方式:" -ForegroundColor White
Write-Host "  1) Web 界面配置 (推荐，避免中文显示问题)" -ForegroundColor Yellow
Write-Host "  2) 命令行配置 (传统方式)" -ForegroundColor Yellow
Write-Host ""

$useWebConfig = $false
$choice = Read-Host "请输入选择 [1/2]"

if ($choice -eq '1' -or [string]::IsNullOrWhiteSpace($choice)) {
    $useWebConfig = $true
}

if ($useWebConfig) {
    # 使用 Web 配置界面
    Write-Host ""
    Write-Host "启动 Web 配置服务器..." -ForegroundColor Cyan
    Write-Host ""

    # 检查并下载 Web 配置脚本
    $webConfigScript = Join-Path $PSScriptRoot "web-config.js"

    if (-not (Test-Path $webConfigScript)) {
        $webConfigScript = Join-Path $env:TEMP "openclaw-web-config.js"
        try {
            $webUrl = "https://raw.githubusercontent.com/MrCatAI/openclaw-quickstart/main/web-config.js"
            Write-Host "下载 Web 配置脚本..." -ForegroundColor Gray
            Invoke-WebRequest -Uri $webUrl -OutFile $webConfigScript -UseBasicParsing
        } catch {
            Write-Error "下载失败，请手动访问配置页面"
            exit 1
        }
    }

    Write-Host "启动配置服务器..." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  请在浏览器中打开配置页面" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  http://127.0.0.1:18790" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "配置完成后将自动启动 OpenClaw Gateway" -ForegroundColor Green
    Write-Host ""
    Write-Host "按 Ctrl+C 可停止配置服务器" -ForegroundColor Gray
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""

    # 启动 Web 配置服务器
    & node $webConfigScript

    # 等待一下确保信号文件被写入
    Start-Sleep -Seconds 2

    # 检查配置是否完成
    $doneFile = Join-Path $CONFIG_DIR "web-config-done"

    if (Test-Path $doneFile) {
        # 显示完成信息
        Write-Host ""
        Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Green
        Write-Host "║                                                          ║" -ForegroundColor Green
        Write-Host "║   🎉 OpenClaw 已成功安装并启动！                         ║" -ForegroundColor Green
        Write-Host "║                                                          ║" -ForegroundColor Green
        Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Green
        Write-Host ""

        Write-Host "📋 访问信息:" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  Web 界面:   " -NoNewline; Write-Host "http://127.0.0.1:18789" -ForegroundColor Yellow
        Write-Host "  配置文件:   " -NoNewline; Write-Host $CONFIG_FILE -ForegroundColor Yellow
        Write-Host "  工作目录:   " -NoNewline; Write-Host "$CONFIG_DIR\workspace" -ForegroundColor Yellow
        Write-Host ""

        Write-Host "🛠️ 常用命令:" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  openclaw agent --message '你好'" -ForegroundColor Cyan
        Write-Host "      → 在命令行与 AI 助手对话"
        Write-Host ""
        Write-Host "  openclaw gateway status" -ForegroundColor Cyan
        Write-Host "      → 查看服务状态"
        Write-Host ""
        Write-Host "  openclaw gateway stop" -ForegroundColor Cyan
        Write-Host "      → 停止服务"
        Write-Host ""
        Write-Host "  openclaw gateway start" -ForegroundColor Cyan
        Write-Host "      → 启动服务"
        Write-Host ""
        Write-Host "  openclaw dashboard" -ForegroundColor Cyan
        Write-Host "      → 打开 Web 管理界面"
        Write-Host ""

        # 清理信号文件
        Remove-Item $doneFile -Force -ErrorAction SilentlyContinue

        exit 0
    } else {
        Write-Host ""
        Write-Warning "配置未完成或被取消"
        Write-Host "您可以稍后通过编辑配置文件手动配置，或重新运行安装脚本" -ForegroundColor Cyan
        Write-Host "  配置文件: $CONFIG_FILE" -ForegroundColor Yellow
        exit 1
    }
}

# 命令行配置流程
Configure-Model
Configure-Channels
Save-Config

# 启动
Start-Gateway
