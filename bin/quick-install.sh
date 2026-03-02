#!/bin/bash

# ============================================================
# OpenClaw Quick Install - macOS/Linux One-Click Installer
#
# 用法:
#   curl -fsSL https://openclaw.ai/quick-install.sh | bash
#   或: ./quick-install.sh
#
# 此脚本将:
#   1. 检查并安装 Node.js 22+ (如果需要)
#   2. 安装 OpenClaw
#   3. 启动 Web 配置向导
#   4. 等待用户完成配置
#   5. 启动 OpenClaw Gateway 服务
# ============================================================

set -e

# 颜色定义
BOLD='\033[1m'
RED='\033[91m'
GREEN='\033[92m'
YELLOW='\033[93m'
CYAN='\033[96m'
NC='\033[0m'

# 配置
CONFIG_DIR="$HOME/.openclaw"
CONFIG_FILE="$CONFIG_DIR/openclaw.json"
WEB_CONFIG_PORT=18792

# 打印函数
print_banner() {
    echo ""
    echo -e "${CYAN}${BOLD}============================================================${NC}"
    echo -e "${CYAN}${BOLD}                                                          ${NC}"
    echo -e "${CYAN}${BOLD}   🦞 OpenClaw Quick Install - macOS/Linux                ${NC}"
    echo -e "${CYAN}${BOLD}                                                          ${NC}"
    echo -e "${CYAN}${BOLD}============================================================${NC}"
    echo ""
    echo -e "${YELLOW}此脚本将自动完成以下操作:${NC}"
    echo "  1. 检查并安装 Node.js 22+ (如果需要)"
    echo "  2. 安装 OpenClaw"
    echo "  3. 启动 Web 配置向导 (浏览器)"
    echo "  4. 配置完成后启动 OpenClaw 服务"
    echo ""
}

print_step() {
    echo ""
    echo -e "${CYAN}${BOLD}[$1] $2...${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}! $1${NC}"
}

# 检测操作系统
detect_os() {
    case "$(uname -s)" in
        Darwin*) echo "macos" ;;
        Linux*)  echo "linux" ;;
        *)       echo "unknown" ;;
    esac
}

OS=$(detect_os)

if [ "$OS" = "unknown" ]; then
    print_error "不支持的操作系统"
    exit 1
fi

print_banner

# Step 1: 检查 Node.js
print_step "1/4" "检查 Node.js 环境"

NODE_VERSION=""
NODE_MAJOR=0

if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | sed 's/v//')
    NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
fi

if [ "$NODE_MAJOR" -lt 22 ]; then
    print_warning "需要 Node.js 22+，当前版本: ${NODE_VERSION:-未安装}"
    echo ""
    
    if [ "$OS" = "macos" ]; then
        if command -v brew &> /dev/null; then
            print_warning "正在使用 Homebrew 安装 Node.js..."
            brew install node@22
            brew link node@22 --overwrite --force
        else
            print_error "未找到 Homebrew，请手动安装 Node.js"
            echo -e "${YELLOW}安装 Homebrew: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\"${NC}"
            echo -e "${YELLOW}或直接下载 Node.js: https://nodejs.org/${NC}"
            exit 1
        fi
    elif [ "$OS" = "linux" ]; then
        if command -v apt-get &> /dev/null; then
            print_warning "正在使用 apt 安装 Node.js..."
            curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
            sudo apt-get install -y nodejs
        elif command -v dnf &> /dev/null; then
            print_warning "正在使用 dnf 安装 Node.js..."
            curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
            sudo dnf install -y nodejs
        elif command -v yum &> /dev/null; then
            print_warning "正在使用 yum 安装 Node.js..."
            curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
            sudo yum install -y nodejs
        else
            print_error "未找到包管理器，请手动安装 Node.js"
            echo -e "${YELLOW}下载地址: https://nodejs.org/${NC}"
            exit 1
        fi
    fi
    
    # 重新检测
    NODE_VERSION=$(node -v | sed 's/v//')
    NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
fi

if [ "$NODE_MAJOR" -ge 22 ]; then
    print_success "Node.js v${NODE_VERSION} 已就绪"
else
    print_error "Node.js 安装失败"
    exit 1
fi

# Step 2: 安装 OpenClaw
print_step "2/4" "安装 OpenClaw"

if command -v openclaw &> /dev/null; then
    OPENCLAW_VERSION=$(openclaw --version 2>/dev/null || echo "unknown")
    print_success "OpenClaw 已安装: ${OPENCLAW_VERSION}"
else
    print_warning "正在安装 OpenClaw (可能需要几分钟)..."
    
    NPM_LOG=$(mktemp)
    
    if npm install -g openclaw@latest --no-fund --no-audit 2>&1 | tee "$NPM_LOG"; then
        print_success "OpenClaw 安装成功"
    else
        print_error "安装失败"
        echo -e "${YELLOW}请尝试手动安装: npm install -g openclaw@latest${NC}"
        rm -f "$NPM_LOG"
        exit 1
    fi
    
    rm -f "$NPM_LOG"
