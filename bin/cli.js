#!/usr/bin/env node

/**
 * OpenClaw 快速安装器 - Node.js CLI
 * 参考: openclaw-source/src/wizard/onboarding.ts
 * 用法: npx openclaw-quickstart
 */

const readline = require('readline');
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const CONFIG_DIR = path.join(os.homedir(), '.openclaw');
const CONFIG_FILE = path.join(CONFIG_DIR, 'openclaw.json');
const DEFAULT_GATEWAY_PORT = 18789;

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
const configState = {
    provider: 'zai',
    apiType: 'openai-completions',
    baseUrl: '',
    apiKey: '',
    modelId: 'glm-5',
    channels: {},
    skills: {}
};

// ============================================
// 工具函数
// ============================================

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

function generateToken() {
    return crypto.randomBytes(20).toString('hex');
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
// 模型提供商配置
// 参考: openclaw-source/src/commands/auth-choice-options.ts
// ============================================

const MODEL_PROVIDERS = {
    // Z.AI (GLM) - OpenAI Format
    zai: {
        name: 'Z.AI (GLM)',
        desc: 'GLM-5 / GLM-4.7, OpenAI format',
        apiTypes: ['openai-completions'],
        defaultApiType: 'openai-completions',
        urls: {
            'Global': 'https://api.z.ai/api/paas/v4',
            'CN': 'https://open.bigmodel.cn/api/paas/v4',
            'Coding-Global': 'https://api.z.ai/api/coding/paas/v4',
            'Coding-CN': 'https://open.bigmodel.cn/api/coding/paas/v4'
        },
        models: ['glm-5', 'glm-4.7', 'glm-4.7-flash', 'glm-4.7-flashx'],
        defaultModel: 'glm-5',
        keyUrl: 'https://open.bigmodel.cn/console/apikey',
        envKey: 'ZAI_API_KEY'
    },
    // MiniMax - Claude Format
    minimax: {
        name: 'MiniMax',
        desc: 'M2.5 (456B), Claude format',
        apiTypes: ['anthropic-messages'],
        defaultApiType: 'anthropic-messages',
        urls: {
            'Global': 'https://api.minimax.io/anthropic',
            'CN': 'https://api.minimaxi.com/anthropic'
        },
        models: ['MiniMax-M2.5', 'MiniMax-M2.1', 'MiniMax-M2.5-Lightning'],
        defaultModel: 'MiniMax-M2.5',
        keyUrl: 'https://api.minimaxi.com'
    },
    // Moonshot (Kimi) - OpenAI Format
    moonshot: {
        name: 'Kimi (Moonshot)',
        desc: 'K2.5 (1T params), OpenAI format',
        apiTypes: ['openai-completions'],
        defaultApiType: 'openai-completions',
        urls: {
            'Global': 'https://api.moonshot.ai/v1',
            'CN': 'https://api.moonshot.cn/v1'
        },
        models: ['kimi-k2.5', 'kimi-k2-thinking', 'kimi-k2-turbo-preview'],
        defaultModel: 'kimi-k2.5',
        keyUrl: 'https://platform.moonshot.cn/console/api-keys'
    },
    // Kimi Coding - Claude Format
    kimiCoding: {
        name: 'Kimi Coding',
        desc: 'K2P5, Claude format',
        apiTypes: ['anthropic-messages'],
        defaultApiType: 'anthropic-messages',
        urls: {
            'Default': 'https://api.kimi.com/coding/'
        },
        models: ['k2p5'],
        defaultModel: 'k2p5',
        keyUrl: 'https://kimi-code.moonshot.cn'
    },
    // DeepSeek - OpenAI Format
    deepseek: {
        name: 'DeepSeek',
        desc: 'V3.2 (340B MoE), High value',
        apiTypes: ['openai-completions'],
        defaultApiType: 'openai-completions',
        urls: {
            'Default': 'https://api.deepseek.com/v1'
        },
        models: ['deepseek-chat', 'deepseek-reasoner', 'deepseek-v3'],
        defaultModel: 'deepseek-chat',
        keyUrl: 'https://platform.deepseek.com/api_keys'
    },
    // Qwen - OpenAI Format
    qwen: {
        name: 'Qwen (Alibaba)',
        desc: 'Qwen 3.5 Max, OpenAI format',
        apiTypes: ['openai-completions'],
        defaultApiType: 'openai-completions',
        urls: {
            'Default': 'https://dashscope.aliyuncs.com/compatible-mode/v1'
        },
        models: ['qwen3.5-max', 'qwen3.5-turbo', 'qwen3-max', 'qwq-32b'],
        defaultModel: 'qwen3.5-max',
        keyUrl: 'https://dashscope.console.aliyun.com/apiKey'
    },
    // StepFun - Both Formats
    stepfun: {
        name: 'StepFun',
        desc: 'Step-3.5 Flash (196B), Both formats',
        apiTypes: ['anthropic-messages', 'openai-completions'],
        defaultApiType: 'anthropic-messages',
        urls: {
            'anthropic-messages': 'https://api.stepfun.ai/anthropic',
            'openai-completions': 'https://api.stepfun.ai/v1'
        },
        models: ['step-3.5-flash', 'step-3.5-medium', 'step-2-16k'],
        defaultModel: 'step-3.5-flash',
        keyUrl: 'https://platform.stepfun.com'
    },
    // Volcengine
    volcengine: {
        name: 'Volcengine (ByteDance)',
        desc: 'Doubao / Multi-model',
        apiTypes: ['openai-completions', 'anthropic-messages'],
        defaultApiType: 'openai-completions',
        urls: {
            'Coding Plan': 'https://ark.cn-beijing.volces.com/api/coding/v3',
            'Claude Format': 'https://ark.cn-beijing.volces.com/api/coding'
        },
        models: ['doubao-seed-code-latest', 'glm-4.7', 'deepseek-v3'],
        defaultModel: 'doubao-seed-code-latest',
        keyUrl: 'https://console.volcengine.com/ark'
    },
    // xAI (Grok)
    xai: {
        name: 'xAI (Grok)',
        desc: 'Grok-4, OpenAI format',
        apiTypes: ['openai-completions'],
        defaultApiType: 'openai-completions',
        urls: {
            'Default': 'https://api.x.ai/v1'
        },
        models: ['grok-4'],
        defaultModel: 'grok-4',
        keyUrl: 'https://console.x.ai'
    },
    // Mistral AI
    mistral: {
        name: 'Mistral AI',
        desc: 'Mistral Large, OpenAI format',
        apiTypes: ['openai-completions'],
        defaultApiType: 'openai-completions',
        urls: {
            'Default': 'https://api.mistral.ai/v1'
        },
        models: ['mistral-large-latest', 'pixtral-large-latest', 'codestral-latest'],
        defaultModel: 'mistral-large-latest',
        keyUrl: 'https://console.mistral.ai'
    },
    // OpenRouter
    openrouter: {
        name: 'OpenRouter',
        desc: '100+ Models Gateway',
        apiTypes: ['openai-completions'],
        defaultApiType: 'openai-completions',
        urls: {
            'Default': 'https://openrouter.ai/api/v1'
        },
        models: ['anthropic/claude-sonnet-4', 'openai/gpt-4.1', 'google/gemini-2.5-flash'],
        defaultModel: 'anthropic/claude-sonnet-4',
        keyUrl: 'https://openrouter.ai/keys'
    },
    // OpenAI Official
    openai: {
        name: 'OpenAI',
        desc: 'GPT-4.1 / o3-mini',
        apiTypes: ['openai-completions'],
        defaultApiType: 'openai-completions',
        urls: {
            'Default': 'https://api.openai.com/v1'
        },
        models: ['gpt-4.1', 'o3-mini', 'gpt-4o', 'chatgpt-4o-latest'],
        defaultModel: 'gpt-4.1',
        keyUrl: 'https://platform.openai.com/api-keys'
    },
    // Anthropic Claude
    anthropic: {
        name: 'Anthropic Claude',
        desc: 'Claude 4.6 Sonnet / Opus',
        apiTypes: ['anthropic-messages'],
        defaultApiType: 'anthropic-messages',
        urls: {
            'Default': 'https://api.anthropic.com'
        },
        models: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-4-6'],
        defaultModel: 'claude-sonnet-4-6',
        keyUrl: 'https://console.anthropic.com/settings/keys'
    },
    // Google Gemini
    gemini: {
        name: 'Google Gemini',
        desc: 'Gemini 2.5 Pro, OpenAI format',
        apiTypes: ['openai-completions'],
        defaultApiType: 'openai-completions',
        urls: {
            'Default': 'https://generativelanguage.googleapis.com/v1beta'
        },
        models: ['gemini-2.5-flash', 'gemini-2.5-pro'],
        defaultModel: 'gemini-2.5-flash',
        keyUrl: 'https://makersuite.google.com/app/apikey'
    }
};

// ============================================
// Banner
// ============================================

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
    console.log(`${colors.magenta}OpenClaw 是一个强大的 AI 个人助手，支持:${colors.reset}`);
    console.log(`${colors.magenta}  • 多种聊天平台 (Telegram, Discord, 飞书, WhatsApp 等)${colors.reset}`);
    console.log(`${colors.magenta}  • 多种 AI 模型 (Claude, GPT, DeepSeek, Kimi, GLM, Qwen 等)${colors.reset}`);
    console.log(`${colors.magenta}  • 语音交互、Canvas 可视化、工具调用${colors.reset}`);
    console.log();
}

