#!/usr/bin/env node

/**
 * OpenClaw Pixel Config Server Launcher
 * 游戏风格配置向导
 */

const path = require('path');
const { spawn } = require('child_process');

// 获取项目根目录的 web-config.js
const webConfigPath = path.join(__dirname, '..', 'web-config.js');

// 启动像素风格配置服务
const child = spawn('node', [webConfigPath], {
    stdio: 'inherit',
    shell: true
});

// 处理退出信号
process.on('SIGINT', () => {
    child.kill('SIGINT');
});

process.on('SIGTERM', () => {
    child.kill('SIGTERM');
});

child.on('exit', (code) => {
    process.exit(code || 0);
});
