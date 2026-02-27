#!/bin/bash
set -euo pipefail

# OpenClaw 快速安装器
# 用法: curl -fsSL https://raw.githubusercontent.com/你的用户名/openclaw-quickstart/main/install.sh | bash

BOLD='\033[1m'
GREEN='\033[32m'
YELLOW='\033[33m'
RED='\033[31m'
CYAN='\033[36m'
MAGENTA='\033[35m'
NC='\033[0m'

CONFIG_DIR="$HOME/.openclaw"
CONFIG_FILE="$CONFIG_DIR/openclaw.json"
OS=""

# 全局变量
MODEL_BASE_URL=""
MODEL_API_KEY=""
MODEL_ID=""
MODEL_API_TYPE=""
MODEL_CONTEXT=""
MODEL_MAX_TOKENS=""
TELEGRAM_CONFIG=""
DISCORD_CONFIG=""
FEISHU_CONFIG=""

print_banner() {
    echo ""
    echo -e "${CYAN}${BOLD}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}${BOLD}║                                                          ║${NC}"
    echo -e "${CYAN}${BOLD}║   🦞  OpenClaw 快速安装器                                ║${NC}"
    echo -e "${CYAN}${BOLD}║                                                          ║${NC}"
    echo -e "${CYAN}${BOLD}║   一键安装并配置您的 AI 助手                              ║${NC}"
    echo -e "${CYAN}${BOLD}║                                                          ║${NC}"
    echo -e "${CYAN}${BOLD}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${MAGENTA}OpenClaw 是一个强大的 AI 个人助手，可以:${NC}"
    echo -e "${MAGENTA}  • 在 Telegram / Discord / 飞书 等平台与您对话${NC}"
    echo -e "${MAGENTA}  • 使用各种 AI 模型 (GPT-4o, Claude, DeepSeek, Kimi 等)${NC}"
    echo -e "${MAGENTA}  • 自动化处理各种任务${NC}"
    echo ""
    echo -e "${YELLOW}本安装器将引导您完成:${NC}"
    echo -e "${YELLOW}  1️⃣  安装 OpenClaw${NC}"
    echo -e "${YELLOW}  2️⃣  配置 AI 模型${NC}"
    echo -e "${YELLOW}  3️⃣  配置聊天渠道 (可选)${NC}"
    echo -e "${YELLOW}  4️⃣  启动服务${NC}"
    echo ""
}

ui_info() {
    echo -e "${GREEN}✓${NC} $1"
}

ui_warn() {
    echo -e "${YELLOW}!${NC} $1"
}

ui_error() {
    echo -e "${RED}✗${NC} $1"
}

ui_step() {
    echo ""
    echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}${BOLD}  $1${NC}"
    echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# ============================================
# 系统检测
# ============================================
detect_os() {
    case "$(uname -s 2>/dev/null || true)" in
        Darwin) OS="macos" ;;
        Linux) OS="linux" ;;
        *) OS="unknown" ;;
    esac
}

is_root() {
    [[ "$(id -u)" -eq 0 ]]
}

# ============================================
# Node.js 检测和安装 (完全遵循 OpenClaw 官方逻辑)
# ============================================

# 获取 Node.js 主版本号
node_major_version() {
    if ! command -v node &> /dev/null; then
        return 1
    fi
    local version major
    version="$(node -v 2>/dev/null || true)"
    major="${version#v}"
    major="${major%%.*}"
    if [[ "$major" =~ ^[0-9]+$ ]]; then
        echo "$major"
        return 0
    fi
    return 1
}

# 打印当前 Node.js 路径信息
print_active_node_paths() {
    if ! command -v node &> /dev/null; then
        return 1
    fi
    local node_path node_version npm_path npm_version
    node_path="$(command -v node 2>/dev/null || true)"
    node_version="$(node -v 2>/dev/null || true)"
    ui_info "当前 Node.js: ${node_version:-unknown} (${node_path:-unknown})"

    if command -v npm &> /dev/null; then
        npm_path="$(command -v npm 2>/dev/null || true)"
        npm_version="$(npm -v 2>/dev/null || true)"
        ui_info "当前 npm: ${npm_version:-unknown} (${npm_path:-unknown})"
    fi
    return 0
}

# 刷新 shell 命令缓存
refresh_shell_command_cache() {
    hash -r 2>/dev/null || true
}

# macOS: 确保 node@22 在 PATH 中生效
ensure_macos_node22_active() {
    if [[ "$OS" != "macos" ]]; then
        return 0
    fi

    local brew_node_prefix=""
    if command -v brew &> /dev/null; then
        brew_node_prefix="$(brew --prefix node@22 2>/dev/null || true)"
        if [[ -n "$brew_node_prefix" && -x "${brew_node_prefix}/bin/node" ]]; then
            export PATH="${brew_node_prefix}/bin:$PATH"
            refresh_shell_command_cache
        fi
    fi

    local major=""
    major="$(node_major_version || true)"
    if [[ -n "$major" && "$major" -ge 22 ]]; then
        return 0
    fi

    local active_path active_version
    active_path="$(command -v node 2>/dev/null || echo "未找到")"
    active_version="$(node -v 2>/dev/null || echo "缺失")"

    ui_error "Node.js v22 已安装但当前 shell 使用的是 ${active_version} (${active_path})"
    if [[ -n "$brew_node_prefix" ]]; then
        echo "请将以下内容添加到您的 shell 配置文件并重启终端:"
        echo "  export PATH=\"${brew_node_prefix}/bin:\$PATH\""
    else
        echo "请确保 Homebrew node@22 在 PATH 最前面，然后重新运行安装器。"
    fi
    return 1
}

