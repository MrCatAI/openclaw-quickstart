#!/usr/bin/env node

/**
 * OpenClaw 快速安装器 - Node.js CLI
 * 用法: npx openclaw-quickstart
 */

const readline = require('readline');
const { execSync, spawn } = require('child_process');
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

// 配置存储
const config = {
    model: {},
    channels: {}
};

function color(text, c) {
    return `${colors[c]}${text}${colors.reset}`;
}

function print(msg) {
    console.log(msg);
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

function step(msg) {
    console.log();
    console.log(`${colors.cyan}${colors.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.cyan}${colors.bold}  ${msg}${colors.reset}`);
    console.log(`${colors.cyan}${colors.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log();
}

function banner() {
    console.log();
    console.log(`${colors.cyan}${colors.bold}╔══════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}${colors.bold}║                                                          ║${colors.reset}`);
    console.log(`${colors.cyan}${colors.bold}║   🦞  OpenClaw 快速安装器                                ║${colors.reset}`);
    console.log(`${colors.cyan}${colors.bold}║                                                          ║${colors.reset}`);
    console.log(`${colors.cyan}${colors.bold}║   一键安装并配置您的 AI 助手                              ║${colors.reset}`);
    console.log(`${colors.cyan}${colors.bold}║                                                          ║${colors.reset}`);
    console.log(`${colors.cyan}${colors.bold}╚══════════════════════════════════════════════════════════╝${colors.reset}`);
    console.log();
    console.log(`${colors.magenta}OpenClaw 是一个强大的 AI 个人助手，可以:${colors.reset}`);
    console.log(`${colors.magenta}  • 在 Telegram / Discord / 飞书 等平台与您对话${colors.reset}`);
    console.log(`${colors.magenta}  • 使用各种 AI 模型 (GPT-4o, Claude, DeepSeek, Kimi 等)${colors.reset}`);
    console.log(`${colors.magenta}  • 自动化处理各种任务${colors.reset}`);
    console.log();
    console.log(`${colors.yellow}本安装器将引导您完成:${colors.reset}`);
    console.log(`${colors.yellow}  1️⃣  安装 OpenClaw${colors.reset}`);
    console.log(`${colors.yellow}  2️⃣  配置 AI 模型${colors.reset}`);
    console.log(`${colors.yellow}  3️⃣  配置聊天渠道 (可选)${colors.reset}`);
    console.log(`${colors.yellow}  4️⃣  启动服务${colors.reset}`);
    console.log();
}

// 创建 readline 接口
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function prompt(question, defaultValue = '') {
    return new Promise((resolve) => {
        const defaultHint = defaultValue ? ` [${defaultValue}]` : '';
        rl.question(`${colors.cyan}${question}${defaultHint}: ${colors.reset}`, (answer) => {
            resolve(answer.trim() || defaultValue);
        });
    });
}

function promptChoice(question, options) {
    return new Promise((resolve) => {
        console.log(`${colors.cyan}${question}${colors.reset}`);
        options.forEach((opt, i) => {
            console.log(`  ${colors.yellow}${i + 1}${colors.reset}) ${opt}`);
        });
        rl.question(`${colors.cyan}请输入数字选择 [1]: ${colors.reset}`, (answer) => {
            const choice = parseInt(answer.trim()) || 1;
            resolve(options[Math.min(choice, options.length) - 1]);
        });
    });
}

function promptYesNo(question, defaultYes = false) {
    return new Promise((resolve) => {
        const defaultHint = defaultYes ? 'Y/n' : 'y/N';
        rl.question(`${colors.cyan}${question} [${defaultHint}]: ${colors.reset}`, (answer) => {
            const a = answer.trim().toLowerCase();
            if (!a) resolve(defaultYes);
            else resolve(a === 'y' || a === 'yes');
        });
    });
}

// 执行命令
function exec(cmd, silent = true) {
    try {
        const result = execSync(cmd, { 
            encoding: 'utf8', 
            stdio: silent ? 'pipe' : 'inherit',
            shell: true 
        });
        return { success: true, output: result };
    } catch (e) {
        return { success: false, output: e.message };
    }
}

// ============================================
// Node.js 检测和安装 (完全遵循 OpenClaw 官方逻辑)
// ============================================

function getNodeMajorVersion() {
    try {
        const version = process.version.replace('v', '');
        const major = parseInt(version.split('.')[0]);
        if (major >= 0) {
            return major;
        }
    } catch (e) {}
    return null;
}

function printActiveNodePaths() {
    try {
        const nodePath = process.execPath;
        const nodeVersion = process.version;
        success(`当前 Node.js: ${nodeVersion} (${nodePath})`);
        
        const npmResult = exec('npm -v');
        if (npmResult.success) {
            const npmPath = exec('which npm').output.trim();
            success(`当前 npm: ${npmResult.output.trim()} (${npmPath})`);
        }
    } catch (e) {}
}

function checkNode() {
    const major = getNodeMajorVersion();
    if (major !== null && major >= 22) {
        success(`检测到 Node.js ${process.version} ✓`);
        printActiveNodePaths();
        return true;
    }
    
    if (major !== null) {
        warn(`检测到 Node.js ${process.version}，需要 v22 或更高版本`);
    } else {
        warn('未检测到 Node.js');
    }
    return false;
}

function installNodeGuide() {
    console.log();
    console.log(`${colors.cyan}需要安装 Node.js 22 或更高版本${colors.reset}`);
    
    const platform = process.platform;
    
    if (platform === 'darwin') {
        console.log(`${colors.yellow}macOS 安装方法:${colors.reset}`);
        console.log();
        console.log(`  方法 1 (Homebrew):`);
        console.log(`    ${colors.cyan}brew install node@22${colors.reset}`);
        console.log(`    ${colors.cyan}brew link node@22 --overwrite --force${colors.reset}`);
        console.log();
        console.log(`  方法 2 (官网): https://nodejs.org`);
    } else if (platform === 'linux') {
        console.log(`${colors.yellow}Linux 安装方法:${colors.reset}`);
        console.log();
        console.log(`  Ubuntu/Debian:`);
        console.log(`    ${colors.cyan}curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -${colors.reset}`);
        console.log(`    ${colors.cyan}sudo apt-get install -y nodejs${colors.reset}`);
        console.log();
        console.log(`  CentOS/RHEL/Fedora:`);
        console.log(`    ${colors.cyan}curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -${colors.reset}`);
        console.log(`    ${colors.cyan}sudo yum install -y nodejs${colors.reset}`);
    } else if (platform === 'win32') {
        console.log(`${colors.yellow}Windows 安装方法:${colors.reset}`);
        console.log();
        console.log(`  方法 1 (winget):`);
        console.log(`    ${colors.cyan}winget install OpenJS.NodeJS.LTS${colors.reset}`);
        console.log();
        console.log(`  方法 2 (Chocolatey):`);
        console.log(`    ${colors.cyan}choco install nodejs-lts${colors.reset}`);
    }
    
    console.log();
    console.log(`  方法 3 (官网): ${colors.cyan}https://nodejs.org${colors.reset}`);
    console.log();
    console.log(`${colors.yellow}安装后请重新运行此脚本${colors.reset}`);
}

