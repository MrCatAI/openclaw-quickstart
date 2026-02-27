# OpenClaw 快速安装器

一键安装 OpenClaw 并配置自定义模型和聊天渠道。

## 🦞 什么是 OpenClaw？

OpenClaw 是一个强大的 AI 个人助手，可以：

- 🤖 **多模型支持** - 使用 GPT-4o、Claude、DeepSeek、Kimi 等各种 AI 模型
- 💬 **多平台对话** - 在 Telegram、Discord、飞书等平台与 AI 助手对话
- ⚡ **自动化任务** - 自动处理消息、执行命令、管理日程等
- 🔒 **本地运行** - 在您自己的设备上运行，保护隐私

## 🚀 快速开始

### 方式 1：一键安装脚本

**macOS / Linux:**
```bash
curl -fsSL https://raw.githubusercontent.com/MrCatAI/openclaw-quickstart/main/install.sh | bash
```

**Windows PowerShell:**
```powershell
iwr -useb https://raw.githubusercontent.com/MrCatAI/openclaw-quickstart/main/install.ps1 | iex
```

**Windows CMD:**
```cmd
curl -fsSL https://raw.githubusercontent.com/MrCatAI/openclaw-quickstart/main/install.cmd -o install.cmd && install.cmd && del install.cmd
```

### 方式 2：npm 包

```bash
npx openclaw-quickstart
```

## 📋 安装流程

安装器将引导您完成以下步骤：

```
第 0 步：检查环境
├── 检测 Node.js ≥ 22
└── 自动安装 OpenClaw

第 1 步：配置 AI 模型
├── 选择 API 类型 (openai-responses / anthropic-messages)
├── 输入 API 地址
├── 输入 API Key
├── 输入模型 ID
└── 配置高级选项 (可选)

第 2 步：配置聊天渠道 (可选)
├── 📱 Telegram 机器人
├── 🎮 Discord 机器人
└── 🪽 飞书/Lark 机器人

第 3 步：启动服务
└── 自动启动 Gateway
```

## 🌍 支持的模型提供商

### 国际模型

| 提供商 | 模型 | API 地址 |
|--------|------|----------|
| **OpenAI** | GPT-4o, GPT-4-turbo | https://api.openai.com/v1 |
| **Anthropic** | Claude Sonnet, Claude Opus | https://api.anthropic.com |

### 国内模型

| 提供商 | 模型 | API 地址 |
|--------|------|----------|
| **DeepSeek** | DeepSeek-V3 | https://api.deepseek.com/v1 |
| **Kimi (月之暗面)** | Kimi K2 | https://api.moonshot.cn/v1 |
| **智谱 GLM** | GLM-4, GLM-4-Plus | https://open.bigmodel.cn/api/paas/v4 |
| **通义千问** | Qwen-Turbo, Qwen-Plus | https://dashscope.aliyuncs.com/compatible-mode/v1 |

### 本地模型

| 提供商 | 模型 | API 地址 |
|--------|------|----------|
| **Ollama** | Llama, Qwen, DeepSeek | http://127.0.0.1:11434/v1 |

## 📱 支持的聊天渠道

### Telegram

Telegram 是一款流行的即时通讯应用，您可以在 Telegram 中与 AI 助手对话。

**配置步骤：**
1. 在 Telegram 中搜索 `@BotFather`
2. 发送 `/newbot` 命令
3. 按提示设置机器人名称
4. 复制返回的 Token

**详细教程：** https://core.telegram.org/bots/tutorial

### Discord

Discord 是一款流行的社群聊天应用，特别受游戏玩家和开发者欢迎。

**配置步骤：**
1. 访问 https://discord.com/developers/applications
2. 点击 `New Application` 创建应用
3. 左侧菜单选择 `Bot`，点击 `Add Bot`
4. 启用 `Message Content Intent` 和 `Server Members Intent`
5. 点击 `Reset Token` 获取 Token
6. 在 `OAuth2` 页面生成邀请链接，将机器人添加到服务器