# 检查 Node.js
check_node() {
    if command -v node &> /dev/null; then
        local node_version
        node_version="$(node_major_version || true)"
        if [[ -n "$node_version" && "$node_version" -ge 22 ]]; then
            ui_info "检测到 Node.js v$(node -v | cut -d'v' -f2) ✓"
            print_active_node_paths || true
            return 0
        else
            if [[ -n "$node_version" ]]; then
                ui_warn "检测到 Node.js $(node -v)，需要升级到 v22+"
            else
                ui_warn "检测到 Node.js 但版本无法解析，需要重新安装 v22+"
            fi
            return 1
        fi
    else
        ui_warn "未检测到 Node.js"
        return 1
    fi
}

# 安装 Homebrew (macOS)
install_homebrew() {
    if [[ "$OS" != "macos" ]]; then
        return 0
    fi
    
    if ! command -v brew &> /dev/null; then
        echo -e "${CYAN}正在安装 Homebrew...${NC}"
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        
        # 添加 Homebrew 到 PATH
        if [[ -f "/opt/homebrew/bin/brew" ]]; then
            eval "$(/opt/homebrew/bin/brew shellenv)"
        elif [[ -f "/usr/local/bin/brew" ]]; then
            eval "$(/usr/local/bin/brew shellenv)"
        fi
        ui_info "Homebrew 安装完成"
    else
        ui_info "Homebrew 已安装"
    fi
}

# 安装 Node.js (macOS)
install_node_macos() {
    echo ""
    echo -e "${CYAN}正在为 macOS 安装 Node.js...${NC}"
    
    install_homebrew
    
    echo "正在通过 Homebrew 安装 node@22..."
    brew install node@22 2>/dev/null || true
    brew link node@22 --overwrite --force 2>/dev/null || true
    
    if ! ensure_macos_node22_active; then
        return 1
    fi
    
    ui_info "Node.js 安装完成"
    print_active_node_paths || true
    return 0
}

# 安装 Node.js (Linux)
install_node_linux() {
    echo ""
    echo -e "${CYAN}正在为 Linux 安装 Node.js...${NC}"
    
    # 检测包管理器并安装
    if command -v apt-get &> /dev/null; then
        echo "检测到 apt-get，正在安装..."
        local tmp
        tmp="$(mktemp)"
        curl -fsSL https://deb.nodesource.com/setup_22.x -o "$tmp"
        if is_root; then
            bash "$tmp"
            apt-get install -y -qq nodejs
        else
            sudo -E bash "$tmp"
            sudo apt-get install -y -qq nodejs
        fi
        rm -f "$tmp"
    elif command -v dnf &> /dev/null; then
        echo "检测到 dnf，正在安装..."
        local tmp
        tmp="$(mktemp)"
        curl -fsSL https://rpm.nodesource.com/setup_22.x -o "$tmp"
        if is_root; then
            bash "$tmp"
            dnf install -y -q nodejs
        else
            sudo bash "$tmp"
            sudo dnf install -y -q nodejs
        fi
        rm -f "$tmp"
    elif command -v yum &> /dev/null; then
        echo "检测到 yum，正在安装..."
        local tmp
        tmp="$(mktemp)"
        curl -fsSL https://rpm.nodesource.com/setup_22.x -o "$tmp"
        if is_root; then
            bash "$tmp"
            yum install -y -q nodejs
        else
            sudo bash "$tmp"
            sudo yum install -y -q nodejs
        fi
        rm -f "$tmp"
    else
        ui_error "无法检测到包管理器"
        echo ""
        echo "请手动安装 Node.js 22+:"
        echo "  访问: https://nodejs.org"
        echo "  或运行: curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs"
        return 1
    fi
    
    ui_info "Node.js v22 安装完成"
    print_active_node_paths || true
    return 0
}

# 安装 Node.js (统一入口)
install_node() {
    case "$OS" in
        "macos") install_node_macos ;;
        "linux") install_node_linux ;;
        *)
            ui_error "不支持的操作系统"
            echo "请手动安装 Node.js 22+: https://nodejs.org"
            return 1
            ;;
    esac
}

# ============================================
# OpenClaw 安装 (增强版，包含官方脚本的健壮性处理)
# ============================================

# 清理旧版子模块
cleanup_legacy_submodules() {
    local repo_dir="${1:-}"
    if [[ -z "$repo_dir" ]]; then
        return 0
    fi
    local legacy_dir="$repo_dir/Peekaboo"
    if [[ -d "$legacy_dir" ]]; then
        ui_warn "正在移除旧版子模块: ${legacy_dir}"
        rm -rf "$legacy_dir"
    fi
}

# 清理 NPM 冲突路径
cleanup_npm_openclaw_paths() {
    local npm_root=""
    npm_root="$(npm root -g 2>/dev/null || true)"
    if [[ -z "$npm_root" || "$npm_root" != *node_modules* ]]; then
        return 1
    fi
    rm -rf "$npm_root"/.openclaw-* "$npm_root"/openclaw 2>/dev/null || true
}

# 提取冲突路径
extract_openclaw_conflict_path() {
    local log="$1"
    local path=""
    path="$(sed -n 's/.*File exists: //p' "$log" | head -n1)"
    if [[ -z "$path" ]]; then
        path="$(sed -n 's/.*EEXIST: file already exists, //p' "$log" | head -n1)"
    fi
    if [[ -n "$path" ]]; then
        echo "$path"
        return 0
    fi
    return 1
}

# 清理 openclaw 二进制冲突
cleanup_openclaw_bin_conflict() {
    local bin_path="$1"
    if [[ -z "$bin_path" || ( ! -e "$bin_path" && ! -L "$bin_path" ) ]]; then
        return 1
    fi
    
    # 检查是否是系统路径中的旧版本
    case "$bin_path" in
        "/opt/homebrew/bin/openclaw"|"/usr/local/bin/openclaw")
            ;;
        *)
            return 1
            ;;
    esac
    
    if [[ -L "$bin_path" ]]; then
        local target=""
        target="$(readlink "$bin_path" 2>/dev/null || true)"
        if [[ "$target" == *"/node_modules/openclaw/"* ]]; then
            rm -f "$bin_path"
            ui_info "已移除旧的 openclaw 符号链接: ${bin_path}"
            return 0
        fi
        return 1
    fi
    
    local backup=""
    backup="${bin_path}.bak-$(date +%Y%m%d-%H%M%S)"
    if mv "$bin_path" "$backup"; then
        ui_info "已将现有的 openclaw 二进制文件移动到: ${backup}"
        return 0
    fi
    return 1
}