// ============================================
// OpenClaw 安装
// ============================================

function checkOpenClaw() {
    const result = exec('openclaw --version');
    if (result.success) {
        success(`OpenClaw 已安装: ${result.output.trim()}`);
        return true;
    }
    return false;
}

async function installOpenClaw() {
    console.log();
    console.log(`${colors.cyan}正在安装 OpenClaw...${colors.reset}`);
    console.log('这可能需要几分钟时间，请耐心等待...');
    
    // 清理可能的旧版子模块
    const homedir = require('os').homedir();
    const legacyDir = require('path').join(homedir, 'openclaw', 'Peekaboo');
    try {
        if (require('fs').existsSync(legacyDir)) {
            warn(`正在移除旧版子模块: ${legacyDir}`);
            require('fs').rmSync(legacyDir, { recursive: true, force: true });
        }
    } catch (e) {}
    
    // 设置 npm 静默模式
    const env = { ...process.env };
    env.NPM_CONFIG_LOGLEVEL = 'error';
    env.NPM_CONFIG_FUND = 'false';
    env.NPM_CONFIG_AUDIT = 'false';
    env.NPM_CONFIG_UPDATE_NOTIFIER = 'false';
    
    // 第一次安装尝试
    let result = exec('npm install -g openclaw@latest', false);
    
    if (result.success || checkOpenClaw()) {
        success('OpenClaw 安装成功！');
        return true;
    }
    
    // 检查错误类型并尝试修复
    const output = result.output || '';
    let attemptedFix = false;
    
    // 尝试1: 清理 NPM 冲突路径
    if (output.includes('ENOTEMPTY') || output.includes('EEXIST')) {
        warn('检测到 npm 残留目录或文件冲突，正在清理...');
        attemptedFix = true;
        
        // 尝试清理 npm 缓存
        exec('npm cache clean --force', true);
        
        // 重试安装
        result = exec('npm install -g openclaw@latest', false);
        if (result.success || checkOpenClaw()) {
            success('OpenClaw 安装成功！');
            return true;
        }
    }
    
    // 尝试2: 使用 --force 参数
    if (!result.success) {
        warn('尝试使用强制安装模式...');
        attemptedFix = true;
        result = exec('npm install -g openclaw@latest --force', false);
        if (result.success || checkOpenClaw()) {
            success('OpenClaw 安装成功！');
            return true;
        }
    }
    
    // 所有尝试都失败了
    error('OpenClaw 安装失败');
    
    if (attemptedFix) {
        warn('自动修复后仍然安装失败');
    }
    
    // 显示具体错误
    if (output.includes('spawn git') || output.includes('ENOENT') && output.includes('git')) {
        error('缺少 Git。请安装 Git:');
        console.log(`${colors.cyan}  https://git-scm.com/download${colors.reset}`);
    }
    if (output.includes('not found: make') || output.includes('cmake')) {
        warn('某些依赖可能需要构建工具 (make/cmake)');
    }
    
    console.log(`${colors.yellow}请尝试手动安装: npm install -g openclaw@latest${colors.reset}`);
    return false;
}

