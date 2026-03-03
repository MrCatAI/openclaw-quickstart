#!/usr/bin/env node

/**
 * OpenClaw Web Configuration Wizard
 * Complete setup: Models · Channels · Skills
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, spawn } = require('child_process');

const CONFIG_DIR = path.join(os.homedir(), '.openclaw');
const CONFIG_FILE = path.join(CONFIG_DIR, 'openclaw.json');
const PORT = 18792;

process.env.NODE_ENV = 'production';

// ============================================
// Configuration Data
// ============================================

const PROVIDERS = {
    zai: {
        name: 'Z.AI / GLM',
        fullName: 'Zhipu AI GLM Models',
        desc: 'GLM-5 (744B MoE) / GLM-4.7',
        detail: 'OpenAI & Claude format support',
        icon: '🔷',
        formats: [
            { id: 'openai-completions', name: 'OpenAI Format', recommended: true, url: 'https://open.bigmodel.cn/api/paas/v4', models: ['glm-5', 'glm-4.7', 'glm-4.7-flash', 'glm-4.5-flash'], endpoints: { 'CN': 'https://open.bigmodel.cn/api/paas/v4', 'Global': 'https://api.z.ai/api/paas/v4', 'Coding-CN': 'https://open.bigmodel.cn/api/coding/paas/v4', 'Coding-Global': 'https://api.z.ai/api/coding/paas/v4' }, defaultEndpoint: 'CN' },
            { id: 'anthropic-messages', name: 'Claude Format', recommended: false, url: 'https://open.bigmodel.cn/api/anthropic', models: ['glm-5', 'glm-4.7', 'glm-4.5-flash'], endpoints: { 'CN': 'https://open.bigmodel.cn/api/anthropic' }, defaultEndpoint: 'CN' }
        ],
        keyUrl: 'https://open.bigmodel.cn/console/apikey',
        docUrl: 'https://open.bigmodel.cn/dev/howuse/anthropic',
        note: 'GLM supports both formats. OpenAI format recommended for best compatibility.'
    },
    minimax: {
        name: 'MiniMax',
        fullName: 'MiniMax M2.5',
        desc: 'M2.5 (456B)',
        detail: 'Claude format compatible',
        icon: '🔴',
        formats: [
            { id: 'anthropic-messages', name: 'Claude Format', recommended: true, url: 'https://api.minimax.io/anthropic', models: ['MiniMax-M2.5', 'MiniMax-M2.1', 'MiniMax-M2.5-Lightning'], endpoints: { 'Global': 'https://api.minimax.io/anthropic', 'CN': 'https://api.minimaxi.com/anthropic' }, defaultEndpoint: 'Global' }
        ],
        keyUrl: 'https://api.minimaxi.com',
        docUrl: 'https://www.minimaxi.com'
    },
    moonshot: {
        name: 'Kimi',
        fullName: 'Moonshot AI Kimi',
        desc: 'K2.5 (1T params)',
        detail: 'OpenAI format compatible',
        icon: '🌙',
        formats: [
            { id: 'openai-completions', name: 'OpenAI Format', recommended: true, url: 'https://api.moonshot.ai/v1', models: ['kimi-k2.5', 'kimi-k2-thinking', 'kimi-k2-turbo-preview'], endpoints: { 'Global': 'https://api.moonshot.ai/v1', 'CN': 'https://api.moonshot.cn/v1' }, defaultEndpoint: 'CN' }
        ],
        keyUrl: 'https://platform.moonshot.cn/console/api-keys',
        docUrl: 'https://platform.moonshot.cn/docs/intro'
    },
    kimiCoding: {
        name: 'Kimi Coding',
        fullName: 'Kimi for Coding',
        desc: 'K2P5 Coding Model',
        detail: 'Claude format compatible',
        icon: '💻',
        formats: [
            { id: 'anthropic-messages', name: 'Claude Format', recommended: true, url: 'https://api.kimi.com/coding/', models: ['k2p5'], endpoints: { 'Default': 'https://api.kimi.com/coding/' }, defaultEndpoint: 'Default' }
        ],
        keyUrl: 'https://kimi-code.moonshot.cn',
        docUrl: 'https://kimi-code.moonshot.cn'
    },
    deepseek: {
        name: 'DeepSeek',
        fullName: 'DeepSeek V3.2',
        desc: 'V3.2 (340B MoE)',
        detail: 'OpenAI format compatible',
        icon: '🔵',
        formats: [
            { id: 'openai-completions', name: 'OpenAI Format', recommended: true, url: 'https://api.deepseek.com/v1', models: ['deepseek-chat', 'deepseek-reasoner', 'deepseek-v3'] }
        ],
        keyUrl: 'https://platform.deepseek.com/api_keys',
        docUrl: 'https://platform.deepseek.com/api-docs'
    },
    qwen: {
        name: 'Qwen',
        fullName: 'Alibaba Qwen',
        desc: 'Qwen 3.5 Max',
        detail: 'OpenAI format compatible',
        icon: '🟢',
        formats: [
            { id: 'openai-completions', name: 'OpenAI Format', recommended: true, url: 'https://dashscope.aliyuncs.com/compatible-mode/v1', models: ['qwen3.5-max', 'qwen3.5-turbo', 'qwq-32b'] }
        ],
        keyUrl: 'https://dashscope.console.aliyun.com/apiKey',
        docUrl: 'https://help.aliyun.com/zh/model-studio'
    },
    stepfun: {
        name: 'StepFun',
        fullName: 'StepFun Step-3.5',
        desc: 'Step-3.5 Flash (196B)',
        detail: 'Claude & OpenAI format',
        icon: '🌸',
        formats: [
            { id: 'anthropic-messages', name: 'Claude Format', recommended: true, url: 'https://api.stepfun.ai/anthropic', models: ['step-3.5-flash', 'step-3.5-medium'] },
            { id: 'openai-completions', name: 'OpenAI Format', recommended: false, url: 'https://api.stepfun.ai/v1', models: ['step-3.5-flash', 'step-3.5-medium'] }
        ],
        keyUrl: 'https://platform.stepfun.com',
        docUrl: 'https://github.com/stepfun-ai/Step-3.5',
        note: 'StepFun supports both formats. Claude format recommended.'
    },
    volcengine: {
        name: 'Volcengine',
        fullName: 'Volcano Engine Ark',
        desc: 'Doubao / Multi-model',
        detail: 'OpenAI & Claude format',
        icon: '🌋',
        formats: [
            { id: 'openai-completions', name: 'OpenAI Format', recommended: true, url: 'https://ark.cn-beijing.volces.com/api/coding/v3', models: ['doubao-seed-code-latest', 'glm-4.7', 'deepseek-v3', 'kimi-k2-thinking'] },
            { id: 'anthropic-messages', name: 'Claude Format (Preview)', recommended: false, url: 'https://ark.cn-beijing.volces.com/api/coding', models: ['doubao-seed-code-preview-latest'] }
        ],
        keyUrl: 'https://console.volcengine.com/ark',
        docUrl: 'https://www.volcengine.com/docs/ark',
        note: 'Volcengine Coding Plan supports multiple AI models via single subscription.'
    },
    openai: {
        name: 'OpenAI',
        fullName: 'OpenAI GPT',
        desc: 'GPT-4.1 / o3-mini',
        detail: 'Official OpenAI API',
        icon: '🤖',
        formats: [
            { id: 'openai-completions', name: 'OpenAI Format', recommended: true, url: 'https://api.openai.com/v1', models: ['gpt-4.1', 'o3-mini', 'gpt-4o'] }
        ],
        keyUrl: 'https://platform.openai.com/api-keys',
        docUrl: 'https://platform.openai.com/docs'
    },
    anthropic: {
        name: 'Anthropic',
        fullName: 'Anthropic Claude',
        desc: 'Claude 4.6 Sonnet / Opus',
        detail: 'Official Anthropic API',
        icon: '🧠',
        formats: [
            { id: 'anthropic-messages', name: 'Claude Format', recommended: true, url: 'https://api.anthropic.com', models: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-4-6'] }
        ],
        keyUrl: 'https://console.anthropic.com/settings/keys',
        docUrl: 'https://docs.anthropic.com'
    },
    xai: {
        name: 'xAI',
        fullName: 'xAI Grok',
        desc: 'Grok-4',
        detail: 'OpenAI format compatible',
        icon: '⚫',
        formats: [
            { id: 'openai-completions', name: 'OpenAI Format', recommended: true, url: 'https://api.x.ai/v1', models: ['grok-4'] }
        ],
        keyUrl: 'https://console.x.ai',
        docUrl: 'https://docs.x.ai'
    }
};

const CHANNELS = {
    telegram: {
        name: 'Telegram',
        icon: '📱',
        desc: 'Popular messaging app',
        detail: 'Create bot via @BotFather',
        color: '#0088CC',
        setupUrl: 'https://core.telegram.org/bots/tutorial',
        fields: [
            { key: 'botToken', label: 'Bot Token', placeholder: '1234567890:ABC...', help: 'Get from @BotFather with /newbot' }
        ],
        dmPolicy: 'pairing'
    },
    discord: {
        name: 'Discord',
        icon: '🎮',
        desc: 'Gaming & dev community',
        detail: 'Create Discord app',
        color: '#5865F2',
        setupUrl: 'https://discord.com/developers/applications',
        fields: [
            { key: 'token', label: 'Bot Token', placeholder: 'MTAw...', help: 'From Discord Developer Portal -> Bot' }
        ],
        dmPolicy: 'pairing'
    },
    feishu: {
        name: 'Feishu/Lark',
        icon: '🪽',
        desc: 'Enterprise collaboration',
        detail: 'Create self-built app',
        color: '#3370FF',
        setupUrl: 'https://open.feishu.cn/app',
        fields: [
            { key: 'appId', label: 'App ID', placeholder: 'cli_xxx...', help: 'From Feishu Open Platform' },
            { key: 'appSecret', label: 'App Secret', placeholder: '...', help: 'From Feishu Open Platform' }
        ],
        dmPolicy: 'pairing',
        pluginName: 'feishu'
    },
    slack: {
        name: 'Slack',
        icon: '💼',
        desc: 'Team collaboration',
        detail: 'Create Slack App',
        color: '#4A154B',
        setupUrl: 'https://api.slack.com/apps',
        fields: [
            { key: 'botToken', label: 'Bot Token', placeholder: 'xoxb-...', help: 'From Slack App config -> OAuth Tokens' },
            { key: 'appToken', label: 'App Token (Optional)', placeholder: 'xapp-...', help: 'For Socket Mode (optional)' }
        ],
        dmPolicy: 'pairing'
    }
};

const SKILLS = [
    { id: 'weather', name: 'Weather', desc: 'Real-time weather', emoji: '🌤️' },
    { id: 'summarize', name: 'Summarize', desc: 'Auto content summary', emoji: '📝' },
    { id: 'voice-call', name: 'Voice', desc: 'Voice input/output', emoji: '🎤' },
    { id: 'canvas', name: 'Canvas', desc: 'Visual workspace', emoji: '🎨' }
];

// ============================================
// HTML Template (without embedded template literals)
// ============================================

function generateHTML() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>OpenClaw Configuration</title>
<link href="https://fonts.googleapis.com/css2?family=VT323&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--green:#7CBD6E;--green-dark:#4A8A4F;--green-light:#A8D898;--stone:#D4D4D4;--stone-dark:#8B8B8B;--stone-light:#E8E8E8;--text:#2D2D2D;--text-light:#FFFFFF;--border:#3D3D3D}
body{font-family:'VT323',monospace;background:linear-gradient(180deg,#87CEEB 0%,#87CEEB 40%,#7CBD6E 40%,#7CBD6E 100%);min-height:100vh;color:var(--text);font-size:20px;line-height:1.4;display:flex;align-items:center;justify-content:center}
.app-container{width:92vw;height:92vh;max-width:1600px;background:#E0E0E0;border:6px solid var(--border);box-shadow:12px 12px 0 rgba(0,0,0,0.4);display:flex;flex-direction:column}
.header{padding:20px 35px;background:linear-gradient(180deg,#7CBD6E 0%,#5DA856 100%);border-bottom:6px solid var(--border);display:flex;align-items:center;gap:20px}
.logo{width:60px;height:60px;background:var(--green-light);border:4px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:36px}
.title-box h1{font-size:42px;color:var(--text-light);text-shadow:3px 3px 0 rgba(0,0,0,0.3)}
.progress{display:flex;gap:12px;padding:10px 35px;background:var(--stone-light);border-bottom:4px solid var(--stone-dark)}
.progress-step{width:32px;height:32px;border:3px solid var(--stone-dark);background:var(--stone);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:bold}
.progress-step.active{background:var(--green);border-color:var(--green-dark);color:var(--text-light);box-shadow:0 0 0 3px var(--green-light)}
.progress-step.done{background:var(--green-dark);border-color:var(--green-dark);color:var(--text-light)}
.content{flex:1;overflow-y:auto;padding:20px 35px}
.page{display:none}
.page.active{display:block}
.page-title{font-size:32px;margin-bottom:6px;display:flex;align-items:center;gap:10px}
.page-title::before{content:'>>';color:var(--green-dark)}
.page-subtitle{font-size:18px;color:#666;margin-bottom:20px}
.provider-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.provider-card{padding:18px;background:var(--stone-light);border:3px solid var(--stone-dark);cursor:pointer;transition:all 0.12s;position:relative;text-align:center;min-height:120px;display:flex;flex-direction:column;justify-content:center;align-items:center}
.provider-card:hover{transform:translate(-2px,-2px);box-shadow:4px 4px 0 rgba(0,0,0,0.3);border-color:var(--green)}
.provider-card.selected{background:var(--green-light);border-color:var(--green-dark);box-shadow:4px 4px 0 rgba(0,0,0,0.3)}
.provider-card.selected::after{content:'✓';position:absolute;top:5px;right:5px;width:20px;height:20px;background:var(--green-dark);color:var(--text-light);display:flex;align-items:center;justify-content:center;font-size:14px}
.provider-icon{font-size:32px;margin-bottom:6px}
.provider-name{font-size:18px;font-weight:bold;margin-bottom:4px}
.provider-desc{font-size:14px;color:#444}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
.form-group{margin-bottom:16px}
.form-group.full{grid-column:1/-1}
label{display:block;font-size:18px;margin-bottom:6px;color:var(--text);font-weight:bold}
input,select{width:100%;padding:10px 14px;font-size:18px;font-family:inherit;background:#FFF;border:3px solid var(--stone-dark);color:var(--text)}
input:focus,select:focus{outline:none;border-color:var(--green);background:#FAFFFA}
.info-box{background:var(--green-light);border:3px solid var(--green-dark);padding:12px 16px;margin-bottom:16px}
.info-box a{color:#2A5A2F;text-decoration:none}
.provider-note{background:#FEF3C7;border:2px solid #F59E0B;padding:10px 14px;margin-bottom:16px;font-size:14px;border-radius:4px}
.format-btns{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
.format-btn{position:relative;padding:8px 16px;font-size:18px;font-family:inherit;background:var(--stone-light);border:3px solid var(--stone-dark);cursor:pointer;transition:all 0.12s}
.format-btn:hover{border-color:var(--green)}
.format-btn.selected{background:var(--green);border-color:var(--green-dark);color:var(--text-light)}
.format-badge{position:absolute;top:-5px;right:-5px;background:#EF4444;color:var(--text-light);font-size:9px;padding:1px 5px;border-radius:6px;font-weight:bold}
.endpoint-select{margin-bottom:12px}
.format-info{font-size:13px;color:#666;margin-top:4px}
.footer{padding:16px 35px;background:var(--stone-light);border-top:4px solid var(--stone-dark);display:flex;justify-content:space-between;align-items:center}
.btn{padding:10px 32px;font-size:20px;font-family:inherit;cursor:pointer;background:linear-gradient(180deg,#A0A0A0 0%,#808080 100%);border:3px solid var(--border);color:var(--text-light);transition:all 0.12s}
.btn:hover{transform:translate(-2px,-2px);box-shadow:4px 4px 0 rgba(0,0,0,0.3)}
.btn-primary{background:linear-gradient(180deg,#7CBD6E 0%,#5DA856 100%);border-color:var(--green-dark)}
.error{color:#C41E3A;font-size:14px;margin-top:3px}
.channel-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:12px}
.channel-card{padding:25px 16px;background:var(--stone-light);border:3px solid var(--stone-dark);text-align:center;cursor:pointer;transition:all 0.12s}
.channel-card:hover{transform:translate(-2px,-2px);box-shadow:4px 4px 0 rgba(0,0,0,0.3);border-color:var(--green)}
.channel-card.selected{background:var(--green-light);border-color:var(--green-dark)}
.channel-icon{font-size:40px;margin-bottom:6px}
.channel-name{font-size:18px;font-weight:bold}
.channel-desc{font-size:14px;color:#666;margin-top:4px}
.channel-fields{margin-top:20px}
.channel-field{margin-bottom:12px;text-align:left}
.channel-field label{font-size:16px;margin-bottom:4px}
.channel-field input{padding:8px 12px;font-size:16px}
.channel-help{font-size:12px;color:#666;margin-top:3px}
.skill-list{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
.skill-item{padding:12px;background:var(--stone-light);border:3px solid var(--stone-dark);display:flex;align-items:center;gap:10px;cursor:pointer}
.skill-item:hover{border-color:var(--green)}
.skill-item.selected{background:var(--green-light);border-color:var(--green-dark)}
.skill-checkbox{width:18px;height:18px;border:2px solid var(--stone-dark);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
.skill-checkbox.checked{background:var(--green);border-color:var(--green-dark);color:var(--text-light)}
.skill-info{flex:1}
.skill-emoji{font-size:24px;margin-right:6px}
.skill-name{font-size:18px;font-weight:bold}
.skill-desc{font-size:13px;color:#666}
.success{text-align:center;padding:50px 20px}
.success-icon{width:80px;height:80px;margin:0 auto 20px;background:var(--green);border:4px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:44px;color:var(--text-light);box-shadow:5px 5px 0 rgba(0,0,0,0.3)}
.success-links{margin-top:24px;display:flex;flex-direction:column;gap:10px}
.success-link{display:block;padding:10px 20px;background:var(--stone-light);border:3px solid var(--stone-dark);color:var(--text);text-decoration:none;font-size:18px}
.success-link:hover{border-color:var(--green);background:var(--green-light)}
</style>
</head>
<body>
<div class="app-container">
    <div class="header">
        <div class="logo">🦞</div>
        <div class="title-box">
            <h1>OPENCLAW CONFIG WIZARD</h1>
            <p>Models · Channels · Skills</p>
        </div>
    </div>
    <div class="progress">
        <div class="progress-step active" id="prog1">1</div>
        <div class="progress-step" id="prog2">2</div>
        <div class="progress-step" id="prog3">3</div>
        <div class="progress-step" id="prog4">4</div>
    </div>
    <div class="content">
        <div class="page active" id="page1">
            <div class="page-title">Select AI Provider</div>
            <div class="page-subtitle">Choose your AI model provider</div>
            <div class="provider-grid" id="providerGrid"></div>
        </div>
        <div class="page" id="page2">
            <div class="page-title">Configure API Connection</div>
            <div class="page-subtitle">Select format and enter credentials</div>
            <div class="info-box">
                <div style="font-size:20px;margin-bottom:4px" id="providerName">-</div>
                <div style="font-size:16px" id="providerDesc"></div>
                <a href="#" target="_blank" id="keyLink">Get API Key →</a>
                <span style="margin:0 6px;color:#666">|</span>
                <a href="#" target="_blank" id="docLink">Documentation →</a>
            </div>
            <div id="providerNote" class="provider-note" style="display:none"></div>
            <div class="form-group full">
                <label>API Format</label>
                <div style="font-size:13px;color:#666;margin-bottom:6px">Choose the API format based on your compatibility needs.</div>
                <div class="format-btns" id="formatBtns"></div>
            </div>
            <div class="form-group full" id="endpointGroup" style="display:none">
                <label>Endpoint</label>
                <select id="endpointSelect" class="endpoint-select"></select>
                <div class="format-info" id="endpointInfo"></div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>API URL</label>
                    <input type="text" id="apiUrl" placeholder="Auto-filled, editable">
                    <div class="error" id="urlError"></div>
                </div>
                <div class="form-group">
                    <label>API Key</label>
                    <input type="password" id="apiKey" placeholder="Paste your API key">
                    <div class="error" id="keyError"></div>
                </div>
            </div>
            <div class="form-group full">
                <label>Model ID</label>
                <input type="text" id="modelId" list="modelList" placeholder="Select or enter model ID">
                <datalist id="modelList"></datalist>
                <div class="error" id="modelError"></div>
            </div>
        </div>
        <div class="page" id="page3">
            <div class="page-title">Configure Channels (Optional)</div>
            <div class="page-subtitle">Add chat platforms for OpenClaw</div>
            <div class="info-box">
                <div style="font-size:14px">Tip: You can add channels later with <code>openclaw channels add</code></div>
            </div>
            <div class="channel-grid" id="channelGrid"></div>
            <div id="channelFields" style="display:none">
                <div class="page-title" style="font-size:22px;margin-top:20px" id="channelConfigTitle">Configure Channel</div>
                <div id="channelFieldsContainer"></div>
            </div>
        </div>
        <div class="page" id="page4">
            <div class="page-title">Install Skills (Optional)</div>
            <div class="page-subtitle">Select optional extensions to install</div>
            <div class="info-box">
                <div style="font-size:14px">Skills add extra capabilities like weather, voice, etc.</div>
            </div>
            <div class="skill-list" id="skillList"></div>
        </div>
        <div class="page" id="page5">
            <div class="success">
                <div class="success-icon">✓</div>
                <div class="page-title" style="justify-content:center;font-size:32px">Configuration Complete!</div>
                <div class="page-subtitle">OpenClaw is starting...</div>
                <div class="success-links">
                    <a href="http://127.0.0.1:18789" target="_blank" class="success-link">🌐 Open Web Dashboard</a>
                    <a href="#" onclick="copyCommands()" class="success-link">📋 Copy Commands</a>
                </div>
            </div>
        </div>
    </div>
    <div class="footer" id="footer">
        <button class="btn" id="btnBack" style="visibility:hidden">← Back</button>
        <button class="btn btn-primary" id="btnNext">Next →</button>
    </div>
</div>
<script>
const providers=${JSON.stringify(PROVIDERS)};
const channels=${JSON.stringify(CHANNELS)};
const skills=${JSON.stringify(SKILLS)};

let currentPage=1;
let selectedProvider='';
let selectedFormat=null;
let selectedFormats={};
let selectedChannels=[];
let selectedSkills=[];
let channelConfigs={};

function init(){
    renderProviders();
    renderChannels();
    renderSkills();
    setupEventListeners();
    console.log('OpenClaw Config Wizard initialized');
    console.log('Available providers:', Object.keys(providers));
}

function renderProviders(){
    const grid=document.getElementById('providerGrid');
    if(!grid){console.error('providerGrid not found');return}

    let html='';
    for(const [id,p] of Object.entries(providers)){
        html+='<div class="provider-card" data-provider="'+id+'">';
        html+='<div class="provider-icon">'+(p.icon||'🔷')+'</div>';
        html+='<div class="provider-name">'+p.name+'</div>';
        html+='<div class="provider-desc">'+p.desc+'</div>';
        html+='</div>';
    }
    grid.innerHTML=html;

    const cards=grid.querySelectorAll('.provider-card');
    cards.forEach(card=>{
        card.addEventListener('click',function(){
            document.querySelectorAll('.provider-card').forEach(c=>c.classList.remove('selected'));
            this.classList.add('selected');
            selectedProvider=this.dataset.provider;
            console.log('Selected provider:', selectedProvider);
            showPage(2);
            loadProvider(selectedProvider);
        });
    });
}

function loadProvider(id){
    const p=providers[id];
    if(!p){console.error('Provider not found:',id);return}

    document.getElementById('providerName').textContent=p.fullName;
    document.getElementById('providerDesc').textContent=p.desc+' - '+p.detail;

    const keyLink=document.getElementById('keyLink');
    const docLink=document.getElementById('docLink');
    if(p.keyUrl){
        keyLink.href=p.keyUrl;
        keyLink.style.display='inline';
    }else{
        keyLink.style.display='none';
    }
    if(p.docUrl){
        docLink.href=p.docUrl;
        docLink.style.display='inline';
    }else{
        docLink.style.display='none';
    }

    const noteBox=document.getElementById('providerNote');
    if(p.note){
        noteBox.textContent=p.note;
        noteBox.style.display='block';
    }else{
        noteBox.style.display='none';
    }

    const btns=document.getElementById('formatBtns');
    btns.innerHTML='';

    if(p.formats&&p.formats.length>0){
        selectedFormats[id]=p.formats[0].id;

        for(let i=0;i<p.formats.length;i++){
            const f=p.formats[i];
            const btn=document.createElement('button');
            btn.className='format-btn';
            btn.dataset.formatId=f.id;

            let btnHtml='<span>'+f.name+'</span>';
            if(f.recommended){
                btnHtml+='<span class="format-badge">REC</span>';
            }
            btn.innerHTML=btnHtml;

            btn.addEventListener('click',(function(fmtId,button){
                return function(){
                    selectFormat(fmtId,button);
                };
            })(f.id,btn));

            btns.appendChild(btn);

            if(i===0){
                setTimeout(()=>selectFormat(f.id,btn),50);
            }
        }
    }

    console.log('Loaded provider:', id, 'with formats:', p.formats);
}

function selectFormat(formatId,btn){
    if(!btn){console.error('Button is null for format:', formatId);return}

    selectedFormats[selectedProvider]=formatId;

    document.querySelectorAll('.format-btn').forEach(b=>b.classList.remove('selected'));
    btn.classList.add('selected');

    const p=providers[selectedProvider];
    const f=p.formats.find(fmt=>fmt.id===formatId);
    if(!f){console.error('Format not found:', formatId);return}

    console.log('Selected format:', formatId, f);

    const endpointGroup=document.getElementById('endpointGroup');
    const endpointSelect=document.getElementById('endpointSelect');
    const endpointInfo=document.getElementById('endpointInfo');
    const apiUrlInput=document.getElementById('apiUrl');
    const modelInput=document.getElementById('modelId');

    if(f.endpoints&&Object.keys(f.endpoints).length>0){
        endpointGroup.style.display='block';

        let endpointHtml='';
        const endpoints=Object.entries(f.endpoints);
        const defaultEndpoint=f.defaultEndpoint||endpoints[0][0];

        for(let i=0;i<endpoints.length;i++){
            const [name,url]=endpoints[i];
            const selected=name===defaultEndpoint?'selected':'';
            endpointHtml+='<option value="'+name+'"'+selected+'>'+name+'</option>';
        }
        endpointSelect.innerHTML=endpointHtml;

        function updateEndpointInfo(){
            const name=endpointSelect.value;
            const url=f.endpoints[name];
            if(url){
                const shortUrl=url.replace('https://','').replace('http://','').split('/')[0];
                endpointInfo.textContent='Connecting to: '+shortUrl;
                apiUrlInput.value=url;
            }
        }

        updateEndpointInfo();
        endpointSelect.onchange=updateEndpointInfo;
    }else{
        endpointGroup.style.display='none';
        endpointInfo.textContent='';
        apiUrlInput.value=f.url||'';
    }

    const dl=document.getElementById('modelList');
    dl.innerHTML='';
    if(f.models&&f.models.length>0){
        for(let i=0;i<f.models.length;i++){
            const opt=document.createElement('option');
            opt.value=f.models[i];
            dl.appendChild(opt);
        }
        modelInput.value=f.models[0];
        modelInput.placeholder='Example: '+f.models[0];
    }else{
        modelInput.value='';
       modelInput.placeholder='Enter model ID (e.g. gpt-4o)';
    }
}

function renderChannels(){
    const grid=document.getElementById('channelGrid');
    if(!grid){return}

    let html='';
    for(const [id,c] of Object.entries(channels)){
        html+='<div class="channel-card" data-channel="'+id+'">';
        html+='<div class="channel-icon">'+c.icon+'</div>';
        html+='<div class="channel-name">'+c.name+'</div>';
        html+='<div class="channel-desc">'+c.desc+'</div>';
        html+='</div>';
    }
    grid.innerHTML=html;

    const cards=grid.querySelectorAll('.channel-card');
    cards.forEach(card=>{
        card.addEventListener('click',function(){
            this.classList.toggle('selected');
            const id=this.dataset.channel;
            if(selectedChannels.includes(id)){
                selectedChannels=selectedChannels.filter(x=>x!==id);
                delete channelConfigs[id];
            }else{
                selectedChannels.push(id);
            }
            renderChannelFields();
        });
    });
}

function renderChannelFields(){
    const container=document.getElementById('channelFields');
    const fieldsContainer=document.getElementById('channelFieldsContainer');
    const title=document.getElementById('channelConfigTitle');

    if(selectedChannels.length===0){
        container.style.display='none';
        return;
    }

    container.style.display='block';
    title.textContent='Configure '+selectedChannels.map(id=>channels[id].name).join(' + ');

    let html='';
    for(const id of selectedChannels){
        const ch=channels[id];
        html+='<div style="margin-bottom:20px">';
        html+='<div style="font-size:20px;margin-bottom:10px;color:var(--green-dark)">';
        html+=ch.icon+' '+ch.name;
        html+='</div>';
        html+='<div style="font-size:14px;color:#666;margin-bottom:10px">';
        html+=ch.detail;
        html+='</div>';
        html+='<div style="margin-top:10px">';
        html+='<a href="'+ch.setupUrl+'" target="_blank" style="color:var(--green-dark);text-decoration:none">🔗 Setup Guide →</a>';
        html+='</div>';
        if(ch.fields){
            for(const field of ch.fields){
                html+='<div class="channel-field">';
                html+='<label>'+field.label+'</label>';
                html+='<input type="text" class="channel-input" data-channel="'+id+'" data-field="'+field.key+'" placeholder="'+field.placeholder+'">';
                html+='<div class="channel-help">'+field.help+'</div>';
                html+='</div>';
            }
        }
        html+='</div>';
    }
    fieldsContainer.innerHTML=html;

    fieldsContainer.querySelectorAll('.channel-input').forEach(input=>{
        input.addEventListener('input',function(){
            const ch=this.dataset.channel;
            const field=this.dataset.field;
            const val=this.value.trim();
            if(val){
                if(!channelConfigs[ch])channelConfigs[ch]={};
                channelConfigs[ch][field]=val;
            }
        });
    });
}

function renderSkills(){
    const list=document.getElementById('skillList');
    if(!list){return}

    let html='';
    for(const s of skills){
        html+='<div class="skill-item" data-skill="'+s.id+'">';
        html+='<div class="skill-checkbox">✓</div>';
        html+='<div class="skill-info">';
        html+='<div><span class="skill-emoji">'+s.emoji+'</span><span class="skill-name">'+s.name+'</span></div>';
        html+='<div class="skill-desc">'+s.desc+'</div>';
        html+='</div>';
        html+='</div>';
    }
    list.innerHTML=html;

    const items=list.querySelectorAll('.skill-item');
    items.forEach(item=>{
        item.addEventListener('click',function(){
            const checkbox=this.querySelector('.skill-checkbox');
            checkbox.classList.toggle('checked');
            this.classList.toggle('selected');
            const id=this.dataset.skill;
            if(selectedSkills.includes(id)){
                selectedSkills=selectedSkills.filter(x=>x!==id);
            }else{
                selectedSkills.push(id);
            }
        });
    });
}

function setupEventListeners(){
    const btnBack=document.getElementById('btnBack');
    const btnNext=document.getElementById('btnNext');

    if(btnBack){
        btnBack.addEventListener('click',function(){
            if(currentPage===2){
                showPage(1);
                selectedProvider='';
            }else if(currentPage===3){
                showPage(2);
            }else if(currentPage===4){
                showPage(3);
            }
        });
    }

    if(btnNext){
        btnNext.addEventListener('click',function(){
            if(currentPage===1){
                if(selectedProvider){
                    showPage(2);
                }
            }else if(currentPage===2){
                if(validateForm()){
                    showPage(3);
                }
            }else if(currentPage===3){
                showPage(4);
            }else if(currentPage===4){
                saveConfig();
            }
        });
    }
}

function showPage(n){
    currentPage=n;
    for(let i=1;i<=5;i++){
        const page=document.getElementById('page'+i);
        const step=document.getElementById('prog'+i);
        if(page&&step){
            page.classList.remove('active');
            step.classList.remove('active','done');
            if(i<n){
                step.classList.add('done');
            }else if(i===n){
                step.classList.add('active');
            }
        }
    }
    const activePage=document.getElementById('page'+n);
    if(activePage){
        activePage.classList.add('active');
    }

    const btnBack=document.getElementById('btnBack');
    const btnNext=document.getElementById('btnNext');
    if(btnBack){
        btnBack.style.visibility=n>1?'visible':'hidden';
    }
    if(btnNext){
        if(n===4){
            btnNext.textContent='Save Config';
        }else{
            btnNext.textContent='Next →';
        }
    }
}

function validateForm(){
    document.getElementById('urlError').textContent='';
    document.getElementById('keyError').textContent='';
    document.getElementById('modelError').textContent='';

    const url=document.getElementById('apiUrl').value.trim();
    const key=document.getElementById('apiKey').value.trim();
    const model=document.getElementById('modelId').value.trim();

    if(!url){
        document.getElementById('urlError').textContent='! Enter API URL';
        return false;
    }
    if(!key){
        document.getElementById('keyError').textContent='! Enter API Key';
        return false;
    }
    if(!model){
        document.getElementById('modelError').textContent='! Enter or select Model ID';
        return false;
    }
    return true;
}

function generateToken(){
    const chars='0123456789abcdef';
    let token='';
    for(let i=0;i<40;i++){
        token+=chars[Math.floor(Math.random()*16)];
    }
    return token;
}

function saveConfig(){
    document.querySelectorAll('.channel-input').forEach(input=>{
        const ch=input.dataset.channel;
        const field=input.dataset.field;
        const val=input.value.trim();
        if(val){
            if(!channelConfigs[ch]){
                channelConfigs[ch]={};
            }
            channelConfigs[ch][field]=val;
        }
    });

    const p=providers[selectedProvider]||{};
    const modelId=document.getElementById('modelId').value.trim();
    const apiUrl=document.getElementById('apiUrl').value.trim();
    const apiKey=document.getElementById('apiKey').value.trim();

    const cfg={
        meta:{lastTouchedVersion:'2026.3.1',lastTouchedAt:new Date().toISOString()},
        models:{mode:'merge',providers:{}},
        agents:{defaults:{
            model:{primary:(selectedProvider||'zai')+'/'+modelId},
            workspace:'~/.openclaw/workspace',
            compaction:{mode:'safeguard'},
            maxConcurrent:4
        }},
        commands:{native:'auto',restart:true},
        session:{dmScope:'per-channel-peer'},
        channels:{},
        gateway:{
            mode:'local',
            auth:{mode:'token',token:generateToken()},
            controlUi:{enabled:true}
        },
        skills:{entries:{}}
    };

    cfg.models.providers[selectedProvider]={
        baseUrl:apiUrl,
        apiKey:apiKey,
        api:selectedFormats[selectedProvider]||'openai-completions',
        models:[{
            id:modelId,
            name:modelId,
            reasoning:selectedProvider==='zai'||selectedProvider==='minimax'||selectedProvider==='stepfun',
            input:['text'],
            cost:{input:0,output:0,cacheRead:0,cacheWrite:0},
            contextWindow:128000,
            maxTokens:8192
        }]
    };

    for(const [id,config] of Object.entries(channelConfigs)){
        const ch=channels[id];
        cfg.channels[id]={dmPolicy:ch.dmPolicy||'pairing'};
        if(id==='telegram'){
            cfg.channels[id].botToken=config.botToken;
        }else if(id==='discord'){
            cfg.channels[id].token=config.token;
        }else if(id==='feishu'){
            cfg.channels[id].accounts={default:{appId:config.appId,appSecret:config.appSecret}};
        }else if(id==='slack'){
            cfg.channels[id].botToken=config.botToken;
            if(config.appToken){
                cfg.channels[id].appToken=config.appToken;
            }
        }
        if(ch.pluginName){
            cfg.plugins=cfg.plugins||{};
            cfg.plugins.entries=cfg.plugins.entries||{};
            cfg.plugins.entries[ch.pluginName]={enabled:true};
        }
    }

    for(const skillId of selectedSkills){
        cfg.skills.entries[skillId]={enabled:true};
    }

    document.getElementById('footer').style.display='none';
    showPage(5);

    fetch('/api/save',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({config:cfg,skills:selectedSkills})
    }).then(r=>r.json()).then(r=>{
        if(!r.success){
            throw new Error(r.error||'Save failed');
        }
    }).catch(e=>{
        alert('Save failed: '+e.message);
        document.getElementById('footer').style.display='flex';
        showPage(4);
    });
}

function copyCommands(){
    const cmds='OpenClaw Common Commands:\\n\\n# Check status\\nnpx openclaw@latest gateway status\\n\\n# Chat with AI\\nnpx openclaw@latest agent --message "hi"\\n\\n# Open dashboard\\nnpx openclaw@latest dashboard';
    navigator.clipboard.writeText(cmds).then(()=>alert('Commands copied!'));
}

init();
</script>
</body>
</html>`;
}

// ============================================
// Server Functions
// ============================================

function ensureConfigDir(){
    if(!fs.existsSync(CONFIG_DIR)){
        fs.mkdirSync(CONFIG_DIR,{recursive:true});
    }
    const ws=path.join(CONFIG_DIR,'workspace');
    if(!fs.existsSync(ws)){
        fs.mkdirSync(ws,{recursive:true});
    }
}

function saveConfigData(data){
    ensureConfigDir();
    fs.writeFileSync(CONFIG_FILE,JSON.stringify(data.config,null,2)+'\n');

    if(data.skills&&data.skills.length>0){
        console.log('Installing skills:', data.skills);
        setTimeout(()=>{
            for(const skillId of data.skills){
                try{
                    execSync('npx openclaw@latest skills install '+skillId,{stdio:'pipe',timeout:30000});
                    console.log('Installed skill:', skillId);
                }catch(e){
                    console.error('Failed to install skill '+skillId+':', e.message);
                }
            }
        },2000);
    }

    setTimeout(()=>{
        try{
            execSync('npx openclaw@latest gateway stop',{stdio:'pipe',timeout:10000});
        }catch(e){}
        spawn('npx',['openclaw@latest','gateway'],{
            detached:true,
            stdio:'ignore',
            shell:true
        }).unref();
        console.log('Gateway started');
    },4000);

    return true;
}

function checkOpenClaw(){
    try{
        const v=execSync('npx openclaw@latest --version',{encoding:'utf8',stdio:'pipe'});
        return v.trim();
    }catch(e){
        return null;
    }
}

// ============================================
// HTTP Server
// ============================================

const server=http.createServer((req,res)=>{
    if(req.url==='/'||req.url==='/index.html'){
        res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});
        res.end(generateHTML());
    }else if(req.url==='/api/save'&&req.method==='POST'){
        let body='';
        req.on('data',c=>{body+=c});
        req.on('end',()=>{
            try{
                const data=JSON.parse(body);
                saveConfigData(data);
                res.writeHead(200,{'Content-Type':'application/json;charset=utf-8'});
                res.end(JSON.stringify({success:true}));
            }catch(e){
                res.writeHead(400,{'Content-Type':'application/json;charset=utf-8'});
                res.end(JSON.stringify({success:false,error:e.message}));
            }
        });
    }else if(req.url==='/api/check'){
        const version=checkOpenClaw();
        const hasConfig=fs.existsSync(CONFIG_FILE);
        res.writeHead(200,{'Content-Type':'application/json;charset=utf-8'});
        res.end(JSON.stringify({installed:!!version,version,hasConfig}));
    }else{
        res.writeHead(404);
        res.end('Not Found');
    }
});

server.listen(PORT,'127.0.0.1',()=>{
    const version=checkOpenClaw();
    console.log('');
    console.log('  OpenClaw Web Config Wizard');
    console.log('  ============================');
    console.log(version?'  OpenClaw: '+version:'  OpenClaw: Will use npx');
    console.log('');
    console.log('  Access: http://127.0.0.1:'+PORT);
    console.log('');

    try{
        spawn('cmd',['/c','start','http://127.0.0.1:'+PORT],{detached:true}).unref();
    }catch(e){}
});
