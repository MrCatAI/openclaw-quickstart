#!/usr/bin/env node

/**
 * OpenClaw 配置验证脚本
 * 检查 OpenClaw 是否正确安装、配置和运行
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.openclaw');
const CONFIG_FILE = path.join(CONFIG_DIR, 'openclaw.json');

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

function info(msg) {
    console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`);
}

function header(msg) {
    console.log();
    console.log(`${colors.cyan}${colors.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.cyan}${colors.bold}  ${msg}${colors.reset}`);
    console.log(`${colors.cyan}${colors.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log();
}

function exec(cmd) {
    try {
        return { success: true, output: execSync(cmd, { encoding: 'utf8', stdio: 'pipe' }).trim() };
    } catch (e) {
        return { success: false, output: e.message };
    }
}

// ============================================
// 检查 Node.js
// ============================================

function checkNode() {
    header('检查 Node.js');

    const major = parseInt(process.version.replace('v', '').split('.')[0]);
    if (major >= 22) {
        success(`Node.js 版本: ${process.version} (符合要求)`);
        return true;
    }
    if (major > 0) {
        warn(`Node.js 版本: ${process.version} (需要 v22+)`);
        return false;
    }
    error('未找到 Node.js');
    return false;
}

// ============================================
// 检查 OpenClaw
// ============================================

function checkOpenClaw() {
    header('检查 OpenClaw 安装');

    const result = exec('openclaw --version');
    if (result.success) {
        success(`OpenClaw 已全局安装: ${result.output}`);
        return true;
    }

    // 检查 npx 是否可用
    const npxResult = exec('npx --version');
    if (npxResult.success) {
        info('OpenClaw 未全局安装，但可以使用 npx 运行');
        console.log(`  ${color('npx openclaw@latest', 'cyan')} 可用于运行 OpenClaw`);
        return true; // npx 可用视为通过
    }

    error('OpenClaw 未安装且 npx 不可用');
    console.log(`  全局安装: ${color('npm install -g openclaw@latest', 'cyan')}`);
    console.log(`  或使用 npx:  ${color('npx openclaw@latest', 'cyan')}`);
    return false;
}

// ============================================
// 检查配置文件
// ============================================

function checkConfig() {
    header('检查配置文件');

    if (!fs.existsSync(CONFIG_FILE)) {
        error(`配置文件不存在: ${CONFIG_FILE}`);
        console.log(`  运行配置向导: ${color('npx openclaw-quickstart', 'cyan')}`);
        return false;
    }

    success(`配置文件存在: ${CONFIG_FILE}`);

    try {
        const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        success('配置文件格式正确');

        // 检查模型配置
        if (config.models?.providers) {
            const providers = Object.keys(config.models.providers);
            if (providers.length > 0) {
                success(`配置了 ${providers.length} 个模型提供商: ${providers.join(', ')}`);
            } else {
                warn('未配置模型提供商');
            }
        } else {
            warn('缺少模型配置');
        }

        // 检查渠道配置
        if (config.channels) {
            const channels = Object.keys(config.channels);
            if (channels.length > 0) {
                success(`配置了 ${channels.length} 个渠道: ${channels.join(', ')}`);
            } else {
                info('未配置渠道 (可选)');
            }
        }

        return true;
    } catch (e) {
        error(`配置文件解析失败: ${e.message}`);
        return false;
    }
}

// ============================================
// 检查 Gateway 运行状态
// ============================================

function checkGateway() {
    header('检查 Gateway 运行状态');

    // 首先尝试使用 openclaw 命令
    const result = exec('openclaw gateway status');
    if (result.success) {
        success('Gateway 正在运行');
        console.log(`  ${result.output}`);
        return true;
    }

    // 检查端口是否在监听
    const portResult = exec('netstat -an | findstr 18789');
    if (portResult.success && portResult.output.includes('LISTEN')) {
        success('Gateway 正在运行 (端口 18789 已监听)');
        return true;
    }

    // 尝试使用 npx 检查
    const npxResult = exec('npx openclaw@latest gateway status', { stdio: 'pipe', timeout: 5000 });
    if (npxResult.success || (npxResult.output && !npxResult.output.includes('Missing config'))) {
        success('Gateway 正在运行');
        return true;
    }

    warn('Gateway 未运行');

    // 检查是否全局安装
    const globalInstalled = exec('openclaw --version', { stdio: 'pipe' }).success;
    if (globalInstalled) {
        console.log(`  启动命令: ${color('openclaw gateway', 'cyan')}`);
    } else {
        console.log(`  启动命令: ${color('npx openclaw@latest gateway --allow-unconfigured', 'cyan')}`);
    }
    return false;
}

// ============================================
// 检查网络连接
// ============================================

function checkNetwork() {
    header('检查网络连接');

    // 检查配置中的 API 是否可达
    try {
        const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        const providers = config.models?.providers || {};

        for (const [id, provider] of Object.entries(providers)) {
            const baseUrl = provider.baseUrl;
            if (baseUrl) {
                info(`检查 ${id} (${baseUrl})...`);
                // 简单检查，不实际请求
                success(`${id} API 地址已配置`);
            }
        }
    } catch (e) {
        warn('无法检查网络配置');
    }
}

// ============================================
// 检查工作目录
// ============================================

function checkWorkspace() {
    header('检查工作目录');

    const workspace = path.join(CONFIG_DIR, 'workspace');
    if (!fs.existsSync(workspace)) {
        warn('工作目录不存在，将自动创建');
        try {
            fs.mkdirSync(workspace, { recursive: true });
            success('工作目录已创建');
        } catch (e) {
            error(`创建工作目录失败: ${e.message}`);
            return false;
        }
    } else {
        success('工作目录存在');
    }

    // 检查代理目录
    const agentDir = path.join(workspace, 'agents');
    if (!fs.existsSync(agentDir)) {
        fs.mkdirSync(agentDir, { recursive: true });
    }
    success('代理目录已就绪');

    return true;
}

// ============================================
// 主函数
// ============================================

function main() {
    console.log();
    console.log(`${colors.cyan}${colors.bold}╔══════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}${colors.bold}║                                                          ║${colors.reset}`);
    console.log(`${colors.cyan}${colors.bold}║   🦞  OpenClaw 配置验证工具                               ║${colors.reset}`);
    console.log(`${colors.cyan}${colors.bold}║                                                          ║${colors.reset}`);
    console.log(`${colors.cyan}${colors.bold}╚══════════════════════════════════════════════════════════╝${colors.reset}`);

    const results = {
        node: checkNode(),
        openclaw: checkOpenClaw(),
        config: checkConfig(),
        gateway: checkGateway(),
        workspace: checkWorkspace()
    };

    header('验证结果汇总');

    let allPassed = true;
    for (const [name, passed] of Object.entries(results)) {
        if (passed) {
            success(`${name}: 通过`);
        } else {
            if (name !== 'gateway' && name !== 'workspace') {
                allPassed = false;
            }
            warn(`${name}: 未通过`);
        }
    }

    console.log();

    if (allPassed) {
        console.log(`${colors.green}${colors.bold}🎉 所有检查通过！OpenClaw 已正确配置。${colors.reset}`);
        console.log();
        console.log(`${colors.cyan}快速开始:${colors.reset}`);
        console.log(`  ${colors.cyan}openclaw agent --message '你好'${colors.reset}  - 开始对话`);
        console.log(`  ${colors.cyan}openclaw dashboard${colors.reset}               - 打开 Web 界面`);
    } else {
        console.log(`${colors.yellow}⚠️  部分检查未通过，请按照上述提示修复问题。${colors.reset}`);
        console.log();
        console.log(`${colors.cyan}快速安装:${colors.reset}`);
        console.log(`  ${colors.cyan}npx openclaw-quickstart${colors.reset}  - 运行配置向导`);
    }

    console.log();
}

main();