// ============================================
// 模型配置
// ============================================

function showModelProviders() {
    console.log();
    console.log(`${colors.magenta}${colors.bold}═══════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.magenta}${colors.bold}  常用 AI 模型提供商${colors.reset}`);
    console.log(`${colors.magenta}${colors.bold}═══════════════════════════════════════════════════════════${colors.reset}`);
    console.log();
    console.log(`${colors.bold}🌍 国际模型:${colors.reset}`);
    console.log(`  ${colors.yellow}OpenAI${colors.reset}        - GPT-4o, GPT-4-turbo`);
    console.log(`                  API: https://api.openai.com/v1`);
    console.log();
    console.log(`  ${colors.yellow}Anthropic${colors.reset}     - Claude Sonnet, Claude Opus`);
    console.log(`                  API: https://api.anthropic.com (anthropic-messages)`);
    console.log();
    console.log(`${colors.bold}🇨🇳 国内模型:${colors.reset}`);
    console.log(`  ${colors.yellow}DeepSeek${colors.reset}      - DeepSeek-V3, DeepSeek-Chat`);
    console.log(`                  API: https://api.deepseek.com/v1`);
    console.log();
    console.log(`  ${colors.yellow}Kimi (月之暗面)${colors.reset} - Kimi K2, moonshot-v1`);
    console.log(`                  API: https://api.moonshot.cn/v1`);
    console.log();
    console.log(`  ${colors.yellow}智谱 GLM${colors.reset}       - GLM-4, GLM-4-Plus`);
    console.log(`                  API: https://open.bigmodel.cn/api/paas/v4`);
    console.log();
    console.log(`  ${colors.yellow}通义千问${colors.reset}       - Qwen-Turbo, Qwen-Plus`);
    console.log(`                  API: https://dashscope.aliyuncs.com/compatible-mode/v1`);
    console.log();
    console.log(`${colors.bold}💻 本地模型:${colors.reset}`);
    console.log(`  ${colors.yellow}Ollama${colors.reset}        - Llama, Qwen, DeepSeek 本地版`);
    console.log(`                  API: http://127.0.0.1:11434/v1`);
    console.log();
}