# 检查是否需要构建工具
npm_log_indicates_missing_build_tools() {
    local log="$1"
    if [[ -z "$log" || ! -f "$log" ]]; then
        return 1
    fi
    grep -Eiq "(not found: make|make: command not found|cmake: command not found|CMAKE_MAKE_PROGRAM is not set|Could not find CMAKE|gyp ERR! find Python|no developer tools were found|is not able to compile a simple test program|Failed to build llama\\.cpp|It seems that \"make\" is not installed in your system|It seems that the used \"cmake\" doesn't work properly)" "$log"
}

# 在 macOS 上安装构建工具
install_build_tools_macos() {
    local ok=true
    
    if ! xcode-select -p >/dev/null 2>&1; then
        ui_info "正在安装 Xcode Command Line Tools (需要 make/clang)..."
        xcode-select --install >/dev/null 2>&1 || true
        if ! xcode-select -p >/dev/null 2>&1; then
            ui_warn "Xcode Command Line Tools 尚未准备好"
            ui_info "请完成安装对话框，然后重新运行此安装器"
            ok=false
        fi
    fi
    
    if ! command -v cmake >/dev/null 2>&1; then
        if command -v brew >/dev/null 2>&1; then
            echo "正在安装 cmake..."
            brew install cmake 2>/dev/null || true
        else
            ui_warn "Homebrew 不可用，无法自动安装 cmake"
            ok=false
        fi
    fi
    
    if ! command -v make >/dev/null 2>&1; then
        ui_warn "make 仍然不可用"
        ok=false
    fi
    if ! command -v cmake >/dev/null 2>&1; then
        ui_warn "cmake 仍然不可用"
        ok=false
    fi
    
    [[ "$ok" == "true" ]]
}

# 在 Linux 上安装构建工具
install_build_tools_linux() {
    if command -v apt-get &> /dev/null; then
        echo "正在安装构建工具..."
        if is_root; then
            apt-get update -qq 2>/dev/null || true
            apt-get install -y -qq build-essential python3 make g++ cmake 2>/dev/null || true
        else
            sudo apt-get update -qq 2>/dev/null || true
            sudo apt-get install -y -qq build-essential python3 make g++ cmake 2>/dev/null || true
        fi
        return 0
    fi
    
    if command -v dnf &> /dev/null; then
        echo "正在安装构建工具..."
        if is_root; then
            dnf install -y -q gcc gcc-c++ make cmake python3 2>/dev/null || true
        else
            sudo dnf install -y -q gcc gcc-c++ make cmake python3 2>/dev/null || true
        fi
        return 0
    fi
    
    if command -v yum &> /dev/null; then
        echo "正在安装构建工具..."
        if is_root; then
            yum install -y -q gcc gcc-c++ make cmake python3 2>/dev/null || true
        else
            sudo yum install -y -q gcc gcc-c++ make cmake python3 2>/dev/null || true
        fi
        return 0
    fi
    
    if command -v apk &> /dev/null; then
        echo "正在安装构建工具..."
        if is_root; then
            apk add --no-cache build-base python3 cmake 2>/dev/null || true
        else
            sudo apk add --no-cache build-base python3 cmake 2>/dev/null || true
        fi
        return 0
    fi
    
    ui_warn "无法检测到包管理器来自动安装构建工具"
    return 1
}

# 自动安装构建工具
auto_install_build_tools_for_npm_failure() {
    local log="$1"
    if ! npm_log_indicates_missing_build_tools "$log"; then
        return 1
    fi
    
    ui_warn "检测到缺少原生构建工具，正在尝试自动安装..."
    if [[ "$OS" == "linux" ]]; then
        install_build_tools_linux || return 1
    elif [[ "$OS" == "macos" ]]; then
        install_build_tools_macos || return 1
    else
        return 1
    fi
    ui_info "构建工具安装完成"
    return 0
}

# 提取 npm 调试日志路径
extract_npm_debug_log_path() {
    local log="$1"
    local path=""
    path="$(sed -n -E 's/.*A complete log of this run can be found in:[[:space:]]*//p' "$log" | tail -n1)"
    if [[ -z "$path" ]]; then
        path="$(grep -Eo '/[^[:space:]]+_logs/[^[:space:]]+debug[^[:space:]]*\\.log' "$log" | tail -n1 || true)"
    fi
    if [[ -n "$path" ]]; then
        echo "$path"
        return 0
    fi
    return 1
}

# 提取第一个 npm 错误行
extract_first_npm_error_line() {
    local log="$1"
    grep -E 'npm (ERR!|error)|ERR!' "$log" | head -n1 || true
}

# 提取 npm 错误代码
extract_npm_error_code() {
    local log="$1"
    sed -n -E 's/^npm (ERR!|error) code[[:space:]]+([^[:space:]]+).*$/\\2/p' "$log" | head -n1
}

# 打印 npm 失败诊断信息
print_npm_failure_diagnostics() {
    local log="$1"
    local debug_log=""
    local first_error=""
    local error_code=""
    
    ui_warn "npm install 失败"
    echo "  安装日志: ${log}"
    
    error_code="$(extract_npm_error_code "$log")"
    if [[ -n "$error_code" ]]; then
        echo "  npm 错误代码: ${error_code}"
    fi
    
    debug_log="$(extract_npm_debug_log_path "$log" || true)"
    if [[ -n "$debug_log" ]]; then
        echo "  npm 调试日志: ${debug_log}"
    fi
    
    first_error="$(extract_first_npm_error_line "$log")"
    if [[ -n "$first_error" ]]; then
        echo "  第一个错误: ${first_error}"
    fi
}

