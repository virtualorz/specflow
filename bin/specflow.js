#!/usr/bin/env node

/**
 * specflow CLI 入口
 * 使用方式:
 *   npx @virtualorz/specflow init
 *   npx @virtualorz/specflow --version
 *   npx @virtualorz/specflow --help
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

import { runInit } from '../src/commands/init.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 讀取 package.json 取得版本號
const pkg = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')
);

const HELP_TEXT = `
specflow v${pkg.version}
A lightweight spec-driven development workflow for Claude Code.

Usage:
  npx @virtualorz/specflow <command>

Commands:
  init           Install specflow into the current project
  --version, -v  Show version
  --help, -h     Show this help

Examples:
  npx @virtualorz/specflow init       # Install in current directory
  npx @virtualorz/specflow --version  # Check version

Documentation:
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
      console.error(`\n❌ Error: ${err.message}\n`);
      process.exit(1);
    }
  }

  // 未知指令
  console.error(`\n❌ Unknown command: ${command}\n`);
  console.log(HELP_TEXT);
  process.exit(1);
}

main();