async function configureModel() {
    step('第 1 步：配置 AI 模型');
    
    console.log(`${colors.bold}OpenClaw 需要连接一个 AI 模型才能工作。${colors.reset}`);
    console.log();
    console.log(`您可以${colors.yellow}获取 API Key:${colors.reset}`);
    console.log();
    console.log(`  ${colors.cyan}OpenAI${colors.reset}      → https://platform.openai.com/api-keys`);
    console.log(`  ${colors.cyan}DeepSeek${colors.reset}    → https://platform.deepseek.com`);
    console.log(`  ${colors.cyan}Kimi${colors.reset}        → https://platform.moonshot.cn`);
    console.log(`  ${colors.cyan}智谱${colors.reset}        → https://open.bigmodel.cn`);
    console.log(`  ${colors.cyan}通义千问${colors.reset}    → https://dashscope.console.aliyun.com`);
    console.log();
    
    if (await promptYesNo('是否查看详细模型提供商列表? (y/N)', false)) {
        showModelProviders();
    }
    
    // API 类型
    console.log();
    console.log(`${colors.bold}请选择 API 类型:${colors.reset}`);
    console.log(`  ${colors.yellow}openai-responses${colors.reset}     - OpenAI 兼容 API (GPT, DeepSeek, Kimi, GLM, Qwen 等)`);
    console.log(`  ${colors.yellow}anthropic-messages${colors.reset}  - Anthropic 兼容 API (Claude)`);
    console.log();
    
    const apiTypeDisplay = await promptChoice('请选择 API 类型', [
        'openai-responses (推荐，兼容大多数模型)',
        'anthropic-messages (Claude)'
    ]);
    config.model.apiType = apiTypeDisplay.split(' ')[0];
    
    // Base URL
    console.log();
    console.log(`${colors.bold}请输入 API 地址 (Base URL):${colors.reset}`);
    
    let defaultUrl = 'https://api.openai.com/v1';
    if (config.model.apiType === 'openai-responses') {
        console.log();
        console.log('常用地址:');
        console.log(`  ${colors.cyan}OpenAI:${colors.reset}     https://api.openai.com/v1`);
        console.log(`  ${colors.cyan}DeepSeek:${colors.reset}   https://api.deepseek.com/v1`);
        console.log(`  ${colors.cyan}Kimi:${colors.reset}       https://api.moonshot.cn/v1`);
        console.log(`  ${colors.cyan}智谱:${colors.reset}       https://open.bigmodel.cn/api/paas/v4`);
        console.log(`  ${colors.cyan}通义千问:${colors.reset}   https://dashscope.aliyuncs.com/compatible-mode/v1`);
        console.log(`  ${colors.cyan}Ollama:${colors.reset}     http://127.0.0.1:11434/v1`);
    } else if (config.model.apiType === 'anthropic-messages') {
        defaultUrl = 'https://api.anthropic.com';
    }
    
    config.model.baseUrl = await prompt('API 地址', defaultUrl);
    
    // API Key
    console.log();
    console.log(`${colors.bold}请输入 API Key:${colors.reset}`);
    console.log(`${colors.yellow}提示: API Key 通常以 sk- 开头，从模型提供商网站获取${colors.reset}`);
    console.log();
    
    config.model.apiKey = await prompt('API Key');
    while (!config.model.apiKey) {
        error('API Key 不能为空！');
        console.log(`${colors.yellow}请访问模型提供商网站获取 API Key${colors.reset}`);
        config.model.apiKey = await prompt('API Key');
    }
    
    // Model ID
    console.log();
    console.log(`${colors.bold}请输入模型 ID:${colors.reset}`);
    console.log();
    console.log('常用模型 ID:');
    console.log(`  ${colors.cyan}gpt-4o${colors.reset}           - OpenAI GPT-4o`);
    console.log(`  ${colors.cyan}gpt-4-turbo${colors.reset}      - OpenAI GPT-4 Turbo`);
    console.log(`  ${colors.cyan}deepseek-chat${colors.reset}    - DeepSeek V3`);
    console.log(`  ${colors.cyan}moonshot-v1-8k${colors.reset}   - Kimi V1`);
    console.log(`  ${colors.cyan}glm-4${colors.reset}            - 智谱 GLM-4`);
    console.log(`  ${colors.cyan}qwen-turbo${colors.reset}       - 通义千问`);
    console.log(`  ${colors.cyan}claude-sonnet-4-5${colors.reset} - Claude Sonnet`);
    console.log();
    
    config.model.id = await prompt('模型 ID', 'gpt-4o');
    
    // 高级选项
    console.log();
    if (await promptYesNo('是否配置高级选项? (上下文窗口、最大输出) (y/N)', false)) {
        config.model.context = await prompt('上下文窗口大小 (tokens)', '128000');
        config.model.maxTokens = await prompt('最大输出 tokens', '8192');
    } else {
        config.model.context = '128000';
        config.model.maxTokens = '8192';
    }
    
    success('模型配置完成！');
}