// ============================================
// Node.js 检测
// ============================================

function checkNode() {
    const major = parseInt(process.version.replace('v', '').split('.')[0]);
    if (major >= 22) {
        success(`检测到 Node.js ${process.version} ✓`);
        return true;
    }
    if (major > 0) {
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

    if (platform === 'win32') {
        console.log(`${colors.yellow}Windows 安装方法:${colors.reset}`);
        console.log(`  ${colors.cyan}winget install OpenJS.NodeJS.LTS${colors.reset}`);
        console.log(`  或访问: ${colors.cyan}https://nodejs.org${colors.reset}`);
    } else if (platform === 'darwin') {
        console.log(`${colors.yellow}macOS 安装方法:${colors.reset}`);
        console.log(`  ${colors.cyan}brew install node@22${colors.reset}`);
    } else {
        console.log(`${colors.yellow}Linux 安装方法:${colors.reset}`);
        console.log(`  ${colors.cyan}curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -${colors.reset}`);
        console.log(`  ${colors.cyan}sudo apt-get install -y nodejs${colors.reset}`);
    }
    console.log();
}

// ============================================
// OpenClaw 安装
// ============================================

function checkOpenClaw() {
    const result = exec('openclaw --version');
    return result.success;
}

async function installOpenClaw() {
    console.log();
    console.log(`${colors.cyan}正在安装 OpenClaw...${colors.reset}`);
    console.log('这可能需要几分钟时间，请耐心等待...');

    // 设置 npm 静默模式
    const env = { ...process.env };
    env.NPM_CONFIG_LOGLEVEL = 'error';
    env.NPM_CONFIG_FUND = 'false';
    env.NPM_CONFIG_AUDIT = 'false';

    let result = exec('npm install -g openclaw@latest', false);

    if (result.success || checkOpenClaw()) {
        success('OpenClaw 安装成功！');
        return true;
    }

    // 尝试使用 --force
    warn('尝试使用强制安装模式...');
    result = exec('npm install -g openclaw@latest --force', false);

    if (result.success || checkOpenClaw()) {
        success('OpenClaw 安装成功！');
        return true;
    }

    error('OpenClaw 安装失败');
    console.log(`${colors.yellow}请尝试手动安装: npm install -g openclaw@latest${colors.reset}`);
    return false;
}

// ============================================
// 模型配置
// ============================================

async function configureModel() {
    step('第 1 步：配置 AI 模型');

    console.log(`${colors.bold}OpenClaw 需要连接一个 AI 模型才能工作。${colors.reset}`);
    console.log();

    // 选择提供商
    const providerOptions = Object.entries(MODEL_PROVIDERS).map(([id, p]) =>
        `${p.name} - ${p.desc}`
    );

    const providerChoice = await promptChoice('请选择 AI 服务商', providerOptions);
    const providerId = Object.keys(MODEL_PROVIDERS)[providerOptions.indexOf(providerChoice)];
    const provider = MODEL_PROVIDERS[providerId];

    configState.provider = providerId;
    configState.apiType = provider.defaultApiType;
    configState.baseUrl = provider.urls[provider.defaultApiType];
    configState.modelId = provider.defaultModel;

    console.log();
    console.log(`${colors.cyan}已选择: ${provider.name}${colors.reset}`);
    console.log(`${colors.cyan}获取 API Key: ${provider.keyUrl}${colors.reset}`);
    console.log();

    // API Key
    if (providerId !== 'ollama') {
        configState.apiKey = await prompt('请输入 API Key');
        if (!configState.apiKey) {
            error('API Key 不能为空！');
            configState.apiKey = await prompt('请输入 API Key');
        }
    } else {
        configState.apiKey = 'ollama-local';
        console.log(`${colors.yellow}Ollama 本地模式，无需 API Key${colors.reset}`);
    }

    // 高级选项
    console.log();
    if (await promptYesNo('是否配置高级选项? (自定义 API 地址、模型 ID) (y/N)', false)) {
        configState.baseUrl = await prompt('API 地址', configState.baseUrl);

        console.log();
        console.log(`${colors.cyan}推荐模型 ID:${colors.reset}`);
        provider.models.forEach(m => console.log(`  - ${m}`));
        console.log();
        configState.modelId = await prompt('模型 ID', configState.modelId);
    }

    success('模型配置完成！');
}

// ============================================
// 渠道配置
// ============================================

const CHANNELS = {
    telegram: {
        name: 'Telegram',
        icon: '📱',
        desc: '流行的即时通讯应用',
        setupUrl: 'https://core.telegram.org/bots/tutorial',
        fields: [
            { key: 'botToken', label: 'Bot Token', example: '1234567890:ABCdefGHI...' }
        ]
    },
    discord: {
        name: 'Discord',
        icon: '🎮',
        desc: '游戏玩家和开发者社区',
        setupUrl: 'https://discord.com/developers/applications',
        fields: [
            { key: 'token', label: 'Bot Token', example: 'MTAw...' }
        ]
    },
    feishu: {
        name: '飞书/Lark',
        icon: '🪽',
        desc: '企业协作平台',
        setupUrl: 'https://open.feishu.cn/app',
        pluginName: 'feishu',
        fields: [
            { key: 'appId', label: 'App ID', example: 'cli_xxx...' },
            { key: 'appSecret', label: 'App Secret', example: '...' }
        ]
    },
    whatsapp: {
        name: 'WhatsApp',
        icon: '💬',
        desc: '全球最大的即时通讯平台',
        setupUrl: 'https://developers.facebook.com/docs/whatsapp',
        fields: [
            { key: 'phoneNumber', label: 'Phone Number', example: '+8613800138000' }
        ]
    },
    slack: {
        name: 'Slack',
        icon: '💼',
        desc: '企业团队协作',
        setupUrl: 'https://api.slack.com/apps',
        fields: [
            { key: 'botToken', label: 'Bot Token', example: 'xoxb-...' },
            { key: 'appToken', label: 'App Token (可选)', example: 'xapp-...' }
        ]
    }
};

async function configureChannels() {
    step('第 2 步：配置聊天渠道 (可选)');

    console.log(`${colors.bold}您可以让 OpenClaw 在多个聊天平台工作${colors.reset}`);
    console.log();

    if (!await promptYesNo('是否配置聊天渠道? (Y/n)', true)) {
        return;
    }

    const channelOptions = Object.entries(CHANNELS).map(([id, c]) =>
        `${c.icon} ${c.name} - ${c.desc}`
    );

    const selectedChannel = await promptChoice('请选择要配置的渠道', [
        ...channelOptions,
        '跳过渠道配置'
    ]);

    if (selectedChannel === '跳过渠道配置') {
        console.log(`${colors.yellow}已跳过渠道配置，您可以稍后使用以下命令添加:${colors.reset}`);
        console.log(`  ${colors.cyan}openclaw channels add${colors.reset}`);
        return;
    }

    const channelId = Object.keys(CHANNELS)[channelOptions.indexOf(selectedChannel)];
    const channel = CHANNELS[channelId];

    console.log();
    console.log(`${colors.magenta}${colors.bold}═══════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.magenta}${colors.bold}  ${channel.icon} ${channel.name} 配置${colors.reset}`);
    console.log(`${colors.magenta}${colors.bold}═══════════════════════════════════════════════════════════${colors.reset}`);
    console.log();
    console.log(`${colors.cyan}配置指南: ${channel.setupUrl}${colors.reset}`);
    console.log();

    // 收集字段
    const channelConfig = {};
    for (const field of channel.fields) {
        const value = await prompt(`${field.label}`, '');
        if (value) {
            channelConfig[field.key] = value;
        }
    }

    // 保存配置
    if (Object.keys(channelConfig).length > 0) {
        configState.channels[channelId] = {
            dmPolicy: 'pairing',
            ...channelConfig
        };

        // 特殊处理飞书 (需要插件)
        if (channel.pluginName) {
            configState.channels[channelId].accounts = {
                default: {
                    appId: channelConfig.appId,
                    appSecret: channelConfig.appSecret
                }
            };
        }

        success(`${channel.name} 配置完成！`);
        console.log();
        console.log(`${colors.yellow}提示: 首次使用需要配对验证${colors.reset}`);
        console.log(`  ${colors.cyan}openclaw pairing approve ${channelId} <代码>${colors.reset}`);
    }
}

// ============================================
// 技能配置
// ============================================

async function configureSkills() {
    console.log();
    if (!await promptYesNo('是否配置扩展技能? (天气、语音等) (y/N)', false)) {
        return;
    }

    console.log();
    console.log(`${colors.cyan}可用技能 (可以稍后通过 openclaw skills install 安装):${colors.reset}`);
    console.log(`  ${colors.yellow}• weather${colors.reset}      - 天气查询`);
    console.log(`  ${colors.yellow}• voice-call${colors.reset}   - 语音输入输出`);
    console.log(`  ${colors.yellow}• canvas${colors.reset}        - 可视化工作空间`);
    console.log(`  ${colors.yellow}• github${colors.reset}        - GitHub 集成`);
    console.log();
}

// ============================================
// 生成配置文件 (参考官方格式)
// ============================================

function generateConfig() {
    const now = new Date().toISOString();

    const config = {
        $schema: 'https://openclaw.ai/schema/config.json',
        meta: {
            lastTouchedVersion: '2026.3.1',
            lastTouchedAt: now
        },
        models: {
            mode: 'merge',
            providers: {}
        },
        agents: {
            defaults: {
                model: {
                    primary: `${configState.provider}/${configState.modelId}`
                },
                workspace: '~/.openclaw/workspace',
                compaction: { mode: 'safeguard' },
                maxConcurrent: 4
            }
        },
        session: {
            dmScope: 'per-channel-peer'
        },
        channels: {},
        gateway: {
            mode: 'local',
            auth: {
                mode: 'token',
                token: generateToken()
            },
            controlUi: {
                enabled: true,
                allowedOrigins: [
                    `http://localhost:${DEFAULT_GATEWAY_PORT}`,
                    `http://127.0.0.1:${DEFAULT_GATEWAY_PORT}`
                ]
            },
            nodes: {
                denyCommands: [
                    'camera.snap',
                    'camera.clip',
                    'screen.record',
                    'calendar.add',
                    'contacts.add',
                    'reminders.add'
                ]
            }
        },
        skills: {
            entries: {}
        }
    };

    // 模型配置
    config.models.providers[configState.provider] = {
        baseUrl: configState.baseUrl,
        apiKey: configState.apiKey,
        api: configState.apiType,
        models: [{
            id: configState.modelId,
            name: configState.modelId,
            reasoning: false,
            input: ['text'],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 128000,
            maxTokens: 8192
        }]
    };

    // 渠道配置
    Object.entries(configState.channels).forEach(([id, cfg]) => {
        config.channels[id] = { dmPolicy: 'pairing' };

        if (id === 'telegram') {
            config.channels[id].botToken = cfg.botToken;
        } else if (id === 'discord') {
            config.channels[id].token = cfg.token;
        } else if (id === 'feishu') {
            config.channels[id].accounts = cfg.accounts;
            // 飞书需要启用插件
            config.plugins = config.plugins || {};
            config.plugins.entries = config.plugins.entries || {};
            config.plugins.entries.feishu = { enabled: true };
        } else if (id === 'slack') {
            config.channels[id].botToken = cfg.botToken;
            if (cfg.appToken) config.channels[id].appToken = cfg.appToken;
        } else if (id === 'whatsapp') {
            config.channels[id].phoneNumber = cfg.phoneNumber;
        }
    });

    return JSON.stringify(config, null, 2);
}

function saveConfig() {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    const ws = path.join(CONFIG_DIR, 'workspace');
    if (!fs.existsSync(ws)) {
        fs.mkdirSync(ws, { recursive: true });
    }

    fs.writeFileSync(CONFIG_FILE, generateConfig(), 'utf8');
    success(`配置文件已保存到: ${CONFIG_FILE}`);
}

// ============================================
// 启动 Gateway
// ============================================

// 检查 OpenClaw 是否全局安装
function isOpenClawGlobal() {
    const result = exec('openclaw --version', { stdio: 'pipe' });
    return result.success;
}

function startGateway() {
    step('第 3 步：启动 OpenClaw Gateway');

    console.log(`${colors.bold}正在启动 OpenClaw 服务...${colors.reset}`);

    const isGlobal = isOpenClawGlobal();
    const openclawCmd = isGlobal ? 'openclaw' : 'npx openclaw@latest';

    // 停止现有的 gateway
    try {
        execSync(`${openclawCmd} gateway stop`, { encoding: 'utf8', stdio: 'ignore', timeout: 5000 });
    } catch (e) {}

    // 启动 gateway (使用 --allow-unconfigured 以确保能启动)
    const gatewayArgs = isGlobal
        ? ['gateway', '--allow-unconfigured']
        : ['openclaw@latest', 'gateway', '--allow-unconfigured'];
    const cmd = isGlobal ? 'openclaw' : 'npx';

    const child = spawn(cmd, gatewayArgs, {
        detached: true,
        stdio: 'ignore',
        shell: true
    });
    child.unref();

    // 等待启动
    const start = Date.now();
    while (Date.now() - start < 3000) {
        // 等待
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
    console.log(`  ${colors.yellow}Web 界面:${colors.reset}   http://127.0.0.1:${DEFAULT_GATEWAY_PORT}`);
    console.log(`  ${colors.yellow}配置文件:${colors.reset}   ${CONFIG_FILE}`);
    console.log(`  ${colors.yellow}工作目录:${colors.reset}   ${path.join(CONFIG_DIR, 'workspace')}`);
    console.log();

    console.log(`${colors.bold}${colors.cyan}🛠️ 常用命令:${colors.reset}`);
    console.log();
    const cmdPrefix = isGlobal ? 'openclaw' : 'npx openclaw@latest';
    console.log(`  ${colors.cyan}${cmdPrefix} agent --message '你好'${colors.reset}`);
    console.log(`      → 在命令行与 AI 助手对话`);
    console.log();
    console.log(`  ${colors.cyan}${cmdPrefix} gateway status${colors.reset}`);
    console.log(`      → 查看服务状态`);
    console.log();
    console.log(`  ${colors.cyan}${cmdPrefix} channels add${colors.reset}`);
    console.log(`      → 添加更多渠道`);
    console.log();
    console.log(`  ${colors.cyan}${cmdPrefix} pairing list${colors.reset}`);
    console.log(`      → 查看配对请求`);
    console.log();

    if (Object.keys(configState.channels).length > 0) {
        console.log(`${colors.yellow}💡 提示: 首次使用时，向机器人发送消息后会收到配对码${colors.reset}`);
        console.log(`${colors.yellow}   使用以下命令批准配对即可开始对话:${colors.reset}`);
        console.log(`  ${colors.cyan}${cmdPrefix} pairing approve <渠道> <代码>${colors.reset}`);
        console.log();
    }

    console.log(`${colors.bold}${colors.cyan}📚 更多帮助:${colors.reset}`);
    console.log(`  ${colors.cyan}官方文档:${colors.reset}   https://docs.openclaw.ai`);
    console.log(`  ${colors.cyan}源码参考:${colors.reset}   https://github.com/openclaw/openclaw`);
    console.log();
}

// ============================================
// 主流程
// ============================================

async function main() {
    banner();

    success(`检测到系统: ${process.platform}`);

    // 环境检查
    step('第 0 步：检查环境');

    if (!checkNode()) {
        installNodeGuide();
        rl.close();
        return;
    }

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
            // 备份现有配置
            const backupPath = CONFIG_FILE + '.backup.' + Date.now();
            fs.copyFileSync(CONFIG_FILE, backupPath);
            success(`已备份现有配置到: ${backupPath}`);
        } else {
            success('使用现有配置，正在启动...');
            startGateway();
            rl.close();
            return;
        }
    }

    // 配置流程
    await configureModel();
    await configureChannels();
    await configureSkills();

    saveConfig();
    startGateway();

    rl.close();
}

main().catch(err => {
    error(`发生错误: ${err.message}`);
    rl.close();
    process.exit(1);
});