check_openclaw() {
    if command -v openclaw &> /dev/null; then
        local version
        version=$(openclaw --version 2>/dev/null || echo '未知版本')
        ui_info "OpenClaw 已安装: $version"
        return 0
    fi
    return 1
}

install_openclaw() {
    echo ""
    echo -e "${CYAN}正在安装 OpenClaw...${NC}"
    echo "这可能需要几分钟时间，请耐心等待..."
    
    # 清理可能的冲突
    cleanup_legacy_submodules "$HOME/openclaw"
    
    # 设置 npm 静默模式
    local prev_loglevel="$NPM_CONFIG_LOGLEVEL"
    local prev_fund="$NPM_CONFIG_FUND"
    local prev_audit="$NPM_CONFIG_AUDIT"
    
    export NPM_CONFIG_LOGLEVEL="error"
    export NPM_CONFIG_FUND="false"
    export NPM_CONFIG_AUDIT="false"
    
    # 创建临时日志文件
    local npm_log
    npm_log="$(mktemp)"
    
    # 第一次安装尝试
    if npm install -g openclaw@latest >"$npm_log" 2>&1; then
        rm -f "$npm_log"
        export NPM_CONFIG_LOGLEVEL="$prev_loglevel"
        export NPM_CONFIG_FUND="$prev_fund"
        export NPM_CONFIG_AUDIT="$prev_audit"
        ui_info "OpenClaw 安装成功！"
        return 0
    fi
    
    # 安装失败，尝试自动修复
    local attempted_fix=false
    
    # 尝试1: 安装构建工具后重试
    if auto_install_build_tools_for_npm_failure "$npm_log"; then
        attempted_fix=true
        ui_info "构建工具安装完成，正在重试..."
        if npm install -g openclaw@latest >"$npm_log" 2>&1; then
            rm -f "$npm_log"
            export NPM_CONFIG_LOGLEVEL="$prev_loglevel"
            export NPM_CONFIG_FUND="$prev_fund"
            export NPM_CONFIG_AUDIT="$prev_audit"
            ui_info "OpenClaw 安装成功！"
            return 0
        fi
    fi
    
    # 尝试2: 清理 NPM 冲突路径后重试
    if grep -q "ENOTEMPTY: directory not empty, rename .*openclaw" "$npm_log"; then
        ui_warn "检测到 npm 残留目录，正在清理..."
        cleanup_npm_openclaw_paths
        if npm install -g openclaw@latest >"$npm_log" 2>&1; then
            rm -f "$npm_log"
            export NPM_CONFIG_LOGLEVEL="$prev_loglevel"
            export NPM_CONFIG_FUND="$prev_fund"
            export NPM_CONFIG_AUDIT="$prev_audit"
            ui_info "OpenClaw 安装成功！"
            return 0
        fi
    fi
    
    # 尝试3: 处理二进制冲突
    if grep -q "EEXIST" "$npm_log"; then
        local conflict=""
        conflict="$(extract_openclaw_conflict_path "$npm_log" || true)"
        if [[ -n "$conflict" ]] && cleanup_openclaw_bin_conflict "$conflict"; then
            if npm install -g openclaw@latest >"$npm_log" 2>&1; then
                rm -f "$npm_log"
                export NPM_CONFIG_LOGLEVEL="$prev_loglevel"
                export NPM_CONFIG_FUND="$prev_fund"
                export NPM_CONFIG_AUDIT="$prev_audit"
                ui_info "OpenClaw 安装成功！"
                return 0
            fi
        fi
    fi
    
    # 所有尝试都失败了
    print_npm_failure_diagnostics "$npm_log"
    
    if [[ "$attempted_fix" == "true" ]]; then
        ui_warn "自动修复后仍然安装失败，显示最后几行日志:"
    else
        ui_warn "安装失败，显示最后几行日志:"
    fi
    tail -n 20 "$npm_log" >&2 || true
    rm -f "$npm_log"
    
    export NPM_CONFIG_LOGLEVEL="$prev_loglevel"
    export NPM_CONFIG_FUND="$prev_fund"
    export NPM_CONFIG_AUDIT="$prev_audit"
    
    ui_error "OpenClaw 安装失败"
    echo "请尝试手动安装: npm install -g openclaw@latest"
    return 1
}

# ============================================
# 用户交互
# ============================================
prompt_input() {
    local prompt="$1"
    local default="${2:-}"
    local value
    
    if [[ -n "$default" ]]; then
        echo -ne "${CYAN}${prompt} [${default}]: ${NC}"
    else
        echo -ne "${CYAN}${prompt}: ${NC}"
    fi
    
    read -r value
    if [[ -z "$value" && -n "$default" ]]; then
        echo "$default"
    else
        echo "$value"
    fi
}

