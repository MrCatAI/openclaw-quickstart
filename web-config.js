#!/usr/bin/env node

/**
 * OpenClaw 配置向导 - 像素风格
 * 支持国产主流大模型 · 渠道配置 · 技能安装
 * 参考: openclaw-source/src/config/
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
// 模型提供商配置 (参考官方源码)
// ============================================

const PROVIDERS = {
    glm: {
        name: '智谱AI',
        fullName: '智谱AI GLM',
        desc: 'GLM-5 (744B MoE)',
        detail: 'Claude Code 官方兼容',
        color: '#3B82F6',
        formats: {
            'anthropic-messages': {
                name: 'Claude 格式',
                url: 'https://open.bigmodel.cn/api/anthropic',
                models: ['glm-5', 'glm-4.7', 'glm-4.5-flash', 'glm-4.5-air']
            },
            'openai-completions': {
                name: 'OpenAI 格式',
                url: 'https://open.bigmodel.cn/api/paas/v4',
                models: ['glm-5', 'glm-4.7', 'glm-4.5-flash', 'glm-4.5-air']
            }
        },
        keyUrl: 'https://open.bigmodel.cn/console/apikey',
        docUrl: 'https://open.bigmodel.cn/dev/howuse/anthropic'
    },
    kimi: {
        name: 'Kimi',
        fullName: '月之暗面 Kimi',
        desc: 'K2.5 (1T 参数)',
        detail: 'Claude Code 官方支持',
        color: '#8B5CF6',
        formats: {
            'openai-completions': {
                name: 'OpenAI 格式',
                url: 'https://api.moonshot.cn/v1',
                models: ['kimi-k2.5', 'kimi-k2-thinking', 'kimi-k2-turbo-preview', 'kimi-k2-0905-preview']
            }
        },
        keyUrl: 'https://platform.moonshot.cn/console/api-keys',
        docUrl: 'https://platform.moonshot.cn/docs/intro'
    },
    stepfun: {
        name: '阶跃星辰',
        fullName: '阶跃星辰 StepFun',
        desc: 'Step-3.5 Flash (196B)',
        detail: 'Claude Code 官方兼容',
        color: '#EC4899',
        formats: {
            'anthropic-messages': {
                name: 'Claude 格式',
                url: 'https://api.stepfun.ai/anthropic',
                models: ['step-3.5-flash', 'step-3.5-medium', 'step-2-16k']
            },
            'openai-completions': {
                name: 'OpenAI 格式',
                url: 'https://api.stepfun.ai/v1',
                models: ['step-3.5-flash', 'step-3.5-medium', 'step-2-16k']
            }
        },
        keyUrl: 'https://platform.stepfun.com',
        docUrl: 'https://github.com/stepfun-ai/Step-3.5'
    },
    volcengine: {
        name: '火山方舟',
        fullName: '火山方舟 Coding Plan',
        desc: '聚合多模型订阅',
        detail: '豆包/GLM/DeepSeek/Kimi',
        color: '#F97316',
        formats: {
            'openai-completions': {
                name: 'Coding Plan',
                url: 'https://ark.cn-beijing.volces.com/api/coding/v3',
                models: ['doubao-seed-code-latest', 'glm-4.7', 'deepseek-v3', 'kimi-k2-thinking']
            },
            'anthropic-messages': {
                name: 'Claude 格式',
                url: 'https://ark.cn-beijing.volces.com/api/coding',
                models: ['doubao-seed-code-preview-latest', 'doubao-seed-code-preview-251028']
            }
        },
        keyUrl: 'https://console.volcengine.com/ark',
        docUrl: 'https://www.volcengine.com/docs/ark'
    },
    deepseek: {
        name: 'DeepSeek',
        fullName: '深度求索 DeepSeek',
        desc: 'V3.2 (340B MoE)',
        detail: 'OpenAI 格式兼容',
        color: '#6B7FD4',
        formats: {
            'openai-completions': {
                name: 'OpenAI 格式',
                url: 'https://api.deepseek.com/v1',
                models: ['deepseek-chat', 'deepseek-reasoner', 'deepseek-v3']
            }
        },
        keyUrl: 'https://platform.deepseek.com/api_keys',
        docUrl: 'https://platform.deepseek.com/api-docs'
    },
    bailian: {
        name: '阿里百炼',
        fullName: '阿里云百炼 Coding Plan',
        desc: '聚合多模型订阅',
        detail: 'GLM/Kimi/MiniMax/Qwen',
        color: '#FF6B00',
        formats: {
            'openai-completions': {
                name: 'Coding Plan',
                url: 'https://bailian.console.aliyun.com/v1',
                models: ['qwen-coder-latest', 'glm-5', 'kimi-k2.5', 'MiniMax-M2.5', 'deepseek-v3']
            }
        },
        keyUrl: 'https://bailian.console.aliyun.com',
        docUrl: 'https://help.aliyun.com/zh/model-studio'
    },
    qwen: {
        name: '通义千问',
        fullName: '阿里通义千问',
        desc: 'Qwen3.5 Max',
        detail: 'OpenAI 格式兼容',
        color: '#10B981',
        formats: {
            'openai-completions': {
                name: 'OpenAI 格式',
                url: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
                models: ['qwen3.5-max', 'qwen3.5-turbo', 'qwen3-max', 'qwq-32b']
            }
        },
        keyUrl: 'https://dashscope.console.aliyun.com/apiKey',
        docUrl: 'https://help.aliyun.com/zh/model-studio'
    },
    minimax: {
        name: 'MiniMax',
        fullName: 'MiniMax',
        desc: 'M2.5 (456B)',
        detail: 'Claude 格式兼容',
        color: '#F43F5E',
        formats: {
            'anthropic-messages': {
                name: 'Claude 格式',
                url: 'https://api.minimaxi.com/anthropic',
                models: ['MiniMax-M2.5', 'MiniMax-M2.1-cc']
            }
        },
        keyUrl: 'https://api.minimaxi.com',
        docUrl: 'https://www.minimaxi.com'
    },
    custom: {
        name: '自定义',
        fullName: '自定义 / 第三方服务',
        desc: 'OpenAI / Claude 兼容',
        detail: '填写自己的 API 地址',
        color: '#6B7280',
        formats: {
            'openai-completions': {
                name: 'OpenAI 格式',
                url: '',
                models: []
            },
            'anthropic-messages': {
                name: 'Claude 格式',
                url: '',
                models: []
            }
        },
        keyUrl: '',
        docUrl: ''
    }
};

// ============================================
// 渠道配置 (参考 src/channels/ 和 src/commands/onboard-channels.ts)
// ============================================

const CHANNELS = {
    telegram: {
        name: 'Telegram',
        icon: '📱',
        desc: '流行的即时通讯应用',
        detail: '需要 @BotFather 创建机器人',
        color: '#0088CC',
        fields: [
            { key: 'botToken', label: 'Bot Token', placeholder: '1234567890:ABCdefGHI...', help: '从 @BotFather 获取' }
        ],
        setupUrl: 'https://core.telegram.org/bots/tutorial',
        quickstartScore: 10,
        dmPolicy: 'pairing'
    },
    discord: {
        name: 'Discord',
        icon: '🎮',
        desc: '游戏玩家和开发者社区',
        detail: '需要创建 Discord 应用',
        color: '#5865F2',
        fields: [
            { key: 'token', label: 'Bot Token', placeholder: 'MTAw...', help: '从 Discord Developer Portal 获取' }
        ],
        setupUrl: 'https://discord.com/developers/applications',
        quickstartScore: 8,
        dmPolicy: 'pairing'
    },
    feishu: {
        name: '飞书/Lark',
        icon: '🪽',
        desc: '企业协作平台',
        detail: '需要创建自建应用',
        color: '#3370FF',
        fields: [
            { key: 'appId', label: 'App ID', placeholder: 'cli_xxx...', help: '从飞书开放平台获取' },
            { key: 'appSecret', label: 'App Secret', placeholder: '...', help: '从飞书开放平台获取' }
        ],
        setupUrl: 'https://open.feishu.cn/app',
        quickstartScore: 5,
        dmPolicy: 'pairing',
        pluginName: 'feishu'
    },
    whatsapp: {
        name: 'WhatsApp',
        icon: '💬',
        desc: '全球最大的即时通讯平台',
        detail: '需要 WhatsApp Business API',
        color: '#25D366',
        fields: [
            { key: 'phoneNumber', label: 'Phone Number', placeholder: '+8613800138000', help: 'WhatsApp Business 号码' }
        ],
        setupUrl: 'https://developers.facebook.com/docs/whatsapp',
        quickstartScore: 9,
        dmPolicy: 'pairing'
    },
    slack: {
        name: 'Slack',
        icon: '💼',
        desc: '企业团队协作',
        detail: '需要创建 Slack App',
        color: '#4A154B',
        fields: [
            { key: 'botToken', label: 'Bot Token', placeholder: 'xoxb-...', help: '从 Slack App 配置获取' },
            { key: 'appToken', label: 'App Token', placeholder: 'xapp-...', help: '用于 Socket Mode (可选)' }
        ],
        setupUrl: 'https://api.slack.com/apps',
        quickstartScore: 6,
        dmPolicy: 'pairing'
    }
};

// ============================================
// 技能配置 (参考 skills/ 目录)
// ============================================

const SKILLS = [
    { id: 'weather', name: '天气查询', desc: '获取实时天气信息', emoji: '🌤️', needsKey: false },
    { id: 'summarize', name: '内容摘要', desc: '自动生成文章/对话摘要', emoji: '📝', needsKey: false },
    { id: 'voice-call', name: '语音通话', desc: '语音输入输出支持', emoji: '🎤', needsKey: false },
    { id: 'canvas', name: 'Canvas', desc: '可视化工作空间', emoji: '🎨', needsKey: false },
    { id: 'github', name: 'GitHub', desc: 'GitHub 操作集成', emoji: '🐙', needsKey: true, keyLabel: 'GitHub Token' },
    { id: 'notion', name: 'Notion', desc: 'Notion 笔记集成', emoji: '📔', needsKey: true, keyLabel: 'Notion API Key' }
];

// ============================================
// HTML 界面
// ============================================

const HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>OpenClaw 配置向导</title>
<link href="https://fonts.googleapis.com/css2?family=VT323&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{
    --green:#7CBD6E;
    --green-dark:#4A8A4F;
    --green-light:#A8D898;
    --stone:#D4D4D4;
    --stone-dark:#8B8B8B;
    --stone-light:#E8E8E8;
    --text:#2D2D2D;
    --text-light:#FFFFFF;
    --border:#3D3D3D
}
body{
    font-family:'VT323','Courier New',monospace;
    background:linear-gradient(180deg,#87CEEB 0%,#87CEEB 40%,#7CBD6E 40%,#7CBD6E 100%);
    min-height:100vh;
    color:var(--text);
    font-size:20px;
    line-height:1.4;
    margin:0;
    padding:0;
    display:flex;
    align-items:center;
    justify-content:center
}
.app-container{
    width:90vw;
    height:90vh;
    max-width:1800px;
    background:#E0E0E0;
    border:6px solid var(--border);
    box-shadow:12px 12px 0 rgba(0,0,0,0.4);
    display:flex;
    flex-direction:column;
    position:relative
}
.app-container::before{
    content:'';
    position:absolute;
    top:3px;left:3px;right:3px;bottom:3px;
    border:3px solid var(--stone-light);
    pointer-events:none
}
.header{
    padding:25px 40px;
    background:linear-gradient(180deg,#7CBD6E 0%,#5DA856 100%);
    border-bottom:6px solid var(--border);
    display:flex;
    align-items:center;
    gap:25px;
    position:relative;
    z-index:1
}
.logo{
    width:70px;
    height:70px;
    background:var(--green-light);
    border:5px solid var(--border);
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:42px;
    box-shadow:5px 5px 0 rgba(0,0,0,0.3)
}
.title-box h1{
    font-size:48px;
    color:var(--text-light);
    text-shadow:4px 4px 0 rgba(0,0,0,0.3);
    letter-spacing:3px
}
.title-box p{
    font-size:22px;
    color:var(--text-light);
    opacity:0.9
}
.progress{
    display:flex;
    gap:15px;
    padding:12px 40px;
    background:var(--stone-light);
    border-bottom:4px solid var(--stone-dark)
}
.progress-step{
    width:36px;
    height:36px;
    border:4px solid var(--stone-dark);
    background:var(--stone);
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:22px;
    font-weight:bold;
    color:var(--stone-dark)
}
.progress-step.active{
    background:var(--green);
    border-color:var(--green-dark);
    color:var(--text-light);
    box-shadow:0 0 0 4px var(--green-light)
}
.progress-step.done{
    background:var(--green-dark);
    border-color:var(--green-dark);
    color:var(--text-light)
}
.content{
    flex:1;
    overflow-y:auto;
    padding:25px 40px;
    position:relative;
    z-index:1
}
.content::-webkit-scrollbar{width:14px}
.content::-webkit-scrollbar-track{background:var(--stone);border:3px solid var(--stone-dark)}
.content::-webkit-scrollbar-thumb{background:var(--green-dark);border:3px solid var(--stone-dark)}
.page{display:none}
.page.active{display:block}
.page-title{
    font-size:36px;
    margin-bottom:8px;
    display:flex;
    align-items:center;
    gap:12px
}
.page-title::before{
    content:'◆';
    color:var(--green-dark)
}
.page-subtitle{
    font-size:20px;
    color:#666;
    margin-bottom:25px
}
.provider-grid{
    display:grid;
    grid-template-columns:repeat(4,1fr);
    gap:20px
}
.provider-card{
    padding:25px;
    background:var(--stone-light);
    border:5px solid var(--stone-dark);
    cursor:pointer;
    transition:all 0.15s;
    position:relative;
    text-align:center;
    min-height:180px;
    display:flex;
    flex-direction:column;
    justify-content:center;
    align-items:center
}
.provider-card:hover{
    transform:translate(-4px,-4px);
    box-shadow:8px 8px 0 rgba(0,0,0,0.3);
    border-color:var(--green)
}
.provider-card.selected{
    background:var(--green-light);
    border-color:var(--green-dark);
    box-shadow:8px 8px 0 rgba(0,0,0,0.3)
}
.provider-card.selected::after{
    content:'✓';
    position:absolute;
    top:8px;right:8px;
    width:28px;
    height:28px;
    background:var(--green-dark);
    color:var(--text-light);
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:20px
}
.provider-name{
    font-size:28px;
    font-weight:bold;
    margin-bottom:10px
}
.provider-desc{
    font-size:18px;
    color:#444;
    margin-bottom:6px
}
.provider-detail{
    font-size:16px;
    color:#666
}
.form-row{
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:25px;
    margin-bottom:20px
}
.form-group{margin-bottom:20px}
.form-group.full{grid-column:1/-1}
label{
    display:block;
    font-size:24px;
    margin-bottom:10px;
    color:var(--text)
}
input,select{
    width:100%;
    padding:14px 18px;
    font-size:22px;
    font-family:inherit;
    background:#FFF;
    border:4px solid var(--stone-dark);
    color:var(--text)
}
input:focus,select:focus{
    outline:none;
    border-color:var(--green);
    background:#FAFFFA
}
.info-box{
    background:var(--green-light);
    border:4px solid var(--green-dark);
    padding:18px 22px;
    margin-bottom:25px
}
.info-box a{color:#2A5A2F;text-decoration:none}
.info-box a:hover{text-decoration:underline}
.format-btns{
    display:flex;
    gap:12px;
    flex-wrap:wrap;
    margin-bottom:20px
}
.format-btn{
    padding:12px 24px;
    font-size:22px;
    font-family:inherit;
    background:var(--stone-light);
    border:4px solid var(--stone-dark);
    cursor:pointer;
    transition:all 0.15s
}
.format-btn:hover{border-color:var(--green)}
.format-btn.selected{
    background:var(--green);
    border-color:var(--green-dark);
    color:var(--text-light)
}
.footer{
    padding:20px 40px;
    background:var(--stone-light);
    border-top:4px solid var(--stone-dark);
    display:flex;
    justify-content:space-between;
    align-items:center
}
.btn{
    padding:14px 45px;
    font-size:26px;
    font-family:inherit;
    cursor:pointer;
    background:linear-gradient(180deg,#A0A0A0 0%,#808080 100%);
    border:4px solid var(--border);
    color:var(--text-light);
    text-shadow:2px 2px 0 rgba(0,0,0,0.5);
    transition:all 0.15s
}
.btn:hover{
    transform:translate(-2px,-2px);
    box-shadow:4px 4px 0 rgba(0,0,0,0.3)
}
.btn:active{transform:translate(0,0);box-shadow:none}
.btn-primary{
    background:linear-gradient(180deg,#7CBD6E 0%,#5DA856 100%);
    border-color:var(--green-dark)
}
.error{
    color:#C41E3A;
    font-size:18px;
    margin-top:6px
}
.channel-grid{
    display:grid;
    grid-template-columns:repeat(3,1fr);
    gap:25px;
    margin-top:20px
}
.channel-card{
    padding:40px 25px;
    background:var(--stone-light);
    border:4px solid var(--stone-dark);
    text-align:center;
    cursor:pointer;
    transition:all 0.15s
}
.channel-card:hover{
    transform:translate(-4px,-4px);
    box-shadow:6px 6px 0 rgba(0,0,0,0.3);
    border-color:var(--green)
}
.channel-card.selected{
    background:var(--green-light);
    border-color:var(--green-dark)
}
.channel-icon{font-size:56px;margin-bottom:12px}
.channel-name{font-size:26px;font-weight:bold}
.channel-desc{font-size:18px;color:#666;margin-top:8px}
.channel-fields{margin-top:30px}
.channel-field{
    margin-bottom:20px;
    text-align:left
}
.channel-field label{
    font-size:20px;
    margin-bottom:8px
}
.channel-field input{
    padding:12px 16px;
    font-size:20px
}
.channel-help{
    font-size:16px;
    color:#666;
    margin-top:6px
}
.skill-list{
    display:grid;
    grid-template-columns:1fr;
    gap:15px;
    margin-top:20px
}
.skill-item{
    padding:20px;
    background:var(--stone-light);
    border:4px solid var(--stone-dark);
    display:flex;
    align-items:center;
    gap:15px
}
.skill-checkbox{
    width:24px;
    height:24px;
    border:3px solid var(--stone-dark);
    cursor:pointer;
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:18px
}
.skill-checkbox.checked{
    background:var(--green);
    border-color:var(--green-dark);
    color:var(--text-light)
}
.skill-info{flex:1}
.skill-name{font-size:24px;font-weight:bold}
.skill-desc{font-size:18px;color:#666}
.skill-key-input{
    margin-top:15px;
    padding:15px;
    background:#FFF;
    border:3px solid var(--stone-dark)
}
.success{text-align:center;padding:80px 40px}
.success-icon{
    width:120px;
    height:120px;
    margin:0 auto 30px;
    background:var(--green);
    border:6px solid var(--border);
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:64px;
    color:var(--text-light);
    box-shadow:8px 8px 0 rgba(0,0,0,0.3)
}
.success-links{
    margin-top:40px;
    display:flex;
    flex-direction:column;
    gap:15px
}
.success-link{
    display:block;
    padding:15px 30px;
    background:var(--stone-light);
    border:4px solid var(--stone-dark);
    color:var(--text);
    text-decoration:none;
    font-size:22px
}
.success-link:hover{
    border-color:var(--green);
    background:var(--green-light)
}
@media(min-width:2000px){
    .provider-grid{grid-template-columns:repeat(5,1fr)}
}
@media(max-width:1400px){
    .provider-grid{grid-template-columns:repeat(3,1fr)}
}
@media(max-width:900px){
    .provider-grid{grid-template-columns:repeat(2,1fr)}
    .channel-grid{grid-template-columns:repeat(2,1fr)}
    .form-row{grid-template-columns:1fr}
}
</style>
</head>
<body>
<div class="app-container">
    <div class="header">
        <div class="logo">🦞</div>
        <div class="title-box">
            <h1>OPENCLAW 配置向导</h1>
            <p>国产大模型 · 渠道配置 · 技能安装</p>
        </div>
    </div>
    <div class="progress">
        <div class="progress-step active" id="prog1">1</div>
        <div class="progress-step" id="prog2">2</div>
        <div class="progress-step" id="prog3">3</div>
        <div class="progress-step" id="prog4">4</div>
    </div>

    <div class="content">
        <!-- 页面1: 选择厂商 -->
        <div class="page active" id="page1">
            <div class="page-title">选择 AI 服务商</div>
            <div class="page-subtitle">支持 Claude Code 兼容接口的国产主流大模型</div>
            <div class="provider-grid" id="providerGrid"></div>
        </div>

        <!-- 页面2: API 配置 -->
        <div class="page" id="page2">
            <div class="page-title">配置 API 连接</div>
            <div class="page-subtitle">填写 API 信息，支持 Claude Code 兼容接口</div>
            <div class="info-box">
                <div style="font-size:26px;margin-bottom:8px" id="providerName">-</div>
                <div style="font-size:20px" id="providerDesc"></div>
                <a href="#" target="_blank" id="keyLink">获取 API Key →</a>
                <span style="margin:0 10px;color:#666">|</span>
                <a href="#" target="_blank" id="docLink">查看文档 →</a>
            </div>

            <div class="form-group full">
                <label>API 格式</label>
                <div class="format-btns" id="formatBtns"></div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>API 地址</label>
                    <input type="text" id="apiUrl" placeholder="自动填充，可修改">
                    <div class="error" id="urlError"></div>
                </div>
                <div class="form-group">
                    <label>API Key</label>
                    <input type="password" id="apiKey" placeholder="粘贴 API Key">
                    <div class="error" id="keyError"></div>
                </div>
            </div>

            <div class="form-group full">
                <label>模型 ID <span style="font-size:18px;color:#666">(输入或从列表选择)</span></label>
                <input type="text" id="modelId" list="modelList" placeholder="输入模型 ID，或点击选择推荐模型" autocomplete="off">
                <datalist id="modelList"></datalist>
                <div class="error" id="modelError"></div>
            </div>
        </div>

        <!-- 页面3: 渠道配置 -->
        <div class="page" id="page3">
            <div class="page-title">配置聊天渠道 (可选)</div>
            <div class="page-subtitle">让 OpenClaw 在您常用的聊天平台工作</div>

            <div class="info-box">
                <div style="font-size:18px">💡 提示: 您可以稍后通过 <code>openclaw channels add</code> 添加更多渠道</div>
            </div>

            <div class="channel-grid" id="channelGrid"></div>

            <div id="channelFields" style="display:none">
                <div class="page-title" style="font-size:28px;margin-top:30px" id="channelConfigTitle">配置渠道</div>
                <div id="channelFieldsContainer"></div>
            </div>
        </div>

        <!-- 页面4: 技能配置 -->
        <div class="page" id="page4">
            <div class="page-title">技能安装 (可选)</div>
            <div class="page-subtitle">选择要安装的扩展技能</div>

            <div class="info-box">
                <div style="font-size:18px">💡 技能为 OpenClaw 添加额外功能，如语音合成、天气查询等</div>
            </div>

            <div class="skill-list" id="skillList"></div>
        </div>

        <!-- 页面5: 完成 -->
        <div class="page" id="page5">
            <div class="success">
                <div class="success-icon">✓</div>
                <div class="page-title" style="justify-content:center;font-size:42px">配置完成！</div>
                <div class="page-subtitle">OpenClaw 正在启动...</div>
                <div class="success-links">
                    <a href="http://127.0.0.1:18789" target="_blank" class="success-link">🌐 打开 Web 控制面板</a>
                    <a href="#" onclick="copyCommands()" class="success-link">📋 复制常用命令</a>
                </div>
            </div>
        </div>
    </div>

    <div class="footer" id="footer">
        <button class="btn" id="btnBack" style="visibility:hidden">← 上一步</button>
        <button class="btn btn-primary" id="btnNext">下一步 →</button>
    </div>
</div>

<script>
const PROVIDERS=${JSON.stringify(PROVIDERS)};
const CHANNELS=${JSON.stringify(CHANNELS)};
const SKILLS=[
    {id:'weather',name:'天气查询',desc:'获取实时天气信息',emoji:'🌤️',needsKey:false},
    {id:'summarize',name:'内容摘要',desc:'自动生成文章/对话摘要',emoji:'📝',needsKey:false},
    {id:'voice-call',name:'语音通话',desc:'语音输入输出支持',emoji:'🎤',needsKey:false},
    {id:'canvas',name:'Canvas',desc:'可视化工作空间',emoji:'🎨',needsKey:false}
];

let currentPage=1,selectedProvider='',selectedFormat='',selectedChannels=[],selectedSkills=[],skillKeys={};

// 初始化
function init(){
    renderProviders();
    renderChannels();
    renderSkills();
    setupEventListeners()
}

function renderProviders(){
    const grid=document.getElementById('providerGrid');
    grid.innerHTML=Object.entries(PROVIDERS).map(([id,p])=>\`
        <div class="provider-card" data-provider="\${id}">
            <div class="provider-name">\${p.name}</div>
            <div class="provider-desc">\${p.desc}</div>
            <div class="provider-detail">\${p.detail}</div>
        </div>
    \`).join('');
    document.querySelectorAll('.provider-card').forEach(card=>{
        card.addEventListener('click',()=>{
            document.querySelectorAll('.provider-card').forEach(c=>c.classList.remove('selected'));
            card.classList.add('selected');
            selectedProvider=card.dataset.provider;
            showPage(2);
            loadProvider(selectedProvider)
        })
    })
}

function renderChannels(){
    const grid=document.getElementById('channelGrid');
    grid.innerHTML=Object.entries(CHANNELS).map(([id,c])=>\`
        <div class="channel-card" data-channel="\${id}">
            <div class="channel-icon">\${c.icon}</div>
            <div class="channel-name">\${c.name}</div>
            <div class="channel-desc">\${c.desc}</div>
        </div>
    \`).join('');
    document.querySelectorAll('.channel-card').forEach(card=>{
        card.addEventListener('click',()=>{
            card.classList.toggle('selected');
            const id=card.dataset.channel;
            if(selectedChannels.includes(id)){
                selectedChannels=selectedChannels.filter(x=>x!==id)
            }else{
                selectedChannels.push(id)
            }
            renderChannelFields()
        })
    })
}

function renderChannelFields(){
    const container=document.getElementById('channelFields');
    const fieldsContainer=document.getElementById('channelFieldsContainer');
    const title=document.getElementById('channelConfigTitle');

    if(selectedChannels.length===0){
        container.style.display='none';
        return
    }

    container.style.display='block';
    title.textContent=\`配置 \${selectedChannels.map(id=>CHANNELS[id].name).join(' + ')}\`;

    fieldsContainer.innerHTML=selectedChannels.map(id=>{
        const ch=CHANNELS[id];
        return \`
            <div style="margin-bottom:25px">
                <div style="font-size:24px;margin-bottom:15px;color:var(--green-dark)">
                    \${ch.icon} \${ch.name}
                </div>
                \${ch.fields.map(f=>\`
                    <div class="channel-field">
                        <label>\${f.label}</label>
                        <input type="text" class="channel-input" data-channel="\${id}" data-field="\${f.key}" placeholder="\${f.placeholder}">
                        <div class="channel-help">\${f.help}</div>
                    </div>
                \`).join('')}
            </div>
        \`
    }).join('')
}

function renderSkills(){
    const list=document.getElementById('skillList');
    list.innerHTML=SKILLS.map(s=>\`
        <div class="skill-item" data-skill="\${s.id}">
            <div class="skill-checkbox">✓</div>
            <div class="skill-info">
                <div class="skill-name">\${s.emoji} \${s.name}</div>
                <div class="skill-desc">\${s.desc}</div>
            </div>
        </div>
    \`).join('');
    document.querySelectorAll('.skill-item').forEach(item=>{
        item.addEventListener('click',()=>{
            item.querySelector('.skill-checkbox').classList.toggle('checked');
            const id=item.dataset.skill;
            if(selectedSkills.includes(id)){
                selectedSkills=selectedSkills.filter(x=>x!==id)
            }else{
                selectedSkills.push(id)
            }
        })
    })
}

function setupEventListeners(){
    document.getElementById('btnBack').addEventListener('click',()=>{
        if(currentPage===2){showPage(1);selectedProvider=''}
        else if(currentPage===3){showPage(2)}
        else if(currentPage===4){showPage(3)}
    });
    document.getElementById('btnNext').addEventListener('click',()=>{
        if(currentPage===1){if(selectedProvider)showPage(2)}
        else if(currentPage===2){if(validateForm())showPage(3)}
        else if(currentPage===3){showPage(4)}
        else if(currentPage===4){saveConfig()}
    })
}

function showPage(n){
    currentPage=n;
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.getElementById('page'+n).classList.add('active');
    for(let i=1;i<=5;i++){
        const s=document.getElementById('prog'+i);
        s.className='progress-step'+(i<n?' done':i===n?' active':'')
    }
    const back=document.getElementById('btnBack');
    const next=document.getElementById('btnNext');
    back.style.visibility=n>1?'visible':'hidden';
    if(n===4)next.textContent='保存配置';
    else next.textContent='下一步 →'
}

function loadProvider(id){
    const p=PROVIDERS[id];
    if(!p)return;
    document.getElementById('providerName').textContent=p.fullName;
    document.getElementById('providerDesc').textContent=p.desc+' - '+p.detail;
    if(p.keyUrl){
        document.getElementById('keyLink').href=p.keyUrl;
        document.getElementById('keyLink').style.display='inline'
    }else{
        document.getElementById('keyLink').style.display='none'
    }
    if(p.docUrl){
        document.getElementById('docLink').href=p.docUrl;
        document.getElementById('docLink').style.display='inline'
    }else{
        document.getElementById('docLink').style.display='none'
    }

    const btns=document.getElementById('formatBtns');
    btns.innerHTML='';
    let first='';
    Object.entries(p.formats||{}).forEach(([fid,f])=>{
        if(!first)first=fid;
        const btn=document.createElement('button');
        btn.className='format-btn';
        btn.textContent=f.name;
        btn.onclick=()=>selectFormat(fid,btn);
        btns.appendChild(btn)
    });
    if(first)selectFormat(first,btns.firstChild)
}

function selectFormat(id,btn){
    selectedFormat=id;
    document.querySelectorAll('.format-btn').forEach(b=>b.classList.remove('selected'));
    if(btn)btn.classList.add('selected');

    const p=PROVIDERS[selectedProvider];
    const f=p?.formats?.[id];
    if(f){
        document.getElementById('apiUrl').value=f.url||'';
        const dl=document.getElementById('modelList');
        dl.innerHTML='';
        if(f.models?.length){
            f.models.forEach(m=>{
                const opt=document.createElement('option');
                opt.value=m;
                dl.appendChild(opt)
            });
            document.getElementById('modelId').placeholder='例如: '+f.models[0]
        }else{
            document.getElementById('modelId').placeholder='输入模型 ID，如 gpt-4o'
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

    if(!url){document.getElementById('urlError').textContent='! 请输入 API 地址';return false}
    if(!key){document.getElementById('keyError').textContent='! 请输入 API Key';return false}
    if(!model){document.getElementById('modelError').textContent='! 请选择或输入模型 ID';return false}
    return true
}

function generateToken(){
    return Array.from({length:40},()=>'0123456789abcdef'[Math.floor(Math.random()*16)]).join('')
}

function saveConfig(){
    // 收集渠道配置
    const channels={};
    document.querySelectorAll('.channel-input').forEach(input=>{
        const ch=input.dataset.channel;
        const field=input.dataset.field;
        const val=input.value.trim();
        if(val){
            if(!channels[ch])channels[ch]={};
            channels[ch][field]=val
        }
    });

    const p=PROVIDERS[selectedProvider]||{};
    const cfg={
        meta:{lastTouchedVersion:'2026.3.1',lastTouchedAt:new Date().toISOString()},
        models:{mode:'merge',providers:{}},
        agents:{defaults:{
            model:{primary:(selectedProvider||'glm')+'/'+document.getElementById('modelId').value.trim()},
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
        skills:{
            entries:{}
        }
    };

    // 模型配置
    cfg.models.providers[selectedProvider||'glm']={
        baseUrl:document.getElementById('apiUrl').value.trim(),
        apiKey:document.getElementById('apiKey').value.trim(),
        api:selectedFormat,
        models:[{
            id:document.getElementById('modelId').value.trim(),
            name:document.getElementById('modelId').value.trim(),
            reasoning:false,
            input:['text'],
            cost:{input:0,output:0,cacheRead:0,cacheWrite:0},
            contextWindow:128000,
            maxTokens:8192
        }]
    };

    // 渠道配置
    Object.entries(channels).forEach(([id,config])=>{
        const ch=CHANNELS[id];
        if(ch.pluginName){
            cfg.plugins=cfg.plugins||{};
            cfg.plugins.entries=cfg.plugins.entries||{};
            cfg.plugins.entries[ch.pluginName]={enabled:true}
        }
        cfg.channels[id]={
            dmPolicy:ch.dmPolicy||'pairing'
        };
        if(id==='telegram'){
            cfg.channels[id].botToken=config.botToken
        }else if(id==='discord'){
            cfg.channels[id].token=config.token
        }else if(id==='feishu'){
            cfg.channels[id].accounts={
                default:{
                    appId:config.appId,
                    appSecret:config.appSecret
                }
            }
        }else if(id==='slack'){
            cfg.channels[id].botToken=config.botToken;
            if(config.appToken)cfg.channels[id].appToken=config.appToken
        }else if(id==='whatsapp'){
            cfg.channels[id].phoneNumber=config.phoneNumber
        }
    });

    // 技能配置
    selectedSkills.forEach(skillId=>{
        cfg.skills.entries[skillId]={enabled:true}
    });

    document.getElementById('footer').style.display='none';
    showPage(5);

    fetch('/api/save',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(cfg)
    }).then(r=>r.json()).then(r=>{
        if(!r.success)throw new Error(r.error)
    }).catch(e=>{
        alert('保存失败: '+e.message);
        document.getElementById('footer').style.display='flex';
        showPage(4)
    })
}

function copyCommands(){
    const cmds=\`常用 OpenClaw 命令:

# 查看服务状态
openclaw gateway status

# 与 AI 对话
openclaw agent --message "你好"

# 查看渠道状态
openclaw channels status

# 批准配对请求
openclaw pairing approve <渠道> <代码>

# 打开 Web 界面
openclaw dashboard
\`;
    navigator.clipboard.writeText(cmds).then(()=>alert('命令已复制到剪贴板！'))
}

init();
</script>
</body>
</html>`;

// ============================================
// 工具函数
// ============================================

function ensureConfigDir(){
    if(!fs.existsSync(CONFIG_DIR))fs.mkdirSync(CONFIG_DIR,{recursive:true});
    const ws=path.join(CONFIG_DIR,'workspace');
    if(!fs.existsSync(ws))fs.mkdirSync(ws,{recursive:true});
}

function saveConfig(config){
    ensureConfigDir();
    fs.writeFileSync(CONFIG_FILE,JSON.stringify(config,null,2)+'\n');
    return true
}

function startGateway(){
    try{
        // 先停止现有的 gateway
        try{execSync('openclaw gateway stop',{encoding:'utf8',stdio:'ignore',timeout:5000})}catch(e){}

        // 启动 gateway
        const proc=spawn('openclaw',['gateway'],{
            detached:true,
            stdio:'ignore',
            shell:true
        });
        proc.unref();
        return true
    }catch(e){
        return false
    }
}

function checkOpenClaw(){
    try{
        const v=execSync('openclaw --version',{encoding:'utf8',stdio:'pipe'});
        return v.trim()
    }catch(e){
        return null
    }
}

// ============================================
// HTTP 服务器
// ============================================

const server=http.createServer((req,res)=>{
    if(req.url==='/'||req.url==='/index.html'){
        res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});
        res.end(HTML)
    }else if(req.url==='/api/save'&&req.method==='POST'){
        let body='';
        req.on('data',c=>{body+=c});
        req.on('end',()=>{
            try{
                const cfg=JSON.parse(body);
                saveConfig(cfg);

                // 延迟启动 gateway
                setTimeout(()=>{
                    startGateway();
                    // 保存完成标记
                    fs.writeFileSync(
                        path.join(CONFIG_DIR,'pixel-config-done'),
                        JSON.stringify({timestamp:Date.now(),config:cfg})
                    );
                },1000);

                res.writeHead(200,{'Content-Type':'application/json;charset=utf-8'});
                res.end(JSON.stringify({success:true}))
            }catch(e){
                res.writeHead(400,{'Content-Type':'application/json;charset=utf-8'});
                res.end(JSON.stringify({success:false,error:e.message}))
            }
        })
    }else if(req.url==='/api/check'){
        // 检查 OpenClaw 是否已安装
        const version=checkOpenClaw();
        const hasConfig=fs.existsSync(CONFIG_FILE);
        res.writeHead(200,{'Content-Type':'application/json;charset=utf-8'});
        res.end(JSON.stringify({installed:!!version,version,hasConfig}))
    }else{
        res.writeHead(404);
        res.end('Not Found')
    }
});

server.listen(PORT,'127.0.0.1',()=>{
    const version=checkOpenClaw();
    console.log('\n╔═══════════════════════════════════════╗');
    console.log('║   OpenClaw 配置向导                     ║');
    console.log('╠═══════════════════════════════════════╣');
    console.log('║                                       ║');
    console.log(version?`║   OpenClaw 已安装: ${version.padEnd(18)}║`:'║   OpenClaw 未安装                      ║');
    console.log('║                                       ║');
    console.log('║  访问: http://127.0.0.1:'+PORT+'          ║');
    console.log('║                                       ║');
    console.log('╚═══════════════════════════════════════╝\n');

    // 自动打开浏览器
    try{
        spawn('cmd',['/c','start',`http://127.0.0.1:${PORT}`],{detached:true}).unref()
    }catch(e){}
});