// ============================================
// Telegram 配置
// ============================================

async function configureTelegram() {
    console.log();
    console.log(`${colors.magenta}${colors.bold}═══════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.magenta}${colors.bold}  📱 Telegram 机器人配置${colors.reset}`);
    console.log(`${colors.magenta}${colors.bold}═══════════════════════════════════════════════════════════${colors.reset}`);
    console.log();
    console.log(`${colors.bold}Telegram 是什么?${colors.reset}`);
    console.log('  Telegram 是一款流行的即时通讯应用，您可以在 Telegram 中与 AI 助手对话。');
    console.log();
    console.log(`${colors.bold}如何获取 Telegram Bot Token?${colors.reset}`);
    console.log();
    console.log(`  ${colors.yellow}步骤 1:${colors.reset} 在 Telegram 中搜索 ${colors.cyan}@BotFather${colors.reset}`);
    console.log(`  ${colors.yellow}步骤 2:${colors.reset} 发送 ${colors.cyan}/newbot${colors.reset} 命令`);
    console.log(`  ${colors.yellow}步骤 3:${colors.reset} 按提示设置机器人名称`);
    console.log(`  ${colors.yellow}步骤 4:${colors.reset} 复制返回的 Token (格式: 1234567890:ABCdefGHI...)`);
    console.log();
    console.log(`  ${colors.cyan}详细教程: https://core.telegram.org/bots/tutorial${colors.reset}`);
    console.log();
    
    const botToken = await prompt('请输入 Telegram Bot Token (留空跳过)');
    
    if (botToken) {
        config.channels.telegram = {
            enabled: true,
            botToken: botToken,
            dmPolicy: 'pairing',
            groupPolicy: 'open'
        };
        success('Telegram 配置完成！');
        console.log();
        console.log(`${colors.yellow}提示: 首次使用需要在 Telegram 中向机器人发送消息，然后运行:${colors.reset}`);
        console.log(`  ${colors.cyan}openclaw pairing list${colors.reset}           # 查看配对请求`);
        console.log(`  ${colors.cyan}openclaw pairing approve telegram <代码>${colors.reset}  # 批准配对`);
        return true;
    }
    return false;
}

// ============================================
// Discord 配置
// ============================================