prompt_choice() {
    local prompt="$1"
    shift
    local options=("$@")
    
    echo -e "${CYAN}${prompt}${NC}"
    local i=1
    for opt in "${options[@]}"; do
        echo -e "  ${YELLOW}$i)${NC} $opt"
        ((i++))
    done
    echo -ne "${CYAN}请输入数字选择 [1]: ${NC}"
    
    local choice
    read -r choice
    if [[ -z "$choice" ]]; then
        echo "${options[0]}"
    elif [[ "$choice" =~ ^[0-9]+$ ]] && [[ "$choice" -ge 1 ]] && [[ "$choice" -le ${#options[@]} ]]; then
        echo "${options[$((choice-1))]}"
    else
        echo "${options[0]}"
    fi
}

prompt_yes_no() {
    local prompt="$1"
    local default="${2:-n}"
    
    echo -ne "${CYAN}${prompt} [${default}]: ${NC}"
    local answer
    read -r answer
    if [[ -z "$answer" ]]; then
        [[ "$default" == "y" ]] && return 0 || return 1
    fi
    [[ "$answer" =~ ^[Yy] ]]
}

press_enter() {
    echo ""
    echo -ne "${YELLOW}按回车键继续...${NC}"
    read -r
}

# ============================================
# 模型配置
# ============================================
show_model_providers() {
    echo ""
    echo -e "${BOLD}${MAGENTA}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}${MAGENTA}  常用 AI 模型提供商${NC}"
    echo -e "${BOLD}${MAGENTA}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${BOLD}🌍 国际模型:${NC}"
    echo -e "  ${YELLOW}OpenAI${NC}        - GPT-4o, GPT-4-turbo"
    echo -e "                  API: https://api.openai.com/v1"
    echo ""
    echo -e "  ${YELLOW}Anthropic${NC}     - Claude Sonnet, Claude Opus"
    echo -e "                  API: https://api.anthropic.com (anthropic-messages)"
    echo ""
    echo -e "${BOLD}🇨🇳 国内模型:${NC}"
    echo -e "  ${YELLOW}DeepSeek${NC}      - DeepSeek-V3, DeepSeek-Chat"
    echo -e "                  API: https://api.deepseek.com/v1"
    echo ""
    echo -e "  ${YELLOW}Kimi (月之暗面)${NC} - Kimi K2, moonshot-v1"
    echo -e "                  API: https://api.moonshot.cn/v1"
    echo ""
    echo -e "  ${YELLOW}智谱 GLM${NC}       - GLM-4, GLM-4-Plus"
    echo -e "                  API: https://open.bigmodel.cn/api/paas/v4"
    echo ""
    echo -e "  ${YELLOW}通义千问${NC}       - Qwen-Turbo, Qwen-Plus"
    echo -e "                  API: https://dashscope.aliyuncs.com/compatible-mode/v1"
    echo ""
    echo -e "${BOLD}💻 本地模型:${NC}"
    echo -e "  ${YELLOW}Ollama${NC}        - Llama, Qwen, DeepSeek 本地版"
    echo -e "                  API: http://127.0.0.1:11434/v1"
    echo ""
}

configure_model() {
    ui_step "第 1 步：配置 AI 模型"
    
    echo -e "${BOLD}OpenClaw 需要连接一个 AI 模型才能工作。${NC}"
    echo ""
    echo -e "您可以${YELLOW}选择以下方式${NC}获取 API Key:"
    echo ""
    echo -e "  ${CYAN}OpenAI${NC}      → https://platform.openai.com/api-keys"
    echo -e "  ${CYAN}DeepSeek${NC}    → https://platform.deepseek.com"
    echo -e "  ${CYAN}Kimi${NC}        → https://platform.moonshot.cn"
    echo -e "  ${CYAN}智谱${NC}        → https://open.bigmodel.cn"
    echo -e "  ${CYAN}通义千问${NC}    → https://dashscope.console.aliyun.com"
    echo ""
    
    if prompt_yes_no "是否查看详细模型提供商列表? (y/N)" "n"; then
        show_model_providers
    fi
    
    # API 类型
    echo ""
    echo -e "${BOLD}请选择 API 类型:${NC}"
    echo -e "  ${YELLOW}openai-responses${NC}     - OpenAI 兼容 API (GPT, DeepSeek, Kimi, GLM, Qwen 等)"
    echo -e "  ${YELLOW}anthropic-messages${NC}  - Anthropic 兼容 API (Claude)"
    echo ""
    
    local api_type_display
    api_type_display=$(prompt_choice "请选择 API 类型" "openai-responses (推荐，兼容大多数模型)" "anthropic-messages (Claude)")
    MODEL_API_TYPE=$(echo "$api_type_display" | cut -d' ' -f1)
    
    # Base URL
    echo ""
    echo -e "${BOLD}请输入 API 地址 (Base URL):${NC}"
    
    local default_url
    case "$MODEL_API_TYPE" in
        "openai-responses") 
            default_url="https://api.openai.com/v1"
            echo ""
            echo -e "常用地址:"
            echo -e "  ${CYAN}OpenAI:${NC}     https://api.openai.com/v1"
            echo -e "  ${CYAN}DeepSeek:${NC}   https://api.deepseek.com/v1"
            echo -e "  ${CYAN}Kimi:${NC}       https://api.moonshot.cn/v1"
            echo -e "  ${CYAN}智谱:${NC}       https://open.bigmodel.cn/api/paas/v4"
            echo -e "  ${CYAN}通义千问:${NC}   https://dashscope.aliyuncs.com/compatible-mode/v1"
            echo -e "  ${CYAN}Ollama:${NC}     http://127.0.0.1:11434/v1"
            ;;
        "anthropic-messages") 
            default_url="https://api.anthropic.com"
            ;;
        *) default_url="https://api.example.com/v1" ;;
    esac
    
    MODEL_BASE_URL=$(prompt_input "API 地址" "$default_url")
    
    # API Key
    echo ""
    echo -e "${BOLD}请输入 API Key:${NC}"
    echo -e "${YELLOW}提示: API Key 通常以 sk- 开头，从模型提供商网站获取${NC}"
    echo ""
    
    MODEL_API_KEY=$(prompt_input "API Key" "")
    while [[ -z "$MODEL_API_KEY" ]]; then
        ui_error "API Key 不能为空！"
        echo -e "${YELLOW}请访问模型提供商网站获取 API Key${NC}"
        MODEL_API_KEY=$(prompt_input "API Key" "")
    done
    
    # Model ID
    echo ""
    echo -e "${BOLD}请输入模型 ID:${NC}"
    echo ""
    echo -e "常用模型 ID:"
    echo -e "  ${CYAN}gpt-4o${NC}          - OpenAI GPT-4o"
    echo -e "  ${CYAN}gpt-4-turbo${NC}     - OpenAI GPT-4 Turbo"
    echo -e "  ${CYAN}deepseek-chat${NC}   - DeepSeek V3"
    echo -e "  ${CYAN}moonshot-v1-8k${NC}  - Kimi V1"
    echo -e "  ${CYAN}glm-4${NC}           - 智谱 GLM-4"
    echo -e "  ${CYAN}qwen-turbo${NC}      - 通义千问"
    echo -e "  ${CYAN}claude-sonnet-4-5${NC} - Claude Sonnet"
    echo ""
    
    MODEL_ID=$(prompt_input "模型 ID" "gpt-4o")
    
    # 高级选项
    echo ""
    if prompt_yes_no "是否配置高级选项? (上下文窗口、最大输出) (y/N)" "n"; then
        MODEL_CONTEXT=$(prompt_input "上下文窗口大小 (tokens)" "128000")
        MODEL_MAX_TOKENS=$(prompt_input "最大输出 tokens" "8192")
    else
        MODEL_CONTEXT="128000"
        MODEL_MAX_TOKENS="8192"
    fi
    
    ui_info "模型配置完成！"
}

