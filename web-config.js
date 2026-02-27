#!/usr/bin/env node

/**
 * OpenClaw Web Configuration Server
 * 通过浏览器配置 OpenClaw，避免终端中文显示问题
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const CONFIG_DIR = path.join(os.homedir(), '.openclaw');
const CONFIG_FILE = path.join(CONFIG_DIR, 'openclaw.json');
const PORT = 18792;

// 确保 UTF-8 编码
process.env.NODE_ENV = 'production';

// 颜色和样式
const HTML = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OpenClaw 配置向导</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #1e3a5f 0%, #0d1b2a 100%); min-height: 100vh; color: #e0e0e0; }
        .container { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 40px; }
        .logo { font-size: 48px; margin-bottom: 10px; }
        h1 { font-size: 28px; font-weight: 600; margin-bottom: 10px; }
        .subtitle { color: #8899a6; font-size: 16px; }
        .card { background: rgba(255,255,255,0.05); border-radius: 16px; padding: 30px; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.1); }
        .step-indicator { display: flex; justify-content: center; gap: 10px; margin-bottom: 30px; }
        .step { width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; font-weight: 600; }
        .step.active { background: #3b82f6; }
        .step.completed { background: #10b981; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; font-weight: 500; color: #b0b0b0; }
        input, select, textarea { width: 100%; padding: 12px 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #e0e0e0; font-size: 14px; }
        input:focus, select:focus, textarea:focus { outline: none; border-color: #3b82f6; background: rgba(59,130,246,0.1); }
        input::placeholder { color: #666; }
        .btn { padding: 12px 24px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .btn-primary { background: #3b82f6; color: white; }
        .btn-primary:hover { background: #2563eb; }
        .btn-success { background: #10b981; color: white; }
        .btn-success:hover { background: #059669; }
        .btn-secondary { background: rgba(255,255,255,0.1); color: #e0e0e0; }
        .btn-secondary:hover { background: rgba(255,255,255,0.2); }
        .preset-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 16px; cursor: pointer; transition: all 0.2s; }
        .preset-card:hover { border-color: #3b82f6; background: rgba(59,130,246,0.1); }
        .preset-card.selected { border-color: #3b82f6; background: rgba(59,130,246,0.2); }
        .preset-name { font-weight: 600; margin-bottom: 4px; }
        .preset-desc { font-size: 12px; color: #8899a6; }
        .hidden { display: none; }
        .error { color: #ef4444; font-size: 12px; margin-top: 4px; }
        .success-msg { background: rgba(16,185,129,0.2); color: #10b981; padding: 12px; border-radius: 8px; text-align: center; }
        .loading { text-align: center; padding: 40px; }
        .spinner { width: 40px; height: 40px; border: 4px solid rgba(255,255,255,0.1); border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .channel-item { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; text-align: center; cursor: pointer; transition: all 0.2s; }
        .channel-item:hover { border-color: #3b82f6; }
        .channel-item.selected { border-color: #3b82f6; background: rgba(59,130,246,0.2); }
        .channel-icon { font-size: 32px; margin-bottom: 8px; }
        .optional-badge { background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px; font-size: 11px; margin-left: 8px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🦞</div>
            <h1>OpenClaw 配置向导</h1>
            <p class="subtitle">通过浏览器轻松配置您的 AI 助手</p>
        </div>

        <div id="app">
            <!-- Step 1: 选择模型提供商 -->
            <div id="step1" class="card">
                <div class="step-indicator">
                    <div class="step active">1</div>
                    <div class="step">2</div>
                    <div class="step">3</div>
                </div>
                <h2>选择 AI 模型提供商</h2>
                <p style="color: #8899a6; margin-bottom: 20px;">选择您要使用的 AI 服务，或输入自定义配置</p>

                <div class="grid-3">
                    <div class="preset-card" data-provider="deepseek">
                        <div class="preset-name">🇨🇳 DeepSeek</div>
                        <div class="preset-desc">高性价比，推荐</div>
                    </div>
                    <div class="preset-card" data-provider="openai">
                        <div class="preset-name">🌐 OpenAI</div>
                        <div class="preset-desc">GPT-4o, GPT-4</div>
                    </div>
                    <div class="preset-card" data-provider="anthropic">
                        <div class="preset-name">🌐 Claude</div>
                        <div class="preset-desc">Anthropic</div>
                    </div>
                    <div class="preset-card" data-provider="kimi">
                        <div class="preset-name">🇨🇳 Kimi</div>
                        <div class="preset-desc">月之暗面</div>
                    </div>
                    <div class="preset-card" data-provider="glm">
                        <div class="preset-name">🇨🇳 智谱 GLM</div>
                        <div class="preset-desc">清华系</div>
                    </div>
                    <div class="preset-card" data-provider="qwen">
                        <div class="preset-name">🇨🇳 通义千问</div>
                        <div class="preset-desc">阿里云</div>
                    </div>
                    <div class="preset-card" data-provider="ollama">
                        <div class="preset-name">💻 Ollama</div>
                        <div class="preset-desc">本地运行</div>
                    </div>
                    <div class="preset-card" data-provider="custom">
                        <div class="preset-name">⚙️ 自定义</div>
                        <div class="preset-desc">手动配置</div>
                    </div>
                </div>
            </div>

            <!-- Step 2: 输入 API 配置 -->
            <div id="step2" class="card hidden">
                <div class="step-indicator">
                    <div class="step completed">1</div>
                    <div class="step active">2</div>
                    <div class="step">3</div>
                </div>
                <h2>配置 API</h2>

                <div class="form-group">
                    <label>API 地址</label>
                    <input type="text" id="apiUrl" placeholder="https://api.deepseek.com/v1">
                    <div class="error" id="apiUrlError"></div>
                </div>

                <div class="form-group">
                    <label>API Key</label>
                    <input type="password" id="apiKey" placeholder="sk-...">
                    <div class="error" id="apiKeyError"></div>
                </div>

                <div class="form-group">
                    <label>模型 ID</label>
                    <input type="text" id="modelId" placeholder="deepseek-chat">
                    <div class="error" id="modelIdError"></div>
                </div>

                <div class="form-group">
                    <label>API 类型</label>
                    <select id="apiType">
                        <option value="openai-responses">OpenAI Compatible (openai-responses)</option>
                        <option value="anthropic-messages">Anthropic (anthropic-messages)</option>
                    </select>
                </div>

                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button class="btn btn-secondary" onclick="backToStep1()">上一步</button>
                    <button class="btn btn-primary" onclick="goToStep3()">下一步</button>
                </div>
            </div>

            <!-- Step 3: 聊天渠道 -->
            <div id="step3" class="card hidden">
                <div class="step-indicator">
                    <div class="step completed">1</div>
                    <div class="step completed">2</div>
                    <div class="step active">3</div>
                </div>
                <h2>配置聊天渠道 <span class="optional-badge">可选</span></h2>
                <p style="color: #8899a6; margin-bottom: 20px;">选择您想使用的聊天平台，可跳过</p>

                <div class="grid-2">
                    <div class="channel-item" onclick="toggleChannel('telegram')">
                        <div class="channel-icon">📱</div>
                        <div>Telegram</div>
                    </div>
                    <div class="channel-item" onclick="toggleChannel('discord')">
                        <div class="channel-icon">🎮</div>
                        <div>Discord</div>
                    </div>
                    <div class="channel-item" onclick="toggleChannel('feishu')">
                        <div class="channel-icon">🪽</div>
                        <div>飞书/Lark</div>
                    </div>
                    <div class="channel-item" onclick="toggleChannel('none')">
                        <div class="channel-icon">⏭️</div>
                        <div>暂不配置</div>
                    </div>
                </div>

                <div id="channelConfig" class="hidden" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <div class="form-group">
                        <label id="channelLabel">Bot Token</label>
                        <input type="text" id="channelToken" placeholder="输入 Bot Token">
                        <div class="error" id="channelTokenError"></div>
                    </div>
                </div>

                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button class="btn btn-secondary" onclick="backToStep2()">上一步</button>
                    <button class="btn btn-success" onclick="saveAndStart()">保存并启动</button>
                </div>
            </div>

            <!-- Complete -->
            <div id="complete" class="card hidden">
                <div class="step-indicator">
                    <div class="step completed">1</div>
                    <div class="step completed">2</div>
                    <div class="step completed">3</div>
                </div>
                <div class="success-msg">
                    <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
                    <h2>配置完成！</h2>
                    <p style="margin-top: 10px;">OpenClaw 正在启动...</p>
                </div>
            </div>

            <!-- Loading -->
            <div id="loading" class="card hidden">
                <div class="loading">
                    <div class="spinner"></div>
                    <p>正在处理...</p>
                </div>
            </div>
        </div>
    </div>

    <script>
        let currentStep = 1;
        let selectedProvider = '';
        let selectedChannel = '';

        // 预设配置
        const presets = {
            deepseek: { url: 'https://api.deepseek.com/v1', model: 'deepseek-chat', type: 'openai-responses' },
            openai: { url: 'https://api.openai.com/v1', model: 'gpt-4o', type: 'openai-responses' },
            anthropic: { url: 'https://api.anthropic.com', model: 'claude-sonnet-4-20250514', type: 'anthropic-messages' },
            kimi: { url: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k', type: 'openai-responses' },
            glm: { url: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4', type: 'openai-responses' },
            qwen: { url: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-turbo', type: 'openai-responses' },
            ollama: { url: 'http://127.0.0.1:11434/v1', model: 'llama3', type: 'openai-responses' },
            custom: { url: '', model: '', type: 'openai-responses' }
        };

        // 预设卡片点击
        document.querySelectorAll('.preset-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                selectedProvider = card.dataset.provider;

                const preset = presets[selectedProvider];
                document.getElementById('apiUrl').value = preset.url || '';
                document.getElementById('modelId').value = preset.model || '';
                document.getElementById('apiType').value = preset.type || 'openai-responses';

                if (selectedProvider !== 'custom') {
                    goToStep2();
                }
            });
        });

        function showStep(num) {
            document.querySelectorAll('.card').forEach(c => c.classList.add('hidden'));
            document.getElementById('step' + num).classList.remove('hidden');
            currentStep = num;
        }

        function goToStep2() {
            showStep(2);
        }

        function backToStep1() {
            showStep(1);
        }

        function goToStep3() {
            // 验证输入
            let valid = true;
            const apiUrl = document.getElementById('apiUrl').value.trim();
            const apiKey = document.getElementById('apiKey').value.trim();
            const modelId = document.getElementById('modelId').value.trim();

            if (!apiUrl) { document.getElementById('apiUrlError').textContent = '请输入 API 地址'; valid = false; }
            else { document.getElementById('apiUrlError').textContent = ''; }
            if (!apiKey) { document.getElementById('apiKeyError').textContent = '请输入 API Key'; valid = false; }
            else { document.getElementById('apiKeyError').textContent = ''; }
            if (!modelId) { document.getElementById('modelIdError').textContent = '请输入模型 ID'; valid = false; }
            else { document.getElementById('modelIdError').textContent = ''; }

            if (valid) showStep(3);
        }

        function backToStep2() {
            showStep(2);
        }

        function toggleChannel(channel) {
            document.querySelectorAll('.channel-item').forEach(c => c.classList.remove('selected'));
            event.currentTarget.classList.add('selected');
            selectedChannel = channel;

            const configDiv = document.getElementById('channelConfig');
            const label = document.getElementById('channelLabel');

            if (channel === 'none') {
                configDiv.classList.add('hidden');
            } else {
                configDiv.classList.remove('hidden');
                if (channel === 'telegram') label.textContent = 'Telegram Bot Token';
                else if (channel === 'discord') label.textContent = 'Discord Bot Token';
                else if (channel === 'feishu') label.textContent = '飞书 App ID';
            }
        }

        async function saveAndStart() {
            const config = {
                agent: { workspace: '~/.openclaw/workspace', model: { primary: 'custom/' + document.getElementById('modelId').value } },
                models: {
                    mode: 'merge',
                    providers: {
                        custom: {
                            baseUrl: document.getElementById('apiUrl').value,
                            apiKey: document.getElementById('apiKey').value,
                            api: document.getElementById('apiType').value,
                            models: [{
                                id: document.getElementById('modelId').value,
                                name: document.getElementById('modelId').value,
                                reasoning: false,
                                input: ['text'],
                                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                                contextWindow: 128000,
                                maxTokens: 8192
                            }]
                        }
                    }
                },
                session: { dmScope: 'per-channel-peer' }
            };

            // 添加渠道配置
            const channelToken = document.getElementById('channelToken').value.trim();
            if (selectedChannel && selectedChannel !== 'none' && channelToken) {
                if (selectedChannel === 'telegram') {
                    config.channels = {
                        telegram: { enabled: true, botToken: channelToken, dmPolicy: 'pairing', groupPolicy: 'open' }
                    };
                } else if (selectedChannel === 'discord') {
                    config.channels = {
                        discord: { enabled: true, token: channelToken, dmPolicy: 'pairing' }
                    };
                } else if (selectedChannel === 'feishu') {
                    config.channels = {
                        feishu: { enabled: true, domain: 'feishu', accounts: { default: { appId: channelToken, domain: 'feishu' } } }
                    };
                }
            }

            document.getElementById('step3').classList.add('hidden');
            document.getElementById('loading').classList.remove('hidden');

            try {
                const response = await fetch('/api/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(config)
                });
                const result = await response.json();

                if (result.success) {
                    document.getElementById('loading').classList.add('hidden');
                    document.getElementById('complete').classList.remove('hidden');
                } else {
                    alert('保存失败: ' + result.error);
                    document.getElementById('loading').classList.add('hidden');
                    document.getElementById('step3').classList.remove('hidden');
                }
            } catch (e) {
                alert('保存失败: ' + e.message);
                document.getElementById('loading').classList.add('hidden');
                document.getElementById('step3').classList.remove('hidden');
            }
        }
    </script>
</body>
</html>
`;

const PRESETS = {
    deepseek: { url: 'https://api.deepseek.com/v1', model: 'deepseek-chat', type: 'openai-responses' },
    openai: { url: 'https://api.openai.com/v1', model: 'gpt-4o', type: 'openai-responses' },
    anthropic: { url: 'https://api.anthropic.com', model: 'claude-sonnet-4-20250514', type: 'anthropic-messages' },
    kimi: { url: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k', type: 'openai-responses' },
    glm: { url: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4', type: 'openai-responses' },
    qwen: { url: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-turbo', type: 'openai-responses' },
    ollama: { url: 'http://127.0.0.1:11434/v1', model: 'llama3', type: 'openai-responses' },
    custom: { url: '', model: '', type: 'openai-responses' }
};

// 创建配置目录
function ensureConfigDir() {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    if (!fs.existsSync(path.join(CONFIG_DIR, 'workspace'))) {
        fs.mkdirSync(path.join(CONFIG_DIR, 'workspace'), { recursive: true });
    }
}

// 保存配置
function saveConfig(config) {
    ensureConfigDir();
    const configContent = `
{
  agent: {
    workspace: "~/.openclaw/workspace",
    model: { primary: "custom/${config.modelId}" }
  },
  models: {
    mode: "merge",
    providers: {
      "custom": {
        baseUrl: "${config.apiUrl}",
        apiKey: "${config.apiKey}",
        api: "${config.apiType}",
        models: [
          {
            id: "${config.modelId}",
            name: "${config.modelId}",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 128000,
            maxTokens: 8192
          }
        ]
      }
    }
  },
  ${config.channels ? `channels: ${JSON.stringify(config.channels)},` : ''}
  session: {
    dmScope: "per-channel-peer"
  }
}
`;
    fs.writeFileSync(CONFIG_FILE, configContent.trim() + '\n');
    return true;
}

// 启动 OpenClaw Gateway
function startGateway() {
    try {
        const result = execSync('openclaw gateway start', {
            encoding: 'utf8',
            stdio: 'ignore',
            timeout: 5000
        });
        return true;
    } catch (e) {
        // 尝试后台启动
        try {
            const { spawn } = require('child_process');
            spawn('openclaw', ['gateway'], {
                detached: true,
                stdio: 'ignore',
                shell: true
            }).unref();
            return true;
        } catch (e2) {
            return false;
        }
    }
}

// HTTP 服务器
const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(HTML);
    } else if (req.url === '/api/save' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const config = JSON.parse(body);

                // 提取配置
                const modelConfig = {
                    apiUrl: config.models.providers.custom.baseUrl,
                    apiKey: config.models.providers.custom.apiKey,
                    apiType: config.models.providers.custom.api,
                    modelId: config.models.providers.custom.models[0].id,
                    channels: config.channels
                };

                saveConfig(modelConfig);

                setTimeout(() => {
                    const started = startGateway();

                    // 标记配置完成
                    try {
                        fs.writeFileSync(
                            path.join(os.homedir(), '.openclaw', 'web-config-done'),
                            JSON.stringify({ timestamp: Date.now(), gatewayStarted: started })
                        );
                    } catch (e) {}

                    // 关闭服务器
                    server.close(() => {
                        console.log('\n✓ 配置已完成，Web 服务器关闭');
                        process.exit(0);
                    });

                    // 5秒后强制退出
                    setTimeout(() => process.exit(0), 5000);
                }, 1000);

                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: true }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, error: e.message }));
            }
        });
    } else if (req.url === '/api/status') {
        const exists = fs.existsSync(CONFIG_FILE);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ configured: exists }));
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`\n========================================`);
    console.log(`  OpenClaw Web Configuration Server`);
    console.log(`========================================`);
    console.log(`\n请打开浏览器访问:`);
    console.log(`  http://127.0.0.1:${PORT}`);
    console.log(`\n配置完成后将自动启动 OpenClaw Gateway`);
    console.log(`\n按 Ctrl+C 停止服务器`);
    console.log(`========================================\n`);

    // 自动打开浏览器
    try {
        const { spawn } = require('child_process');
        const url = `http://127.0.0.1:${PORT}`;
        switch (process.platform) {
            case 'darwin':
                spawn('open', [url]);
                break;
            case 'win32':
                spawn('cmd', ['/c', 'start', url]);
                break;
            default:
                spawn('xdg-open', [url]);
        }
    } catch (e) {
        // 忽略错误
    }
});