async function configureDiscord() {
    console.log();
    console.log(`${colors.magenta}${colors.bold}═══════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.magenta}${colors.bold}  🎮 Discord 机器人配置${colors.reset}`);
    console.log(`${colors.magenta}${colors.bold}═══════════════════════════════════════════════════════════${colors.reset}`);
    console.log();
    console.log(`${colors.bold}Discord 是什么?${colors.reset}`);
    console.log('  Discord 是一款流行的社群聊天应用，特别受游戏玩家和开发者欢迎。');
    console.log();
    console.log(`${colors.bold}如何创建 Discord 机器人?${colors.reset}`);
    console.log();
    console.log(`  ${colors.yellow}步骤 1:${colors.reset} 访问 ${colors.cyan}https://discord.com/developers/applications${colors.reset}`);
    console.log(`  ${colors.yellow}步骤 2:${colors.reset} 点击 ${colors.cyan}New Application${colors.reset} 创建应用`);
    console.log(`  ${colors.yellow}步骤 3:${colors.reset} 左侧菜单选择 ${colors.cyan}Bot${colors.reset}，点击 ${colors.cyan}Add Bot${colors.reset}`);
    console.log(`  ${colors.yellow}步骤 4:${colors.reset} 启用以下 Intents:`);
    console.log(`           • ${colors.cyan}Message Content Intent${colors.reset} (必需)`);
    console.log(`           • ${colors.cyan}Server Members Intent${colors.reset} (推荐)`);
    console.log(`  ${colors.yellow}步骤 5:${colors.reset} 点击 ${colors.cyan}Reset Token${colors.reset} 获取 Token`);
    console.log(`  ${colors.yellow}步骤 6:${colors.reset} 左侧选择 ${colors.cyan}OAuth2${colors.reset}，勾选 ${colors.cyan}bot${colors.reset} 和 ${colors.cyan}applications.commands${colors.reset}`);
    console.log(`  ${colors.yellow}步骤 7:${colors.reset} 复制邀请链接，将机器人添加到服务器`);
    console.log();
    
    const botToken = await prompt('请输入 Discord Bot Token (留空跳过)');
    
    if (botToken) {
        console.log();
        console.log(`${colors.cyan}请输入 Discord 服务器 ID (可选):${colors.reset}`);
        console.log(`${colors.yellow}获取方法: Discord 设置 → 高级 → 开发者模式 (开启)${colors.reset}`);
        console.log(`${colors.yellow}然后右键点击服务器 → 复制服务器 ID${colors.reset}`);
        
        const serverId = await prompt('服务器 ID (留空跳过)');
        
        config.channels.discord = {
            enabled: true,
            token: botToken,
            dmPolicy: 'pairing'
        };
        
        if (serverId) {
            config.channels.discord.guilds = {
                [serverId]: { requireMention: false }
            };
        }
        
        success('Discord 配置完成！');
        return true;
    }
    return false;
}

// ============================================
// 飞书/Lark 配置
// ============================================

async function configureFeishu() {
    console.log();
    console.log(`${colors.magenta}${colors.bold}═══════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.magenta}${colors.bold}  🪽 飞书 / Lark 机器人配置${colors.reset}`);
    console.log(`${colors.magenta}${colors.bold}═══════════════════════════════════════════════════════════${colors.reset}`);
    console.log();
    console.log(`${colors.bold}飞书是什么?${colors.reset}`);
    console.log('  飞书是字节跳动推出的企业协作平台，在国内和国际分别叫飞书和 Lark。');
    console.log();
    console.log(`${colors.bold}如何创建飞书机器人?${colors.reset}`);
    console.log();
    console.log(`  ${colors.yellow}步骤 1:${colors.reset} 访问 ${colors.cyan}https://open.feishu.cn/app${colors.reset} (国际版: https://open.larksuite.com/app)`);
    console.log(`  ${colors.yellow}步骤 2:${colors.reset} 点击 ${colors.cyan}创建企业自建应用${colors.reset}`);
    console.log(`  ${colors.yellow}步骤 3:${colors.reset} 在 ${colors.cyan}凭证与基础信息${colors.reset} 页面获取 App ID 和 App Secret`);
    console.log(`  ${colors.yellow}步骤 4:${colors.reset} 在 ${colors.cyan}权限管理${colors.reset} 中添加权限:`);
    console.log(`           • ${colors.cyan}im:message${colors.reset} (获取与发送消息)`);
    console.log(`           • ${colors.cyan}im:message:send_as_bot${colors.reset} (以应用身份发消息)`);
    console.log(`  ${colors.yellow}步骤 5:${colors.reset} 在 ${colors.cyan}应用功能 → 机器人${colors.reset} 中启用机器人`);
    console.log(`  ${colors.yellow}步骤 6:${colors.reset} 在 ${colors.cyan}事件订阅${colors.reset} 中:`);
    console.log(`           • 选择 ${colors.cyan}使用长连接接收事件${colors.reset}`);
    console.log(`           • 添加事件: ${colors.cyan}im.message.receive_v1${colors.reset}`);
    console.log(`  ${colors.yellow}步骤 7:${colors.reset} 创建版本并提交发布`);
    console.log();
    
    const appId = await prompt('请输入飞书 App ID (格式: cli_xxx，留空跳过)');
    
    if (appId) {
        const appSecret = await prompt('请输入飞书 App Secret');
        
        if (appSecret) {
            const domainDisplay = await promptChoice('请选择域名', [
                'feishu (国内飞书)',
                'lark (国际版)'
            ]);
            const domain = domainDisplay.split(' ')[0];
            
            config.channels.feishu = {
                enabled: true,
                domain: domain,
                accounts: {
                    'default': {
                        appId: appId,
                        appSecret: appSecret,
                        domain: domain
                    }
                },
                dmPolicy: 'pairing',
                groupPolicy: 'open'
            };
            
            console.log();
            console.log(`${colors.cyan}正在安装飞书插件...${colors.reset}`);
            exec('npm install -g @max1874/feishu', false);
            
            success('飞书配置完成！');
            console.log();
            console.log(`${colors.yellow}提示: 确保应用已发布并通过审核，机器人才能正常工作${colors.reset}`);
            return true;
        }
    }
    return false;
}