# ============================================
# Telegram 配置
# ============================================
configure_telegram() {
    echo ""
    echo -e "${BOLD}${MAGENTA}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}${MAGENTA}  📱 Telegram 机器人配置${NC}"
    echo -e "${BOLD}${MAGENTA}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${BOLD}Telegram 是什么?${NC}"
    echo "  Telegram 是一款流行的即时通讯应用，您可以在 Telegram 中与 AI 助手对话。"
    echo ""
    echo -e "${BOLD}如何获取 Telegram Bot Token?${NC}"
    echo ""
    echo -e "  ${YELLOW}步骤 1:${NC} 在 Telegram 中搜索 ${CYAN}@BotFather${NC}"
    echo -e "  ${YELLOW}步骤 2:${NC} 发送 ${CYAN}/newbot${NC} 命令"
    echo -e "  ${YELLOW}步骤 3:${NC} 按提示设置机器人名称"
    echo -e "  ${YELLOW}步骤 4:${NC} 复制返回的 Token (格式: 1234567890:ABCdefGHI...)"
    echo ""
    echo -e "  ${CYAN}详细教程:${NC} https://core.telegram.org/bots/tutorial"
    echo ""
    
    local bot_token
    bot_token=$(prompt_input "请输入 Telegram Bot Token (留空跳过)")
    
    if [[ -n "$bot_token" ]]; then
        TELEGRAM_CONFIG="telegram: {
      enabled: true,
      botToken: \"${bot_token}\",
      dmPolicy: \"pairing\",
      groupPolicy: \"open\"
    }"
        ui_info "Telegram 配置完成！"
        echo ""
        echo -e "${YELLOW}提示: 首次使用需要在 Telegram 中向机器人发送消息，然后运行:${NC}"
        echo -e "  ${CYAN}openclaw pairing list${NC}           # 查看配对请求"
        echo -e "  ${CYAN}openclaw pairing approve telegram <代码>${NC}  # 批准配对"
        return 0
    fi
    return 1
}

# ============================================
# Discord 配置
# ============================================
configure_discord() {
    echo ""
    echo -e "${BOLD}${MAGENTA}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}${MAGENTA}  🎮 Discord 机器人配置${NC}"
    echo -e "${BOLD}${MAGENTA}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${BOLD}Discord 是什么?${NC}"
    echo "  Discord 是一款流行的社群聊天应用，特别受游戏玩家和开发者欢迎。"
    echo ""
    echo -e "${BOLD}如何创建 Discord 机器人?${NC}"
    echo ""
    echo -e "  ${YELLOW}步骤 1:${NC} 访问 ${CYAN}https://discord.com/developers/applications${NC}"
    echo -e "  ${YELLOW}步骤 2:${NC} 点击 ${CYAN}New Application${NC} 创建应用"
    echo -e "  ${YELLOW}步骤 3:${NC} 左侧菜单选择 ${CYAN}Bot${NC}，点击 ${CYAN}Add Bot${NC}"
    echo -e "  ${YELLOW}步骤 4:${NC} 启用以下 Intents:"
    echo -e "           • ${CYAN}Message Content Intent${NC} (必需)"
    echo -e "           • ${CYAN}Server Members Intent${NC} (推荐)"
    echo -e "  ${YELLOW}步骤 5:${NC} 点击 ${CYAN}Reset Token${NC} 获取 Token"
    echo -e "  ${YELLOW}步骤 6:${NC} 左侧选择 ${CYAN}OAuth2${NC}，勾选 ${CYAN}bot${NC} 和 ${CYAN}applications.commands${NC}"
    echo -e "  ${YELLOW}步骤 7:${NC} 复制邀请链接，将机器人添加到服务器"
    echo ""
    
    local bot_token
    bot_token=$(prompt_input "请输入 Discord Bot Token (留空跳过)")
    
    if [[ -n "$bot_token" ]]; then
        echo ""
        echo -e "${CYAN}请输入 Discord 服务器 ID (可选):${NC}"
        echo -e "${YELLOW}获取方法: Discord 设置 → 高级 → 开发者模式 (开启)${NC}"
        echo -e "${YELLOW}然后右键点击服务器 → 复制服务器 ID${NC}"
        
        local server_id
        server_id=$(prompt_input "服务器 ID (留空跳过)")
        
        if [[ -n "$server_id" ]]; then
            DISCORD_CONFIG="discord: {
      enabled: true,
      token: \"${bot_token}\",
      dmPolicy: \"pairing\",
      guilds: {
        \"${server_id}\": {
          requireMention: false
        }
      }
    }"
        else
            DISCORD_CONFIG="discord: {
      enabled: true,
      token: \"${bot_token}\",
      dmPolicy: \"pairing\"
    }"
        fi
        
        ui_info "Discord 配置完成！"
        return 0
    fi
    return 1
}

