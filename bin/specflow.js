#!/usr/bin/env node

/**
 * specflow CLI 入口
 *
 * 使用方式:
 *   npx @virtualorz/specflow init      在當前專案安裝 specflow
 *   npx @virtualorz/specflow update    升級已安裝的 specflow
 *   npx @virtualorz/specflow --version 顯示版本
 *   npx @virtualorz/specflow --help    顯示說明
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

import { runInit } from '../src/commands/init.js';
import { runUpdate } from '../src/commands/update.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pkg = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')
);

const HELP_TEXT = `
specflow v${pkg.version}
專為 Claude Code 設計的輕量規格驅動開發工作流。

使用方式:
  npx @virtualorz/specflow <command>

指令:
  init           在當前專案安裝 specflow
  update         升級已安裝的 specflow 至最新版
  --version, -v  顯示版本
  --help, -h     顯示此說明

範例:
  npx @virtualorz/specflow init       # 在當前目錄安裝
  npx @virtualorz/specflow update     # 升級到最新版
  npx @virtualorz/specflow --version  # 查看版本

文件:
  https://github.com/virtualorz/specflow
`.trim();

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  // 無參數或 --help / -h
  if (!command || command === '--help' || command === '-h') {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  // --version / -v
  if (command === '--version' || command === '-v') {
    console.log(pkg.version);
    process.exit(0);
  }

  // init 指令
  if (command === 'init') {
    try {
      await runInit({ packageRoot: join(__dirname, '..') });
      process.exit(0);
    } catch (err) {
      console.error(`\n❌ 錯誤: ${err.message}\n`);
      process.exit(1);
    }
  }

  // update 指令
  if (command === 'update') {
    try {
      await runUpdate({ packageRoot: join(__dirname, '..') });
      process.exit(0);
    } catch (err) {
      console.error(`\n❌ 錯誤: ${err.message}\n`);
      process.exit(1);
    }
  }

  // 未知指令
  console.error(`\n❌ 未知指令: ${command}\n`);
  console.log(HELP_TEXT);
  process.exit(1);
}

main();