// ============================================
// 渠道配置
// ============================================

async function configureChannels() {
    step('第 2 步：配置聊天渠道 (可选)');
    
    console.log(`${colors.bold}您可以让 OpenClaw 在多个聊天平台工作:${colors.reset}`);
    console.log();
    console.log(`  ${colors.yellow}📱 Telegram${colors.reset}  - 流行的即时通讯应用`);
    console.log(`  ${colors.yellow}🎮 Discord${colors.reset}   - 游戏玩家和开发者社区`);
    console.log(`  ${colors.yellow}🪽 飞书/Lark${colors.reset}  - 企业协作平台`);
    console.log();
    console.log(`${colors.cyan}提示: 您可以稍后通过编辑配置文件添加更多渠道${colors.reset}`);
    console.log();
    
    if (await promptYesNo('是否配置 Telegram? (y/N)', false)) {
        await configureTelegram();
    }
    
    if (await promptYesNo('是否配置 Discord? (y/N)', false)) {
        await configureDiscord();
    }
    
    if (await promptYesNo('是否配置飞书/Lark? (y/N)', false)) {
        await configureFeishu();
    }
}

// ============================================
// 生成配置文件
// ============================================

function generateConfig() {
    const channelsJson = JSON.stringify(config.channels, null, 4);
    
    return `{
  agent: {
    workspace: "~/.openclaw/workspace",
    model: { primary: "custom/${config.model.id}" }
  },
  models: {
    mode: "merge",
    providers: {
      "custom": {
        baseUrl: "${config.model.baseUrl}",
        apiKey: "${config.model.apiKey}",
        api: "${config.model.apiType}",
        models: [
          {
            id: "${config.model.id}",
            name: "${config.model.id}",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: ${config.model.context},
            maxTokens: ${config.model.maxTokens}
          }
        ]
      }
    }
  },
  channels: ${channelsJson},
  session: {
    dmScope: "per-channel-peer"
  }
}`;
}

function saveConfig() {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    if (!fs.existsSync(path.join(CONFIG_DIR, 'workspace'))) {
        fs.mkdirSync(path.join(CONFIG_DIR, 'workspace'), { recursive: true });
    }
    
    fs.writeFileSync(CONFIG_FILE, generateConfig(), 'utf8');
    success(`配置文件已保存到: ${CONFIG_FILE}`);
}

// ============================================
// 启动 Gateway
// ============================================

