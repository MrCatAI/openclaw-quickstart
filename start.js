#!/usr/bin/env node

/**
 * OpenClaw Gateway 启动脚本
 * 使用 npx 方式启动 Gateway
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.openclaw');
const DEFAULT_PORT = 18789;

// 颜色
const colors = {
    reset: '\x1b[0m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    bold: '\x1b[1m'
};

function success(msg) {
    console.log(`${colors.green}✓${colors.reset} ${msg}`);
}

function error(msg) {
    console.log(`${colors.red}✗${colors.reset} ${msg}`);
}

function info(msg) {
    console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`);
}

function printHeader() {
    console.log();
    console.log(`${colors.cyan}${colors.bold}╔══════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}${colors.bold}║                                                          ║${colors.reset}`);
    console.log(`${colors.cyan}${colors.bold}║   🦞  OpenClaw Gateway 启动器                             ║${colors.reset}`);
    console.log(`${colors.cyan}${colors.bold}║                                                          ║${colors.reset}`);
    console.log(`${colors.cyan}${colors.bold}╚══════════════════════════════════════════════════════════╝${colors.reset}`);
    console.log();
}

// 检查是否全局安装
function isGlobalInstalled() {
    try {
        execSync('openclaw --version', { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

// 检查端口是否被占用
function isPortInUse(port) {
    try {
        if (process.platform === 'win32') {
            const result = execSync(`netstat -an | findstr ${port}`, { encoding: 'utf8' });
            return result.includes('LISTENING');
        } else {
            const result = execSync(`lsof -i:${port} -t`, { stdio: 'ignore' });
            return true;
        }
    } catch {
        return false;
    }
}

// 启动 Gateway
function startGateway() {
    printHeader();

    // 检查配置
    const configFile = path.join(CONFIG_DIR, 'openclaw.json');
    try {
        const fs = require('fs');
        if (fs.existsSync(configFile)) {
            const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
            const providers = config.models?.providers ? Object.keys(config.models.providers) : [];
            if (providers.length > 0) {
                info(`配置文件: 已配置模型 - ${providers.join(', ')}`);
            } else {
                info(`配置文件: 已加载`);
            }
        } else {
            info(`配置文件: 不存在 (将使用默认配置)`);
        }
    } catch (e) {
        info(`配置文件检查: ${e.message}`);
    }

    // 检查端口
    if (isPortInUse(DEFAULT_PORT)) {
        info(`端口 ${DEFAULT_PORT} 已在监听，Gateway 可能已运行`);
        console.log();
        console.log(`${colors.cyan}Web 控制面板:${colors.reset} http://127.0.0.1:${DEFAULT_PORT}`);
        console.log();
        return;
    }

    const isGlobal = isGlobalInstalled();
    const cmd = isGlobal ? 'openclaw' : 'npx';
    const args = isGlobal
        ? ['gateway', '--allow-unconfigured']
        : ['openclaw@latest', 'gateway', '--allow-unconfigured'];

    info(`启动方式: ${isGlobal ? '全局安装' : 'npx'}`);
    info(`启动命令: ${cmd} ${args.join(' ')}`);
    console.log();
    console.log(`${colors.yellow}正在启动 Gateway...${colors.reset}`);

    // 使用 start 命令在后台启动
    if (process.platform === 'win32') {
        execSync(`start /B ${cmd} ${args.join(' ')} > nul 2>&1`, { stdio: 'ignore' });
    } else {
        const child = spawn(cmd, args, {
            detached: true,
            stdio: 'ignore',
            shell: true
        });
        child.unref();
    }

    // 等待启动
    console.log(`等待服务启动...`);
    let attempts = 0;
    const maxAttempts = 15;

    const interval = setInterval(() => {
        attempts++;
        if (isPortInUse(DEFAULT_PORT)) {
            clearInterval(interval);
            console.log();
            console.log(`${colors.green}${colors.bold}✓ Gateway 启动成功！${colors.reset}`);
            console.log();
            console.log(`${colors.cyan}${colors.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
            console.log();
            console.log(`${colors.bold}📋 访问信息:${colors.reset}`);
            console.log();
            console.log(`  ${colors.yellow}Web 控制面板:${colors.reset}  http://127.0.0.1:${DEFAULT_PORT}`);
            console.log(`  ${colors.yellow}配置文件:${colors.reset}      ${configFile}`);
            console.log(`  ${colors.yellow}工作目录:${colors.reset}      ${path.join(CONFIG_DIR, 'workspace')}`);
            console.log();
            console.log(`${colors.bold}🛠️ 管理命令:${colors.reset}`);
            console.log();
            const cmdPrefix = isGlobal ? 'openclaw' : 'npx openclaw@latest';
            console.log(`  ${colors.cyan}${cmdPrefix} gateway status${colors.reset}     - 查看状态`);
            console.log(`  ${colors.cyan}${cmdPrefix} gateway stop${colors.reset}       - 停止服务`);
            console.log(`  ${colors.cyan}${cmdPrefix} agent --message "你好"${colors.reset}  - 与 AI 对话`);
            console.log();
            console.log(`${colors.cyan}${colors.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
            console.log();
        } else if (attempts >= maxAttempts) {
            clearInterval(interval);
            console.log();
            error('Gateway 启动超时，请检查日志');
            console.log();
            console.log(`${colors.yellow}手动启动命令:${colors.reset}`);
            console.log(`  ${colors.cyan}${cmd} ${args.join(' ')}${colors.reset}`);
            console.log();
        }
    }, 2000);
}

startGateway();
