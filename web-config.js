#!/usr/bin/env node

/**
 * OpenClaw Web Configuration Wizard
 * Based on: https://github.com/MrCatAI/openclaw-quickstart
 * Reference: openclaw-source/src/config/
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
// Model Providers Configuration
// Based on: src/commands/auth-choice-options.ts
// ============================================

const PROVIDERS = {
    // OpenAI Official
    openai: {
        name: 'OpenAI',
        fullName: 'OpenAI GPT',
        desc: 'GPT-4.1 / o3-mini',
        detail: 'Official OpenAI API',
        color: '#10A37F',
        formats: {
            'openai-completions': {
                name: 'OpenAI Format',
                url: 'https://api.openai.com/v1',
                models: ['gpt-4.1', 'o3-mini', 'gpt-4o', 'chatgpt-4o-latest']
            }
        },
        keyUrl: 'https://platform.openai.com/api-keys',
        docUrl: 'https://platform.openai.com/docs'
    },
    // Anthropic Claude
    anthropic: {
        name: 'Anthropic',
        fullName: 'Anthropic Claude',
        desc: 'Claude 4.6 Sonnet / Opus',
        detail: 'Official Anthropic API',
        color: '#D97757',
        formats: {
            'anthropic-messages': {
                name: 'Claude Format',
                url: 'https://api.anthropic.com',
                models: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-4-6']
            }
        },
        keyUrl: 'https://console.anthropic.com/settings/keys',
        docUrl: 'https://docs.anthropic.com'
    },
    // Z.AI (GLM Models) - OpenAI Format
    zai: {
        name: 'Z.AI',
        fullName: 'Z.AI GLM Models',
        desc: 'GLM-5 / GLM-4.7',
        detail: 'OpenAI compatible - CN & Global',
        color: '#3B82F6',
        formats: {
            'openai-completions': {
                name: 'OpenAI Format',
                url: 'https://api.z.ai/api/paas/v4',
                models: ['glm-5', 'glm-4.7', 'glm-4.7-flash', 'glm-4.7-flashx'],
                endpoints: {
                    'Global': 'https://api.z.ai/api/paas/v4',
                    'CN': 'https://open.bigmodel.cn/api/paas/v4',
                    'Coding-Global': 'https://api.z.ai/api/coding/paas/v4',
                    'Coding-CN': 'https://open.bigmodel.cn/api/coding/paas/v4'
                }
            }
        },
        keyUrl: 'https://open.bigmodel.cn/console/apikey',
        docUrl: 'https://open.bigmodel.cn/dev/howuse/anthropic'
    },
    // MiniMax - Claude Format Support
    minimax: {
        name: 'MiniMax',
        fullName: 'MiniMax M2.5',
        desc: 'M2.5 (456B)',
        detail: 'Claude format compatible',
        color: '#F43F5E',
        formats: {
            'anthropic-messages': {
                name: 'Claude Format',
                url: 'https://api.minimax.io/anthropic',
                models: ['MiniMax-M2.5', 'MiniMax-M2.1', 'MiniMax-M2.5-Lightning'],
                endpoints: {
                    'Global': 'https://api.minimax.io/anthropic',
                    'CN': 'https://api.minimaxi.com/anthropic'
                }
            }
        },
        keyUrl: 'https://api.minimaxi.com',
        docUrl: 'https://www.minimaxi.com'
    },
    // Moonshot (Kimi)
    moonshot: {
        name: 'Kimi',
        fullName: 'Moonshot AI Kimi',
        desc: 'K2.5 (1T params)',
        detail: 'OpenAI format compatible',
        color: '#8B5CF6',
        formats: {
            'openai-completions': {
                name: 'OpenAI Format',
                url: 'https://api.moonshot.ai/v1',
                models: ['kimi-k2.5', 'kimi-k2-thinking', 'kimi-k2-turbo-preview'],
                endpoints: {
                    'Global': 'https://api.moonshot.ai/v1',
                    'CN': 'https://api.moonshot.cn/v1'
                }
            }
        },
        keyUrl: 'https://platform.moonshot.cn/console/api-keys',
        docUrl: 'https://platform.moonshot.cn/docs/intro'
    },
    // Kimi Coding - Claude Format
    kimiCoding: {
        name: 'Kimi Coding',
        fullName: 'Kimi for Coding',
        desc: 'K2P5 Coding Model',
        detail: 'Claude format compatible',
        color: '#7C3AED',
        formats: {
            'anthropic-messages': {
                name: 'Claude Format',
                url: 'https://api.kimi.com/coding/',
                models: ['k2p5']
            }
        },
        keyUrl: 'https://kimi-code.moonshot.cn',
        docUrl: 'https://kimi-code.moonshot.cn'
    },
    // DeepSeek
    deepseek: {
        name: 'DeepSeek',
        fullName: 'DeepSeek V3.2',
        desc: 'V3.2 (340B MoE)',
        detail: 'OpenAI format compatible',
        color: '#6B7FD4',
        formats: {
            'openai-completions': {
                name: 'OpenAI Format',
                url: 'https://api.deepseek.com/v1',
                models: ['deepseek-chat', 'deepseek-reasoner', 'deepseek-v3']
            }
        },
        keyUrl: 'https://platform.deepseek.com/api_keys',
        docUrl: 'https://platform.deepseek.com/api-docs'
    },
    // Qwen (Alibaba)
    qwen: {
        name: 'Qwen',
        fullName: 'Alibaba Qwen',
        desc: 'Qwen 3.5 Max',
        detail: 'OpenAI format compatible',
        color: '#10B981',
        formats: {
            'openai-completions': {
                name: 'OpenAI Format',
                url: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
                models: ['qwen3.5-max', 'qwen3.5-turbo', 'qwen3-max', 'qwq-32b']
            }
        },
        keyUrl: 'https://dashscope.console.aliyun.com/apiKey',
        docUrl: 'https://help.aliyun.com/zh/model-studio'
    },
    // StepFun
    stepfun: {
        name: 'StepFun',
        fullName: 'StepFun Step-3.5',
        desc: 'Step-3.5 Flash (196B)',
        detail: 'Claude & OpenAI format',
        color: '#EC4899',
        formats: {
            'anthropic-messages': {
                name: 'Claude Format',
                url: 'https://api.stepfun.ai/anthropic',
                models: ['step-3.5-flash', 'step-3.5-medium', 'step-2-16k']
            },
            'openai-completions': {
                name: 'OpenAI Format',
                url: 'https://api.stepfun.ai/v1',
                models: ['step-3.5-flash', 'step-3.5-medium', 'step-2-16k']
            }
        },
        keyUrl: 'https://platform.stepfun.com',
        docUrl: 'https://github.com/stepfun-ai/Step-3.5'
    },
    // Volcengine (ByteDance)
    volcengine: {
        name: 'Volcengine',
        fullName: 'Volcano Engine Ark',
        desc: 'Doubao / Multi-model',
        detail: 'OpenAI & Claude format',
        color: '#F97316',
        formats: {
            'openai-completions': {
                name: 'Coding Plan',
                url: 'https://ark.cn-beijing.volces.com/api/coding/v3',
                models: ['doubao-seed-code-latest', 'glm-4.7', 'deepseek-v3']
            },
            'anthropic-messages': {
                name: 'Claude Format',
                url: 'https://ark.cn-beijing.volces.com/api/coding',
                models: ['doubao-seed-code-preview-latest']
            }
        },
        keyUrl: 'https://console.volcengine.com/ark',
        docUrl: 'https://www.volcengine.com/docs/ark'
    },
    // xAI (Grok)
    xai: {
        name: 'xAI',
        fullName: 'xAI Grok',
        desc: 'Grok-4',
        detail: 'OpenAI format compatible',
        color: '#000000',
        formats: {
            'openai-completions': {
                name: 'OpenAI Format',
                url: 'https://api.x.ai/v1',
                models: ['grok-4']
            }
        },
        keyUrl: 'https://console.x.ai',
        docUrl: 'https://docs.x.ai'
    },
    // Mistral AI
    mistral: {
        name: 'Mistral',
        fullName: 'Mistral AI',
        desc: 'Mistral Large',
        detail: 'OpenAI format compatible',
        color: '#F45D1F',
        formats: {
            'openai-completions': {
                name: 'OpenAI Format',
                url: 'https://api.mistral.ai/v1',
                models: ['mistral-large-latest', 'pixtral-large-latest', 'codestral-latest']
            }
        },
        keyUrl: 'https://console.mistral.ai',
        docUrl: 'https://docs.mistral.ai'
    },
    // OpenRouter
    openrouter: {
        name: 'OpenRouter',
        fullName: 'OpenRouter',
        desc: '100+ Models Gateway',
        detail: 'OpenAI format compatible',
        color: '#6366F1',
        formats: {
            'openai-completions': {
                name: 'OpenAI Format',
                url: 'https://openrouter.ai/api/v1',
                models: ['anthropic/claude-sonnet-4', 'openai/gpt-4.1', 'google/gemini-2.5-flash']
            }
        },
        keyUrl: 'https://openrouter.ai/keys',
        docUrl: 'https://openrouter.ai/docs'
    },
    // Google Gemini
    gemini: {
        name: 'Gemini',
        fullName: 'Google Gemini',
        desc: 'Gemini 2.5 Pro',
        detail: 'OpenAI format compatible',
        color: '#4285F4',
        formats: {
            'openai-completions': {
                name: 'OpenAI Format',
                url: 'https://generativelanguage.googleapis.com/v1beta',
                models: ['gemini-2.5-flash', 'gemini-2.5-pro']
            }
        },
        keyUrl: 'https://makersuite.google.com/app/apikey',
        docUrl: 'https://ai.google.dev/gemini-api/docs'
    },
    // Custom
    custom: {
        name: 'Custom',
        fullName: 'Custom / Self-hosted',
        desc: 'Any compatible endpoint',
        detail: 'OpenAI / Claude compatible',
        color: '#6B7280',
        formats: {
            'openai-completions': {
                name: 'OpenAI Format',
                url: '',
                models: []
            },
            'anthropic-messages': {
                name: 'Claude Format',
                url: '',
                models: []
            }
        },
        keyUrl: '',
        docUrl: ''
    }
};

// ============================================
// Channel Configuration
// Based on: src/config/zod-schema.channels.ts
// ============================================

const CHANNELS = {
    telegram: {
        name: 'Telegram',
        icon: '📱',
        desc: 'Popular messaging app',
        detail: 'Create bot via @BotFather',
        color: '#0088CC',
        fields: [
            { key: 'botToken', label: 'Bot Token', placeholder: '1234567890:ABCdefGHI...', help: 'Get from @BotFather' }
        ],
        setupUrl: 'https://core.telegram.org/bots/tutorial',
        quickstartScore: 10,
        dmPolicy: 'pairing'
    },
    discord: {
        name: 'Discord',
        icon: '🎮',
        desc: 'Gaming & dev community',
        detail: 'Create Discord app',
        color: '#5865F2',
        fields: [
            { key: 'token', label: 'Bot Token', placeholder: 'MTAw...', help: 'From Discord Developer Portal' }
        ],
        setupUrl: 'https://discord.com/developers/applications',
        quickstartScore: 8,
        dmPolicy: 'pairing'
    },
    feishu: {
        name: 'Feishu/Lark',
        icon: '🪽',
        desc: 'Enterprise collaboration',
        detail: 'Create self-built app',
        color: '#3370FF',
        fields: [
            { key: 'appId', label: 'App ID', placeholder: 'cli_xxx...', help: 'From Feishu Open Platform' },
            { key: 'appSecret', label: 'App Secret', placeholder: '...', help: 'From Feishu Open Platform' }
        ],
        setupUrl: 'https://open.feishu.cn/app',
        quickstartScore: 5,
        dmPolicy: 'pairing',
        pluginName: 'feishu'
    },
    whatsapp: {
        name: 'WhatsApp',
        icon: '💬',
        desc: 'Global messaging platform',
        detail: 'Requires Business API',
        color: '#25D366',
        fields: [
            { key: 'phoneNumber', label: 'Phone Number', placeholder: '+8613800138000', help: 'WhatsApp Business number' }
        ],
        setupUrl: 'https://developers.facebook.com/docs/whatsapp',
        quickstartScore: 9,
        dmPolicy: 'pairing'
    },
    slack: {
        name: 'Slack',
        icon: '💼',
        desc: 'Team collaboration',
        detail: 'Create Slack App',
        color: '#4A154B',
        fields: [
            { key: 'botToken', label: 'Bot Token', placeholder: 'xoxb-...', help: 'From Slack App config' },
            { key: 'appToken', label: 'App Token', placeholder: 'xapp-...', help: 'For Socket Mode (optional)' }
        ],
        setupUrl: 'https://api.slack.com/apps',
        quickstartScore: 6,
        dmPolicy: 'pairing'
    }
};

// ============================================
// Skills Configuration
// ============================================

const SKILLS = [
    { id: 'weather', name: 'Weather', desc: 'Real-time weather info', emoji: '🌤️', needsKey: false },
    { id: 'summarize', name: 'Summarize', desc: 'Auto article/chat summary', emoji: '📝', needsKey: false },
    { id: 'voice-call', name: 'Voice', desc: 'Voice input/output support', emoji: '🎤', needsKey: false },
    { id: 'canvas', name: 'Canvas', desc: 'Visual workspace', emoji: '🎨', needsKey: false },
    { id: 'github', name: 'GitHub', desc: 'GitHub integration', emoji: '🐙', needsKey: true, keyLabel: 'GitHub Token' },
    { id: 'notion', name: 'Notion', desc: 'Notion notes integration', emoji: '📔', needsKey: true, keyLabel: 'Notion API Key' }
];

// ============================================
// HTML Interface
// ============================================

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>OpenClaw Configuration Wizard</title>
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
    content:'>>';
    color:var(--green-dark);
    font-weight:bold
}
.page-subtitle{
    font-size:20px;
    color:#666;
    margin-bottom:25px
}
.provider-grid{
    display:grid;
    grid-template-columns:repeat(5,1fr);
    gap:15px
}
.provider-card{
    padding:20px;
    background:var(--stone-light);
    border:4px solid var(--stone-dark);
    cursor:pointer;
    transition:all 0.15s;
    position:relative;
    text-align:center;
    min-height:140px;
    display:flex;
    flex-direction:column;
    justify-content:center;
    align-items:center
}
.provider-card:hover{
    transform:translate(-3px,-3px);
    box-shadow:6px 6px 0 rgba(0,0,0,0.3);
    border-color:var(--green)
}
.provider-card.selected{
    background:var(--green-light);
    border-color:var(--green-dark);
    box-shadow:6px 6px 0 rgba(0,0,0,0.3)
}
.provider-card.selected::after{
    content:'✓';
    position:absolute;
    top:6px;right:6px;
    width:24px;
    height:24px;
    background:var(--green-dark);
    color:var(--text-light);
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:16px
}
.provider-name{
    font-size:22px;
    font-weight:bold;
    margin-bottom:6px
}
.provider-desc{
    font-size:16px;
    color:#444
}
.form-row{
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:20px;
    margin-bottom:20px
}
.form-group{margin-bottom:20px}
.form-group.full{grid-column:1/-1}
label{
    display:block;
    font-size:22px;
    margin-bottom:8px;
    color:var(--text)
}
input,select{
    width:100%;
    padding:12px 16px;
    font-size:20px;
    font-family:inherit;
    background:#FFF;
    border:3px solid var(--stone-dark);
    color:var(--text)
}
input:focus,select:focus{
    outline:none;
    border-color:var(--green);
    background:#FAFFFA
}
.info-box{
    background:var(--green-light);
    border:3px solid var(--green-dark);
    padding:15px 18px;
    margin-bottom:20px
}
.info-box a{color:#2A5A2F;text-decoration:none}
.info-box a:hover{text-decoration:underline}
.format-btns{
    display:flex;
    gap:10px;
    flex-wrap:wrap;
    margin-bottom:15px
}
.format-btn{
    padding:10px 20px;
    font-size:20px;
    font-family:inherit;
    background:var(--stone-light);
    border:3px solid var(--stone-dark);
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
    padding:12px 40px;
    font-size:24px;
    font-family:inherit;
    cursor:pointer;
    background:linear-gradient(180deg,#A0A0A0 0%,#808080 100%);
    border:3px solid var(--border);
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
    font-size:16px;
    margin-top:4px
}
.channel-grid{
    display:grid;
    grid-template-columns:repeat(3,1fr);
    gap:20px;
    margin-top:15px
}
.channel-card{
    padding:30px 20px;
    background:var(--stone-light);
    border:3px solid var(--stone-dark);
    text-align:center;
    cursor:pointer;
    transition:all 0.15s
}
.channel-card:hover{
    transform:translate(-3px,-3px);
    box-shadow:5px 5px 0 rgba(0,0,0,0.3);
    border-color:var(--green)
}
.channel-card.selected{
    background:var(--green-light);
    border-color:var(--green-dark)
}
.channel-icon{font-size:48px;margin-bottom:8px}
.channel-name{font-size:22px;font-weight:bold}
.channel-desc{font-size:16px;color:#666;margin-top:6px}
.channel-fields{margin-top:25px}
.channel-field{
    margin-bottom:15px;
    text-align:left
}
.channel-field label{
    font-size:18px;
    margin-bottom:6px
}
.channel-field input{
    padding:10px 14px;
    font-size:18px
}
.channel-help{
    font-size:14px;
    color:#666;
    margin-top:4px
}
.skill-list{
    display:grid;
    grid-template-columns:1fr;
    gap:12px;
    margin-top:15px
}
.skill-item{
    padding:15px;
    background:var(--stone-light);
    border:3px solid var(--stone-dark);
    display:flex;
    align-items:center;
    gap:12px
}
.skill-checkbox{
    width:22px;
    height:22px;
    border:3px solid var(--stone-dark);
    cursor:pointer;
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:16px
}
.skill-checkbox.checked{
    background:var(--green);
    border-color:var(--green-dark);
    color:var(--text-light)
}
.skill-info{flex:1}
.skill-name{font-size:22px;font-weight:bold}
.skill-desc{font-size:16px;color:#666}
.success{text-align:center;padding:60px 30px}
.success-icon{
    width:100px;
    height:100px;
    margin:0 auto 25px;
    background:var(--green);
    border:5px solid var(--border);
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:56px;
    color:var(--text-light);
    box-shadow:6px 6px 0 rgba(0,0,0,0.3)
}
.success-links{
    margin-top:30px;
    display:flex;
    flex-direction:column;
    gap:12px
}
.success-link{
    display:block;
    padding:12px 25px;
    background:var(--stone-light);
    border:3px solid var(--stone-dark);
    color:var(--text);
    text-decoration:none;
    font-size:20px
}
.success-link:hover{
    border-color:var(--green);
    background:var(--green-light)
}
.endpoint-select{
    margin-bottom:15px
}
</style>
</head>
<body>
<div class="app-container">
    <div class="header">
        <div class="logo">🦞</div>
        <div class="title-box">
            <h1>OPENCLAW CONFIG WIZARD</h1>
            <p>AI Models · Channels · Skills</p>
        </div>
    </div>
    <div class="progress">
        <div class="progress-step active" id="prog1">1</div>
        <div class="progress-step" id="prog2">2</div>
        <div class="progress-step" id="prog3">3</div>
        <div class="progress-step" id="prog4">4</div>
    </div>

    <div class="content">
        <!-- Page 1: Select Provider -->
        <div class="page active" id="page1">
            <div class="page-title">Select AI Provider</div>
            <div class="page-subtitle">Choose your AI model provider</div>
            <div class="provider-grid" id="providerGrid"></div>
        </div>

        <!-- Page 2: API Config -->
        <div class="page" id="page2">
            <div class="page-title">Configure API Connection</div>
            <div class="page-subtitle">Enter your API credentials</div>
            <div class="info-box">
                <div style="font-size:24px;margin-bottom:6px" id="providerName">-</div>
                <div style="font-size:18px" id="providerDesc"></div>
                <a href="#" target="_blank" id="keyLink">Get API Key →</a>
                <span style="margin:0 8px;color:#666">|</span>
                <a href="#" target="_blank" id="docLink">Documentation →</a>
            </div>

            <div class="form-group full">
                <label>API Format</label>
                <div class="format-btns" id="formatBtns"></div>
            </div>

            <div class="form-group full" id="endpointGroup" style="display:none">
                <label>Endpoint Region</label>
                <select id="endpointSelect" class="endpoint-select"></select>
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

        <!-- Page 3: Channel Config -->
        <div class="page" id="page3">
            <div class="page-title">Configure Channels (Optional)</div>
            <div class="page-subtitle">Add chat platforms for OpenClaw</div>

            <div class="info-box">
                <div style="font-size:16px">Tip: You can add channels later with <code>openclaw channels add</code></div>
            </div>

            <div class="channel-grid" id="channelGrid"></div>

            <div id="channelFields" style="display:none">
                <div class="page-title" style="font-size:26px;margin-top:25px" id="channelConfigTitle">Configure Channel</div>
                <div id="channelFieldsContainer"></div>
            </div>
        </div>

        <!-- Page 4: Skills -->
        <div class="page" id="page4">
            <div class="page-title">Install Skills (Optional)</div>
            <div class="page-subtitle">Select optional extensions</div>

            <div class="info-box">
                <div style="font-size:16px">Skills add extra capabilities like weather, voice, etc.</div>
            </div>

            <div class="skill-list" id="skillList"></div>
        </div>

        <!-- Page 5: Success -->
        <div class="page" id="page5">
            <div class="success">
                <div class="success-icon">✓</div>
                <div class="page-title" style="justify-content:center;font-size:38px">Configuration Complete!</div>
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
const PROVIDERS=${JSON.stringify(PROVIDERS)};
const CHANNELS=${JSON.stringify(CHANNELS)};
const SKILLS=[
    {id:'weather',name:'Weather',desc:'Real-time weather info',emoji:'🌤️',needsKey:false},
    {id:'summarize',name:'Summarize',desc:'Auto content summary',emoji:'📝',needsKey:false},
    {id:'voice-call',name:'Voice',desc:'Voice input/output',emoji:'🎤',needsKey:false},
    {id:'canvas',name:'Canvas',desc:'Visual workspace',emoji:'🎨',needsKey:false}
];

let currentPage=1,selectedProvider='',selectedFormat='',selectedChannels=[],selectedSkills=[],skillKeys={};

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
    title.textContent=\`Configure \${selectedChannels.map(id=>CHANNELS[id].name).join(' + ')}\`;

    fieldsContainer.innerHTML=selectedChannels.map(id=>{
        const ch=CHANNELS[id];
        return \`
            <div style="margin-bottom:20px">
                <div style="font-size:22px;margin-bottom:12px;color:var(--green-dark)">
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
    if(n===4)next.textContent='Save Config';
    else next.textContent='Next →'
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
        // Handle endpoints
        const endpointGroup=document.getElementById('endpointGroup');
        const endpointSelect=document.getElementById('endpointSelect');
        if(f.endpoints){
            endpointGroup.style.display='block';
            endpointSelect.innerHTML=Object.entries(f.endpoints).map(([name,url])=>
                \`<option value="\${name}">\${name}</option>\`
            ).join('');
            endpointSelect.onchange=()=>{
                document.getElementById('apiUrl').value=f.endpoints[endpointSelect.value]
            };
            document.getElementById('apiUrl').value=Object.values(f.endpoints)[0]
        }else{
            endpointGroup.style.display='none';
            document.getElementById('apiUrl').value=f.url||''
        }

        const dl=document.getElementById('modelList');
        dl.innerHTML='';
        if(f.models?.length){
            f.models.forEach(m=>{
                const opt=document.createElement('option');
                opt.value=m;
                dl.appendChild(opt)
            });
            document.getElementById('modelId').placeholder='Example: '+f.models[0]
        }else{
            document.getElementById('modelId').placeholder='Enter model ID, e.g. gpt-4o'
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

    if(!url){document.getElementById('urlError').textContent='! Enter API URL';return false}
    if(!key){document.getElementById('keyError').textContent='! Enter API Key';return false}
    if(!model){document.getElementById('modelError').textContent='! Enter or select Model ID';return false}
    return true
}

function generateToken(){
    return Array.from({length:40},()=>'0123456789abcdef'[Math.floor(Math.random()*16)]).join('')
}

function saveConfig(){
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
            model:{primary:(selectedProvider||'zai')+'/'+document.getElementById('modelId').value.trim()},
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

    // Provider config
    cfg.models.providers[selectedProvider||'zai']={
        baseUrl:document.getElementById('apiUrl').value.trim(),
        apiKey:document.getElementById('apiKey').value.trim(),
        api:selectedFormat,
        models:[{
            id:document.getElementById('modelId').value.trim(),
            name:document.getElementById('modelId').value.trim(),
            reasoning:selectedProvider==='zai'||selectedProvider==='minimax',
            input:['text'],
            cost:{input:0,output:0,cacheRead:0,cacheWrite:0},
            contextWindow:128000,
            maxTokens:8192
        }]
    };

    // Channel config
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

    // Skills config
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
        alert('Save failed: '+e.message);
        document.getElementById('footer').style.display='flex';
        showPage(4)
    })
}

function copyCommands(){
    const cmds=\`OpenClaw Common Commands:

# Check status
openclaw gateway status

# Chat with AI
openclaw agent --message "hi"

# Channel status
openclaw channels status

# Approve pairing
openclaw pairing approve <channel> <code>

# Open dashboard
openclaw dashboard
\`;
    navigator.clipboard.writeText(cmds).then(()=>alert('Commands copied!'))
}

init();
</script>
</body>
</html>`;

// ============================================
// Utility Functions
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
        try{execSync('openclaw gateway stop',{encoding:'utf8',stdio:'ignore',timeout:5000})}catch(e){}
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
// HTTP Server
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
                setTimeout(()=>{
                    startGateway();
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
    console.log('║   OpenClaw Web Config Wizard        ║');
    console.log('╠═══════════════════════════════════════╣');
    console.log('║                                       ║');
    console.log(version?`║   OpenClaw: ${version.padEnd(20)}║`:'║   OpenClaw: Not installed             ║');
    console.log('║                                       ║');
    console.log('║  Access: http://127.0.0.1:'+PORT+'          ║');
    console.log('║                                       ║');
    console.log('╚═══════════════════════════════════════╝\n');

    try{
        spawn('cmd',['/c','start',`http://127.0.0.1:${PORT}`],{detached:true}).unref()
    }catch(e){}
});
