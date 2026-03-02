# OpenClaw Quickstart

一键安装 OpenClaw，并引导完成模型与渠道配置（Telegram / Discord / Feishu），最后自动启动 Gateway。

## 一键安装（官方同款命令形态）

### 官方入口（openclaw.ai）

```powershell
iwr -useb https://openclaw.ai/install.ps1 | iex
```

```cmd
curl -fsSL https://openclaw.ai/install.cmd -o install.cmd && install.cmd && del install.cmd
```

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

### 自建入口（YOUR_DOMAIN）

将 `YOUR_DOMAIN` 替换为你的安装域名（如 `https://install.example.com`）。

```powershell
$env:OPENCLAW_QUICKSTART_BASE_URL='https://YOUR_DOMAIN'
iwr -useb https://YOUR_DOMAIN/install.ps1 | iex
```

```cmd
set OPENCLAW_QUICKSTART_BASE_URL=https://YOUR_DOMAIN && curl -fsSL https://YOUR_DOMAIN/install.cmd -o install.cmd && install.cmd && del install.cmd
```

```bash
curl -fsSL https://YOUR_DOMAIN/install.sh | bash
```

## 安装流程会做什么

1. 检查并安装依赖（Node.js 22+）。
2. 安装或更新 OpenClaw。
3. 启动配置向导（优先 Web 配置页）。
4. 保存模型 + 渠道配置到 `~/.openclaw/openclaw.json`。
5. 启动 `openclaw gateway`。
6. 配置完成后关闭 Web 配置服务。

## 模型套餐与提供商（已整理）

以下组合已在 `web-config.js` 预置，可在向导中直接选择。

| 套餐/提供商 | API Base URL | 推荐模型 ID | API 类型 |
|---|---|---|---|
| Volcengine Coding Plan | `https://ark.cn-beijing.volces.com/api/coding/v3` | `ark-code-latest`, `doubao-seed-code`, `glm-4.7`, `kimi-k2.5` | `openai-completions` |
| BytePlus Coding Plan | `https://ark.ap-southeast.bytepluses.com/api/coding/v3` | `ark-code-latest`, `doubao-seed-code`, `glm-4.7`, `kimi-k2.5` | `openai-completions` |
| Bailian Coding Plan | `https://coding.dashscope.aliyuncs.com/v1` | `qwen-coder-plus`, `qwen-plus` | `openai-completions` |
| OpenAI | `https://api.openai.com/v1` | `gpt-5`, `gpt-5.1-codex`, `gpt-5.3-codex` | `openai-responses` |
| Anthropic Claude | `https://api.anthropic.com` | `claude-sonnet-4-5`, `claude-opus-4-6` | `anthropic-messages` |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat`, `deepseek-reasoner` | `openai-completions` |
| Kimi / Moonshot | `https://api.moonshot.ai/v1` | `kimi-k2.5`, `kimi-k2-thinking` | `openai-completions` |
| Kimi Coding | `https://api.kimi.com/coding/` | `k2p5` | `anthropic-messages` |
| GLM | `https://open.bigmodel.cn/api/paas/v4` | `glm-4.6`, `glm-4.7`, `glm-4.7-flash` | `openai-completions` |
| Qwen | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-plus`, `qwen-max`, `qwen3-coder-plus` | `openai-completions` |
| MiniMax | `https://api.minimax.io/anthropic` | `MiniMax-M2.5`, `MiniMax-M2.5-Lightning`, `MiniMax-M2.1` | `anthropic-messages` |
| Ollama（本地） | `http://127.0.0.1:11434` | `llama3.3:latest`, `deepseek-r1:latest` | `ollama` |
| LM Studio（本地） | `http://127.0.0.1:1234/v1` | `local-model` | `openai-completions` |

## 支持渠道

- Telegram
- Discord
- Feishu / Lark

## 启动与关闭

```bash
openclaw gateway status
openclaw gateway stop
openclaw gateway start
```

Web 配置向导端口默认 `18792`，如需手动关闭：

```powershell
Get-NetTCPConnection -LocalPort 18792 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

```bash
lsof -ti:18792 | xargs kill -9
```

## 关键文件

- 安装脚本：`install.ps1` / `install.cmd` / `install.sh`
- Web 配置向导：`web-config.js`
- 最终配置：`~/.openclaw/openclaw.json`