function startGateway() {
    step('第 3 步：启动 OpenClaw Gateway');
    
    console.log(`${colors.bold}正在启动 OpenClaw 服务...${colors.reset}`);
    console.log();
    
    // 安装守护进程
    console.log(`${colors.cyan}正在配置 Gateway 守护进程...${colors.reset}`);
    exec('openclaw onboard --install-daemon', false);
    
    // 启动 Gateway
    console.log(`${colors.cyan}正在启动 Gateway...${colors.reset}`);
    
    // 使用 spawn 在后台启动
    const child = spawn('openclaw', ['gateway'], {
        detached: true,
        stdio: 'ignore',
        shell: true
    });
    child.unref();
    
    // 等待启动
    const start = Date.now();
    while (Date.now() - start < 5000) {
        // 等待服务启动
    }
    
    // 显示完成信息
    console.log();
    console.log(`${colors.green}${colors.bold}╔══════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.green}${colors.bold}║                                                          ║${colors.reset}`);
    console.log(`${colors.green}${colors.bold}║   🎉 OpenClaw 已成功安装并启动！                         ║${colors.reset}`);
    console.log(`${colors.green}${colors.bold}║                                                          ║${colors.reset}`);
    console.log(`${colors.green}${colors.bold}╚══════════════════════════════════════════════════════════╝${colors.reset}`);
    console.log();
    
    console.log(`${colors.bold}${colors.cyan}📋 访问信息:${colors.reset}`);
    console.log();
    console.log(`  ${colors.yellow}Web 界面:${colors.reset}   http://127.0.0.1:18789`);
    console.log(`  ${colors.yellow}配置文件:${colors.reset}   ${CONFIG_FILE}`);
    console.log(`  ${colors.yellow}工作目录:${colors.reset}   ${path.join(CONFIG_DIR, 'workspace')}`);
    console.log();
    
    console.log(`${colors.bold}${colors.cyan}🛠️ 常用命令:${colors.reset}`);
    console.log();
    console.log(`  ${colors.cyan}openclaw agent --message '你好'${colors.reset}`);
    console.log(`      → 在命令行与 AI 助手对话`);
    console.log();
    console.log(`  ${colors.cyan}openclaw gateway status${colors.reset}`);
    console.log(`      → 查看服务状态`);
    console.log();
    console.log(`  ${colors.cyan}openclaw gateway stop${colors.reset}`);
    console.log(`      → 停止服务`);
    console.log();
    console.log(`  ${colors.cyan}openclaw gateway start${colors.reset}`);
    console.log(`      → 启动服务`);
    console.log();
    console.log(`  ${colors.cyan}openclaw dashboard${colors.reset}`);
    console.log(`      → 打开 Web 管理界面`);
    console.log();
    
    if (Object.keys(config.channels).length > 0) {
        console.log(`${colors.bold}${colors.cyan}📱 渠道管理:${colors.reset}`);
        console.log();
        console.log(`  ${colors.cyan}openclaw channels status${colors.reset}`);
        console.log(`      → 查看所有渠道状态`);
        console.log();
        console.log(`  ${colors.cyan}openclaw pairing list${colors.reset}`);
        console.log(`      → 查看配对请求`);
        console.log();
        console.log(`  ${colors.cyan}openclaw pairing approve <渠道> <代码>${colors.reset}`);
        console.log(`      → 批准配对 (首次使用需要配对验证)`);
        console.log();
        console.log(`${colors.yellow}💡 提示: 首次使用时，向机器人发送消息后会收到配对码，${colors.reset}`);
        console.log(`${colors.yellow}   使用上面的命令批准配对即可开始对话。${colors.reset}`);
        console.log();
    }
    
    console.log(`${colors.bold}${colors.cyan}📚 更多帮助:${colors.reset}`);
    console.log();
    console.log(`  ${colors.cyan}官方文档:${colors.reset}   https://docs.openclaw.ai`);
    console.log(`  ${colors.cyan}问题反馈:${colors.reset}   https://github.com/openclaw/openclaw/issues`);
    console.log();
}

// ============================================
// 主流程
// ============================================

async function main() {
    banner();
    
    success(`检测到系统: ${process.platform}`);
    
    // 步骤 0: 环境检查
    step('第 0 步：检查环境');
    
    // Node.js 检测
    if (!checkNode()) {
        installNodeGuide();
        rl.close();
        return;
    }
    
    // 检查 OpenClaw
    if (!checkOpenClaw()) {
        console.log();
        if (await promptYesNo('是否安装 OpenClaw? (Y/n)', true)) {
            if (!await installOpenClaw()) {
                rl.close();
                return;
            }
        } else {
            console.log('请手动安装: npm install -g openclaw@latest');
            rl.close();
            return;
        }
    }
    
    // 检查现有配置
    if (fs.existsSync(CONFIG_FILE)) {
        console.log();
        warn(`检测到已有配置文件: ${CONFIG_FILE}`);
        
        if (await promptYesNo('是否重新配置? (y/N)', false)) {
            // 继续配置流程
        } else {
            success('跳过配置，直接启动...');
            startGateway();
            rl.close();
            return;
        }
    }
    
    // 配置流程
    await configureModel();
    await configureChannels();
    saveConfig();
    
    // 启动
    startGateway();
    
    rl.close();
}

main().catch(console.error);