### 飞书 / Lark

飞书是字节跳动推出的企业协作平台，在国内和国际分别叫飞书和 Lark。

**配置步骤：**
1. 访问 https://open.feishu.cn/app (国际版: https://open.larksuite.com/app)
2. 点击 `创建企业自建应用`
3. 在 `凭证与基础信息` 页面获取 App ID 和 App Secret
4. 在 `权限管理` 中添加权限：
   - `im:message` (获取与发送消息)
   - `im:message:send_as_bot` (以应用身份发消息)
5. 在 `应用功能 → 机器人` 中启用机器人
6. 在 `事件订阅` 中：
   - 选择 `使用长连接接收事件`
   - 添加事件: `im.message.receive_v1`
7. 创建版本并提交发布

## 🛠️ 常用命令

安装完成后，您可以使用以下命令：

### 基本操作

```bash
# 在命令行与 AI 助手对话
openclaw agent --message '你好'

# 查看服务状态
openclaw gateway status

# 停止服务
openclaw gateway stop

# 启动服务
openclaw gateway start

# 打开 Web 管理界面
openclaw dashboard
```

### 渠道管理

```bash
# 查看所有渠道状态
openclaw channels status

# 查看配对请求
openclaw pairing list

# 批准配对 (首次使用需要)
openclaw pairing approve telegram <代码>
openclaw pairing approve discord <代码>
openclaw pairing approve feishu <代码>
```

### 配置管理

```bash
# 查看配置
cat ~/.openclaw/openclaw.json

# 编辑配置
nano ~/.openclaw/openclaw.json
# 或
code ~/.openclaw/openclaw.json

# 运行诊断
openclaw doctor
```

## 📁 文件位置

| 文件 | 路径 |
|------|------|
| 配置文件 | `~/.openclaw/openclaw.json` |
| 工作目录 | `~/.openclaw/workspace/` |
| 日志文件 | `~/.openclaw/logs/` |

## ⚙️ 配置文件示例

```json5
{
  agent: {
    workspace: "~/.openclaw/workspace",
    model: { primary: "custom/gpt-4o" }
  },
  models: {
    mode: "merge",
    providers: {
      "custom": {
        baseUrl: "https://api.openai.com/v1",
        apiKey: "sk-your-api-key",
        api: "openai-responses",
        models: [
          {
            id: "gpt-4o",
            name: "GPT-4o",
            contextWindow: 128000,
            maxTokens: 8192
          }
        ]
      }
    }
  },
  channels: {
    telegram: {
      enabled: true,
      botToken: "1234567890:ABCdefGHI...",
      dmPolicy: "pairing",
      groupPolicy: "open"
    }
  },
  session: {
    dmScope: "per-channel-peer"
  }
}
```

## 🔧 系统要求

- **Node.js**: v22 或更高版本
- **操作系统**: macOS, Linux, Windows (推荐 WSL2)

## ❓ 常见问题

### 1. Node.js 版本过低

```bash
# macOS (Homebrew)
brew install node@22

# Linux (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Windows (winget)
winget install OpenJS.NodeJS.LTS
```

### 2. 首次使用机器人没有响应

首次使用需要在聊天平台中向机器人发送消息，然后批准配对：

```bash
# 查看配对请求
openclaw pairing list

# 批准配对
openclaw pairing approve telegram <代码>
```

### 3. 如何更换模型

编辑配置文件 `~/.openclaw/openclaw.json`，修改 `models.providers.custom` 部分。

### 4. 如何添加更多渠道

编辑配置文件 `~/.openclaw/openclaw.json`，在 `channels` 部分添加新渠道配置。

## 📚 相关链接

- **OpenClaw 官网**: https://openclaw.ai
- **官方文档**: https://docs.openclaw.ai
- **GitHub**: https://github.com/openclaw/openclaw
- **问题反馈**: https://github.com/openclaw/openclaw/issues

## 📄 许可证

MIT License