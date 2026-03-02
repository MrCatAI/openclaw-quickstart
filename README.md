# OpenClaw Quickstart

[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen)](https://nodejs.org)

One-click installer for OpenClaw with guided configuration for AI models and chat channels (Telegram, Discord, Feishu, WhatsApp, Slack).

[中文文档](#中文文档)

## Quick Install

### Windows (PowerShell)

```powershell
iwr -useb https://raw.githubusercontent.com/MrCatAI/openclaw-quickstart/master/install.ps1 | iex
```

### Windows (CMD)

```cmd
curl -fsSL https://raw.githubusercontent.com/MrCatAI/openclaw-quickstart/master/install.cmd -o install.cmd && install.cmd
```

### Linux/macOS

```bash
curl -fsSL https://raw.githubusercontent.com/MrCatAI/openclaw-quickstart/master/install.sh | bash
```

## What This Does

1. Checks dependencies (Node.js 22+)
2. Launches web configuration wizard
3. Saves model + channel config to `~/.openclaw/openclaw.json`
4. Starts OpenClaw Gateway automatically

## Supported AI Providers

| Provider | API Format | Models | Notes |
|----------|------------|--------|-------|
| **Z.AI (GLM)** | OpenAI / Claude | glm-5, glm-4.7 | Dual format support |
| **MiniMax** | Claude | M2.5, M2.1 | Claude-compatible |
| **Kimi (Moonshot)** | OpenAI | kimi-k2.5 | 1T params |
| **Kimi Coding** | Claude | k2p5 | Coding-optimized |
| **DeepSeek** | OpenAI | deepseek-chat, deepseek-v3 | High value |
| **Qwen** | OpenAI | qwen3.5-max | Alibaba |
| **StepFun** | Claude / OpenAI | step-3.5-flash | Dual format |
| **Volcengine** | OpenAI / Claude | doubao, glm, kimi | Multi-model subscription |
| **OpenAI** | OpenAI | gpt-4.1, o3-mini | Official |
| **Anthropic** | Claude | claude-sonnet-4-6 | Official |
| **xAI** | OpenAI | grok-4 | Grok |
| **Custom** | OpenAI / Claude | Any | Self-hosted |

## API Formats Explained

### OpenAI Format (`openai-completions`)
- Compatible with most LLM providers
- Uses `/v1/chat/completions` endpoint
- Recommended for: Z.AI, Kimi, DeepSeek, Qwen

### Claude Format (`anthropic-messages`)
- Native Anthropic API format
- Required for: Anthropic Claude
- Supported by: MiniMax, Kimi Coding, StepFun

## Supported Channels

| Channel | Setup | Features |
|---------|--------|----------|
| **Telegram** | [@BotFather](https://t.me/BotFather) | Popular messaging |
| **Discord** | [Discord Dev Portal](https://discord.com/developers) | Gaming community |
| **Feishu/Lark** | [Feishu Open](https://open.feishu.cn/app) | Enterprise |
| **WhatsApp** | [Business API](https://developers.facebook.com/docs/whatsapp) | Global |
| **Slack** | [Slack API](https://api.slack.com/apps) | Team collab |

## Skills (Optional Extensions)

| Skill | Description |
|-------|-------------|
| 🌤️ Weather | Real-time weather info |
| 📝 Summarize | Auto content summary |
| 🎤 Voice | Voice input/output |
| 🎨 Canvas | Visual workspace |

## Common Commands

```bash
# Web configuration
npx openclaw-web-config

# Start Gateway
npx openclaw@latest gateway

# Check status
npx openclaw@latest gateway status

# Chat with AI
npx openclaw@latest agent --message "hi"

# Channel management
npx openclaw@latest channels status
npx openclaw@latest channels add telegram

# Skills
npx openclaw@latest skills list
npx openclaw@latest skills install weather
```

## Configuration File

Location: `~/.openclaw/openclaw.json`

Example structure:
```json
{
  "models": {
    "providers": {
      "zai": {
        "baseUrl": "https://open.bigmodel.cn/api/paas/v4",
        "apiKey": "your-api-key",
        "api": "openai-completions",
        "models": [{"id": "glm-5", "name": "GLM-5"}]
      }
    }
  },
  "agents": {
    "defaults": {
      "model": {"primary": "zai/glm-5"}
    }
  },
  "channels": {
    "telegram": {
      "dmPolicy": "pairing",
      "botToken": "your-bot-token"
    }
  }
}
```

## Troubleshooting

### Port already in use

Web config uses port 18792, Gateway uses 18789.

**Windows:**
```powershell
Get-NetTCPConnection -LocalPort 18792 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

**Linux/macOS:**
```bash
lsof -ti:18792 | xargs kill -9
```

### Gateway won't start

Check config syntax:
```bash
npx openclaw-quickstart verify
```

### npx errors

Update npm:
```bash
npm install -g npm@latest
```

## Repository Structure

```
openclaw-quickstart/
├── install.ps1      # Windows PowerShell installer
├── install.sh       # Linux/macOS installer
├── install.cmd      # Windows CMD installer
├── web-config.js    # Web configuration wizard
├── verify.js        # Configuration verification tool
├── bin/cli.js       # CLI configuration wizard
└── package.json
```

## License

MIT

---

# 中文文档

## 一键安装

### Windows (PowerShell)

```powershell
iwr -useb https://raw.githubusercontent.com/MrCatAI/openclaw-quickstart/master/install.ps1 | iex
```

### 国内镜像

```powershell
iwr -useb https://mirror.ghproxy.com/https://raw.githubusercontent.com/MrCatAI/openclaw-quickstart/master/install.ps1 | iex
```

## 支持的国产大模型

| 提供商 | API 格式 | 模型 | 说明 |
|--------|----------|------|------|
| **智谱 AI (Z.AI)** | OpenAI / Claude | glm-5, glm-4.7 | 双格式支持 |
| **MiniMax** | Claude | M2.5, M2.1 | Claude 兼容 |
| **月之暗面 (Kimi)** | OpenAI | kimi-k2.5 | 1T 参数 |
| **Kimi Coding** | Claude | k2p5 | 编码优化 |
| **深度求索 (DeepSeek)** | OpenAI | deepseek-chat, deepseek-v3 | 高性价比 |
| **通义千问 (Qwen)** | OpenAI | qwen3.5-max | 阿里云 |
| **阶跃星辰 (StepFun)** | Claude / OpenAI | step-3.5-flash | 双格式 |
| **火山方舟** | OpenAI / Claude | 豆包, GLM, Kimi | 聚合订阅 |
