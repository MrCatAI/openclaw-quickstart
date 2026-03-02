#!/usr/bin/env node

/**
 * OpenClaw Quick Install - Unified Cross-Platform Installer
 * 
 * 用法:
 *   npx openclaw-quickstart
 *   npx openclaw-quickstart --web
 *   npx openclaw-quickstart --cli
 * 
 * 此脚本将:
 *   1. 检查并安装 Node.js 22+ (如果需要，提供指导)
 *   2. 安装 OpenClaw
 *   3. 启动 Web 配置向导 或 CLI 配置向导
 *   4. 配置完成后启动 OpenClaw Gateway 服务
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// 颜色
const colors = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    magenta: '\x1b[35m',
};

const CONFIG_DIR = path.join(os.homedir(), '.openclaw');
const CONFIG_FILE = path.join(CONFIG_DIR, 'openclaw.json');

function color(text, c) {
    return `${colors[c]}${text}${colors.reset}`;
}

function success(msg) {
    console.log(`${colors.green}✓${colors.reset} ${msg}`);
}

function warn(msg) {
    console.log(`${colors.yellow}!${colors.reset} ${msg}`);
}

function error(msg) {
    console.log(`${colors.red}✗${colors.reset} ${msg}`);
}

function banner() {
    console.log();
    console.log(`${colors.cyan}${colors.bold}╔══════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}${colors.bold}║                                                          ║${colors.reset}`);
    console.log(`${colors.cyan}${colors.bold}║   🦞  OpenClaw Quick Install                             ║${colors.reset}`);
    console.log(`${colors.cyan}${colors.bold}║                                                          ║${colors.reset}`);
    console.log(`${colors.cyan}${colors.bold}║   一键安装并配置您的 AI 助手                              ║${colors.reset}`);
    console.log(`${colors.cyan}${colors.bold}║                                                          ║${colors.reset}`);
    console.log(`${colors.cyan}${colors.bold}╚══════════════════════════════════════════════════════════╝${colors.reset}`);
    console.log();
}

// 检查 Node.js 版本
function checkNode() {
    const version = process.version.replace('v', '');
    const major = parseInt(version.split('.')[0]);
    
    if (major >= 22) {
        success(`Node.js ${process.version} 已就绪`);
        return true;
    }
    
    warn(`Node.js ${process.version} 版本过低，需要 v22+`);
    
    const platform = process.platform;
    console.log();
    console.log(`${colors.yellow}请安装 Node.js 22+:${colors.reset}`);
    console.log();
    
    if (platform === 'darwin') {
        console.log(`  macOS (Homebrew):`);
        console.log(`    ${colors.cyan}brew install node@22 && brew link node@22 --overwrite --force${colors.reset}`);
    } else if (platform === 'linux') {
        console.log(`  Ubuntu/Debian:`);
        console.log(`    ${colors.cyan}curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -${colors.reset}`);
        console.log(`    ${colors.cyan}sudo apt-get install -y nodejs${colors.reset}`);
        console.log();
        console.log(`  CentOS/RHEL/Fedora:`);
        console.log(`    ${colors.cyan}curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -${colors.reset}`);
        console.log(`    ${colors.cyan}sudo yum install -y nodejs${colors.reset}`);
    } else if (platform === 'win32') {
        console.log(`  Windows (winget):`);
        console.log(`    ${colors.cyan}winget install OpenJS.NodeJS.LTS${colors.reset}`);
        console.log();
        console.log(`  Windows (Chocolatey):`);
        console.log(`    ${colors.cyan}choco install nodejs-lts${colors.reset}`);
    }
    
    console.log();
    console.log(`  官网下载: ${colors.cyan}https://nodejs.org/${colors.reset}`);
    console.log();
    
    return false;
}

// 检查 OpenClaw 是否已安装
function checkOpenClaw() {
    try {
        const result = execSync('openclaw --version', { encoding: 'utf8', stdio: 'pipe' });
        success(`OpenClaw 已安装: ${result.trim()}`);
        return true;
    } catch (e) {
        return false;
    }
}

// 安装 OpenClaw
function installOpenClaw() {
    console.log();
    console.log(`${colors.cyan}正在安装 OpenClaw...${colors.reset}`);
    console.log('这可能需要几分钟时间，请耐心等待...');
    console.log();
    
    try {
        execSync('npm install -g openclaw@latest --no-fund --no-audit', {
            encoding: 'utf8',
            stdio: 'inherit'
        });
        success('OpenClaw 安装成功！');
        return true;
    } catch (e) {
        error('OpenClaw 安装失败');
        console.log(`${colors.yellow}请尝试手动安装: npm install -g openclaw@latest${colors.reset}`);
        return false;
    }
}

// 启动 Web 配置服务
function startWebConfig() {
    console.log();
    console.log(`${colors.cyan}启动 Web 配置服务...${colors.reset}`);
    
    const webConfigPath = path.join(__dirname, '..', 'web-config.js');
    
    if (!fs.existsSync(webConfigPath)) {
        warn('web-config.js 不存在，尝试使用 CLI 配置...');
        return false;
    }
    
    // 在后台启动
    const child = spawn('node', [webConfigPath], {
        detached: true,
        stdio: 'inherit',
        shell: true
    });
    
    child.unref();
    return true;
}

// 启动 CLI 配置
function startCliConfig() {
    const cliPath = path.join(__dirname, 'cli.js');
    
    try {
        execSync(`node "${cliPath}"`, {
            encoding: 'utf8',
            stdio: 'inherit'
        });
        return true;
    } catch (e) {
        return false;
    }
}

// 启动 Gateway
function startGateway() {
    console.log();
    console.log(`${colors.cyan}启动 OpenClaw Gateway...${colors.reset}`);
    
    // 安装守护进程
    try {
        execSync('openclaw onboard --install-daemon', {
            encoding: 'utf8',
            stdio: 'pipe',
            timeout: 30000
        });
    } catch (e) {
        // 忽略错误
    }
    
    // 后台启动 Gateway
    const child = spawn('openclaw', ['gateway'], {
        detached: true,
        stdio: 'ignore',
        shell: true
    });
    child.unref();
    
    // 等待启动
    setTimeout(() => {
        showComplete();
    }, 2000);
}

// 显示完成信息
function showComplete() {
    console.log();
    console.log(`${colors.green}${colors.bold}╔══════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.green}${colors.bold}║                                                          ║${colors.reset}`);
    console.log(`${colors.green}${colors.bold}║   🎉 OpenClaw 安装并配置完成！                           ║${colors.reset}`);
    console.log(`${colors.green}${colors.bold}║                                                          ║${colors.reset}`);
    console.log(`${colors.green}${colors.bold}╚══════════════════════════════════════════════════════════╝${colors.reset}`);
    console.log();
    console.log(`${colors.bold}${colors.cyan}📋 访问信息:${colors.reset}`);
    console.log();
    console.log(`  ${colors.yellow}Web 界面:${colors.reset}   http://127.0.0.1:18789`);
    console.log(`  ${colors.yellow}配置文件:${colors.reset}   ${CONFIG_FILE}`);
    console.log();
    console.log(`${colors.bold}${colors.cyan}🛠️ 常用命令:${colors.reset}`);
    console.log();
    console.log(`  ${colors.cyan}openclaw agent --message '你好'${colors.reset}`);
    console.log(`      → 在命令行与 AI 助手对话`);
    console.log();
    console.log(`  ${colors.cyan}openclaw gateway status${colors.reset}`);
    console.log(`      → 查看服务状态`);
    console.log();
    console.log(`  ${colors.cyan}openclaw dashboard${colors.reset}`);
    console.log(`      → 打开 Web 管理界面`);
    console.log();
    console.log(`${colors.bold}${colors.cyan}📚 更多帮助:${colors.reset}`);
    console.log();
    console.log(`  ${colors.cyan}官方文档:${colors.reset}   https://docs.openclaw.ai`);
    console.log(`  ${colors.cyan}问题反馈:${colors.reset}   https://github.com/openclaw/openclaw/issues`);
    console.log();
}

// 主流程
async function main() {
    const args = process.argv.slice(2);
    const useWeb = args.includes('--web') || args.includes('-w');
    const useCli = args.includes('--cli') || args.includes('-c');
    const help = args.includes('--help') || args.includes('-h');
    
    if (help) {
        console.log();
        console.log(`${colors.bold}用法:${colors.reset}`);
        console.log(`  npx openclaw-quickstart          # 自动选择配置方式 (Web 或 CLI)`);
        console.log(`  npx openclaw-quickstart --web    # 使用 Web 配置向导`);
        console.log(`  npx opencl-quickstart --cli    # 使用 CLI 配置向导`);
        console.log();
        console.log(`${colors.bold}选项:${colors.reset}`);
        console.log(`  -w, --web     使用 Web 配置向导 (浏览器)`);
        console.log(`  -c, --cli     使用 CLI 配置向导 (命令行)`);
        console.log(`  -h, --help    显示帮助信息`);
        console.log();
        process.exit(0);
    }
    
    banner();
    
    success(`检测到系统: ${process.platform}`);
    
    // Step 1: 检查 Node.js
    if (!checkNode()) {
        process.exit(1);
    }
    
    // Step 2: 检查/安装 OpenClaw
    if (!checkOpenClaw()) {
        if (!installOpenClaw()) {
            process.exit(1);
        }
    }
    
    // Step 3: 启动配置
    console.log();
    console.log(`${colors.cyan}${colors.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.cyan}${colors.bold}  配置 OpenClaw${colors.reset}`);
    console.log(`${colors.cyan}${colors.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log();
    
    // 检查是否已有配置
    if (fs.existsSync(CONFIG_FILE)) {
        warn(`检测到已有配置文件: ${CONFIG_FILE}`);
        console.log();
        
        // 直接启动 Gateway
        startGateway();
        return;
    }
    
    // 选择配置方式
    if (useWeb) {
        startWebConfig();
    } else if (useCli) {
        startCliConfig();
    } else {
        // 默认使用 Web 配置 (更好的中文支持)
        startWebConfig();
    }
}

main().catch(e => {
    error(e.message);
    process.exit(1);
});