fi

# Step 3: 启动 Web 配置向导
print_step "3/4" "启动配置向导"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WEB_CONFIG_JS="$SCRIPT_DIR/../web-config.js"

if [ ! -f "$WEB_CONFIG_JS" ]; then
    # 如果本地没有，尝试使用 openclaw-quickstart
    if command -v npx &> /dev/null; then
        print_warning "启动 openclaw-quickstart..."
        npx openclaw-quickstart &
        WEB_PID=$!
    else
        print_error "找不到 web-config.js"
        exit 1
    fi
else
    print_warning "正在启动 Web 配置服务..."
    node "$WEB_CONFIG_JS" &
    WEB_PID=$!
fi

sleep 2

# 打开浏览器
print_warning "配置页面将自动在浏览器中打开"
sleep 1

if [ "$OS" = "macos" ]; then
    open "http://127.0.0.1:${WEB_CONFIG_PORT}"
elif [ "$OS" = "linux" ]; then
    if command -v xdg-open &> /dev/null; then
        xdg-open "http://127.0.0.1:${WEB_CONFIG_PORT}"
    elif command -v sensible-browser &> /dev/null; then
        sensible-browser "http://127.0.0.1:${WEB_CONFIG_PORT}"
    else
        print_warning "请手动打开浏览器访问: http://127.0.0.1:${WEB_CONFIG_PORT}"
    fi
fi

echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}  Web 配置向导已在浏览器中打开${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo -e "${YELLOW}请在浏览器中完成以下配置:${NC}"
echo "  1. 选择 AI 模型提供商"
echo "  2. 输入 API Key"
echo "  3. 选择聊天渠道 (可选)"
echo "  4. 点击 '保存并启动'"
echo ""
echo -e "${CYAN}等待配置完成...${NC}"

# 等待配置文件生成
WAIT_COUNT=0
MAX_WAIT=300

while [ ! -f "$CONFIG_FILE" ] && [ $WAIT_COUNT -lt $MAX_WAIT ]; do
    sleep 1
    WAIT_COUNT=$((WAIT_COUNT + 1))
done

if [ ! -f "$CONFIG_FILE" ]; then
    echo ""
    print_warning "等待超时，请按 Enter 继续..."
    read -r
fi

print_success "配置已完成"

# Step 4: 启动 OpenClaw 服务
print_step "4/4" "启动 OpenClaw 服务"

# 停止 web-config 服务
if [ -n "$WEB_PID" ]; then
    kill $WEB_PID 2>/dev/null || true
fi

# 也通过端口杀掉
if command -v lsof &> /dev/null; then
    lsof -ti:$WEB_CONFIG_PORT | xargs kill 2>/dev/null || true
fi

# 安装守护进程
print_warning "配置 Gateway 守护进程..."
openclaw onboard --install-daemon 2>/dev/null || true

# 启动 Gateway
print_warning "启动 Gateway..."
openclaw gateway &
GATEWAY_PID=$!

sleep 3

# 显示完成信息
echo ""
echo -e "${GREEN}${BOLD}============================================================${NC}"
echo -e "${GREEN}${BOLD}                                                          ${NC}"
echo -e "${GREEN}${BOLD}   🎉 OpenClaw 安装并配置完成！                           ${NC}"
echo -e "${GREEN}${BOLD}                                                          ${NC}"
echo -e "${GREEN}${BOLD}============================================================${NC}"
echo ""
echo -e "${CYAN}访问信息:${NC}"
echo -e "  Web 界面: ${YELLOW}http://127.0.0.1:18789${NC}"
echo -e "  配置文件: ${YELLOW}${CONFIG_FILE}${NC}"
echo ""
echo -e "${CYAN}常用命令:${NC}"
echo -e "  ${YELLOW}openclaw agent --message \"你好\"${NC}     - 与 AI 对话"
echo -e "  ${YELLOW}openclaw gateway status${NC}             - 查看服务状态"
echo -e "  ${YELLOW}openclaw gateway stop${NC}               - 停止服务"
echo -e "  ${YELLOW}openclaw dashboard${NC}                  - 打开管理界面"
echo ""
echo -e "${CYAN}渠道管理 (如已配置):${NC}"
echo -e "  ${YELLOW}openclaw pairing list${NC}               - 查看配对请求"
echo -e "  ${YELLOW}openclaw pairing approve telegram 123456${NC} - 批准配对"
echo ""
echo -e "${GREEN}OpenClaw 正在后台运行。按 Ctrl+C 可停止服务。${NC}"
echo ""

# 等待 Gateway 进程
wait $GATEWAY_PID 2>/dev/null || true