# ============================================
# 飞书/Lark 配置
# ============================================
configure_feishu() {
    echo ""
    echo -e "${BOLD}${MAGENTA}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}${MAGENTA}  🪽 飞书 / Lark 机器人配置${NC}"
    echo -e "${BOLD}${MAGENTA}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${BOLD}飞书是什么?${NC}"
    echo "  飞书是字节跳动推出的企业协作平台，在国内和国际分别叫飞书和 Lark。"
    echo ""
    echo -e "${BOLD}如何创建飞书机器人?${NC}"
    echo ""
    echo -e "  ${YELLOW}步骤 1:${NC} 访问 ${CYAN}https://open.feishu.cn/app${NC} (国际版: https://open.larksuite.com/app)"
    echo -e "  ${YELLOW}步骤 2:${NC} 点击 ${CYAN}创建企业自建应用${NC}"
    echo -e "  ${YELLOW}步骤 3:${NC} 在 ${CYAN}凭证与基础信息${NC} 页面获取 App ID 和 App Secret"
    echo -e "  ${YELLOW}步骤 4:${NC} 在 ${CYAN}权限管理${NC} 中添加权限:"
    echo -e "           • ${CYAN}im:message${NC} (获取与发送消息)"
    echo -e "           • ${CYAN}im:message:send_as_bot${NC} (以应用身份发消息)"
    echo -e "  ${YELLOW}步骤 5:${NC} 在 ${CYAN}应用功能 → 机器人${NC} 中启用机器人"
    echo -e "  ${YELLOW}步骤 6:${NC} 在 ${CYAN}事件订阅${NC} 中:"
    echo -e "           • 选择 ${CYAN}使用长连接接收事件${NC}"
    echo -e "           • 添加事件: ${CYAN}im.message.receive_v1${NC}"
    echo -e "  ${YELLOW}步骤 7:${NC} 创建版本并提交发布"
    echo ""
    
    local app_id
    app_id=$(prompt_input "请输入飞书 App ID (格式: cli_xxx，留空跳过)")
    
    if [[ -n "$app_id" ]]; then
        local app_secret
        app_secret=$(prompt_input "请输入飞书 App Secret")
        
        if [[ -n "$app_secret" ]]; then
            local domain
            domain=$(prompt_choice "请选择域名" "feishu (国内飞书)" "lark (国际版)")
            domain=$(echo "$domain" | cut -d' ' -f1)
            
            FEISHU_CONFIG="feishu: {
      enabled: true,
      domain: \"${domain}\",
      accounts: {
        \"default\": {
          appId: \"${app_id}\",
          appSecret: \"${app_secret}\",
          domain: \"${domain}\"
        }
      },
      dmPolicy: \"pairing\",
      groupPolicy: \"open\"
    }"
            
            echo ""
            echo -e "${CYAN}正在安装飞书插件...${NC}"
            npm install -g @max1874/feishu --silent 2>/dev/null || true
            
            ui_info "飞书配置完成！"
            echo ""
            echo -e "${YELLOW}提示: 确保应用已发布并通过审核，机器人才能正常工作${NC}"
            return 0
        fi
    fi
    return 1
}

# ============================================
# 渠道配置
# ============================================
configure_channels() {
    ui_step "第 2 步：配置聊天渠道 (可选)"
    
    echo -e "${BOLD}您可以让 OpenClaw 在多个聊天平台工作:${NC}"
    echo ""
    echo -e "  ${YELLOW}📱 Telegram${NC}  - 流行的即时通讯应用"
    echo -e "  ${YELLOW}🎮 Discord${NC}   - 游戏玩家和开发者社区"
    echo -e "  ${YELLOW}🪽 飞书/Lark${NC}  - 企业协作平台"
    echo ""
    echo -e "${CYAN}提示: 您可以稍后通过编辑配置文件添加更多渠道${NC}"
    echo ""
    
    if prompt_yes_no "是否配置 Telegram? (y/N)" "n"; then
        configure_telegram
    fi
    
    if prompt_yes_no "是否配置 Discord? (y/N)" "n"; then
        configure_discord
    fi
    
    if prompt_yes_no "是否配置飞书/Lark? (y/N)" "n"; then
        configure_feishu
    fi
}

# ============================================
# 生成完整配置
# ============================================
generate_full_config() {
    local channels_content=""
    
    if [[ -n "$TELEGRAM_CONFIG" ]]; then
        channels_content="$TELEGRAM_CONFIG"
    fi
    
    if [[ -n "$DISCORD_CONFIG" ]]; then
        if [[ -n "$channels_content" ]]; then
            channels_content="$channels_content,
    "
        fi
        channels_content="$channels_content$DISCORD_CONFIG"
    fi
    
    if [[ -n "$FEISHU_CONFIG" ]]; then
        if [[ -n "$channels_content" ]]; then
            channels_content="$channels_content,
    "
        fi
        channels_content="$channels_content$FEISHU_CONFIG"
    fi
    
    if [[ -z "$channels_content" ]]; then
        channels_content="{}"
    fi
    
    cat <<EOF
{
  agent: {
    workspace: "~/.openclaw/workspace",
    model: { primary: "custom/${MODEL_ID}" }
  },
  models: {
    mode: "merge",
    providers: {
      "custom": {
        baseUrl: "${MODEL_BASE_URL}",
        apiKey: "${MODEL_API_KEY}",
        api: "${MODEL_API_TYPE}",
        models: [
          {
            id: "${MODEL_ID}",
            name: "${MODEL_ID}",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: ${MODEL_CONTEXT},
            maxTokens: ${MODEL_MAX_TOKENS}
          }
        ]
      }
    }
  },
  channels: {
    ${channels_content}
  },
  session: {
    dmScope: "per-channel-peer"
  }
}
EOF
}

save_config() {
    # 创建配置目录
    mkdir -p "$CONFIG_DIR"
    mkdir -p "$CONFIG_DIR/workspace"
    
    # 生成并保存配置
    generate_full_config > "$CONFIG_FILE"
    
    ui_info "配置文件已保存到: $CONFIG_FILE"
}

# ============================================
# 启动 Gateway
# ============================================
start_gateway() {
    ui_step "第 3 步：启动 OpenClaw Gateway"
    
    echo -e "${BOLD}正在启动 OpenClaw 服务...${NC}"
    echo ""
    
    # 安装守护进程
    echo -e "${CYAN}正在配置 Gateway 守护进程...${NC}"
    openclaw onboard --install-daemon 2>/dev/null || true
    
    # 启动 Gateway
    echo -e "${CYAN}正在启动 Gateway...${NC}"
    openclaw gateway start 2>/dev/null || openclaw gateway &
    
    sleep 3
    
    # 显示完成信息
    echo ""
    echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${GREEN}║                                                          ║${NC}"
    echo -e "${BOLD}${GREEN}║   🎉 OpenClaw 已成功安装并启动！                         ║${NC}"
    echo -e "${BOLD}${GREEN}║                                                          ║${NC}"
    echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    echo -e "${BOLD}${CYAN}📋 访问信息:${NC}"
    echo ""
    echo -e "  ${YELLOW}Web 界面:${NC}   http://127.0.0.1:18789"
    echo -e "  ${YELLOW}配置文件:${NC}   $CONFIG_FILE"
    echo -e "  ${YELLOW}工作目录:${NC}   $CONFIG_DIR/workspace"
    echo ""
    
    echo -e "${BOLD}${CYAN}🛠️ 常用命令:${NC}"
    echo ""
    echo -e "  ${CYAN}openclaw agent --message '你好'${NC}"
    echo -e "      → 在命令行与 AI 助手对话"
    echo ""
    echo -e "  ${CYAN}openclaw gateway status${NC}"
    echo -e "      → 查看服务状态"
    echo ""
    echo -e "  ${CYAN}openclaw gateway stop${NC}"
    echo -e "      → 停止服务"
    echo ""
    echo -e "  ${CYAN}openclaw gateway start${NC}"
    echo -e "      → 启动服务"
    echo ""
    echo -e "  ${CYAN}openclaw dashboard${NC}"
    echo -e "      → 打开 Web 管理界面"
    echo ""
    
    if [[ -n "$TELEGRAM_CONFIG" || -n "$DISCORD_CONFIG" || -n "$FEISHU_CONFIG" ]]; then
        echo -e "${BOLD}${CYAN}📱 渠道管理:${NC}"
        echo ""
        echo -e "  ${CYAN}openclaw channels status${NC}"
        echo -e "      → 查看所有渠道状态"
        echo ""
        echo -e "  ${CYAN}openclaw pairing list${NC}"
        echo -e "      → 查看配对请求"
        echo ""
        echo -e "  ${CYAN}openclaw pairing approve <渠道> <代码>${NC}"
        echo -e "      → 批准配对 (首次使用需要配对验证)"
        echo ""
        echo -e "${YELLOW}💡 提示: 首次使用时，向机器人发送消息后会收到配对码，${NC}"
        echo -e "${YELLOW}   使用上面的命令批准配对即可开始对话。${NC}"
        echo ""
    fi
    
    echo -e "${BOLD}${CYAN}📚 更多帮助:${NC}"
    echo ""
    echo -e "  ${CYAN}官方文档:${NC}   https://docs.openclaw.ai"
    echo -e "  ${CYAN}问题反馈:${NC}   https://github.com/openclaw/openclaw/issues"
    echo ""
}

main() {
    print_banner
    
    # 检测操作系统
    detect_os
    
    case "$OS" in
        "macos") ui_info "检测到系统: macOS" ;;
        "linux") ui_info "检测到系统: Linux" ;;
        *)
            ui_error "不支持的操作系统: $(uname -s)"
            echo "此安装器支持 macOS 和 Linux (包括 WSL)。"
            echo "Windows 用户请使用 PowerShell 安装器:"
            echo "  iwr -useb https://openclaw.ai/install.ps1 | iex"
            exit 1
            ;;
    esac
    
    # 步骤 0: Node.js
    ui_step "第 0 步：检查环境"
    
    if ! check_node; then
        echo ""
        echo -e "${YELLOW}需要安装 Node.js 22 或更高版本${NC}"
        
        if prompt_yes_no "是否自动安装 Node.js? (Y/n)" "y"; then
            if ! install_node; then
                exit 1
            fi
            
            # 验证安装
            if ! check_node; then
                ui_error "Node.js 安装失败，请重启终端后重试"
                echo "或手动安装: https://nodejs.org"
                exit 1
            fi
        else
            echo "请手动安装 Node.js 22+ 后重新运行此脚本"
            echo "  访问: https://nodejs.org"
            exit 1
        fi
    fi
    
    # 检查 OpenClaw
    if ! check_openclaw; then
        echo ""
        if prompt_yes_no "是否安装 OpenClaw? (Y/n)" "y"; then
            if ! install_openclaw; then
                exit 1
            fi
        else
            echo "请手动安装: npm install -g openclaw@latest"
            exit 1
        fi
    fi
    
    # 检查现有配置
    if [[ -f "$CONFIG_FILE" ]]; then
        echo ""
        ui_warn "检测到已有配置文件: $CONFIG_FILE"
        
        if prompt_yes_no "是否重新配置? (y/N)" "n"; then
            # 继续配置流程
            :
        else
            ui_info "跳过配置，直接启动..."
            start_gateway
            exit 0
        fi
    fi
    
    # 配置流程
    configure_model
    configure_channels
    save_config
    
    # 启动
    start_gateway
}

main "$@"

