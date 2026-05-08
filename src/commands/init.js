/**
 * specflow init 指令
 *
 * 行為:
 * 1. 檢查當前目錄是否已有 .claude/skills/specflow/ 或 specflow/
 *    - 任一存在 → 提示已安裝,中止
 * 2. 複製 templates/.claude/ → 當前目錄/.claude/
 * 3. 複製 templates/specflow/ → 當前目錄/specflow/
 * 4. 寫入 .claude/skills/specflow/.specflow-version (記錄安裝版本)
 * 5. 顯示後續步驟
 */

import { existsSync } from 'node:fs';
import { writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { copyDirRecursive } from '../utils/copy.js';

export async function runInit({ packageRoot }) {
  const cwd = process.cwd();
  const targetClaude = join(cwd, '.claude');
  const targetSpecflow = join(cwd, 'specflow');

  // ── Step 1: 檢查是否已安裝 ──────────────────
  const claudeExists = existsSync(join(targetClaude, 'skills', 'specflow'));
  const specflowExists = existsSync(targetSpecflow);

  if (claudeExists || specflowExists) {
    console.error('\n⚠️  specflow 似乎已經安裝在當前目錄:\n');
    if (claudeExists) console.error(`   - ${join('.claude', 'skills', 'specflow')}/ 已存在`);
    if (specflowExists) console.error(`   - specflow/ 已存在`);
    console.error('\n若要升級已安裝的版本,請使用:');
    console.error('   npx @virtualorz/specflow update\n');
    console.error('或手動移除以上目錄後重新執行 init。\n');
    throw new Error('Already installed');
  }

  // ── Step 2 & 3: 複製檔案 ──────────────────
  const sourceClaude = join(packageRoot, 'templates', '.claude');
  const sourceSpecflow = join(packageRoot, 'templates', 'specflow');

  console.log('\n📦 安裝 specflow 中...\n');

  console.log('  複製 .claude/ ...');
  await copyDirRecursive(sourceClaude, targetClaude);

  console.log('  複製 specflow/ ...');
  await copyDirRecursive(sourceSpecflow, targetSpecflow);

  // ── Step 4: 寫入版本標記 ──────────────────
  const pkgJson = JSON.parse(
    await readFile(join(packageRoot, 'package.json'), 'utf-8')
  );
  const versionFile = join(targetClaude, 'skills', 'specflow', '.specflow-version');
  await writeFile(versionFile, pkgJson.version + '\n', 'utf-8');

  // ── Step 5: 顯示後續步驟 ──────────────────
  console.log(`
✅ specflow 已安裝完成 (v${pkgJson.version})

📁 已建立:
   .claude/
   ├── skills/specflow/         (skill 定義 + templates)
   └── commands/spec/           (slash commands: new, design, task, run)

   specflow/
   ├── project.md               (⚠️  必填: 編輯這份檔案,寫入你的專案規範)
   └── changes/                 (你的 spec 任務會放在這裡)

📝 接下來:

   1. 編輯 specflow/project.md,定義你專案的規範
      (技術棧、架構約束、命名慣例等)

   2. 重啟 Claude Code 或開新 session,讓它載入新的 slash commands
      (/spec:new, /spec:design, /spec:run, /spec:close)

   3. 切到 base branch(預設 dev / development / develop / main),
      確認 working tree 乾淨,然後開始你的第一個 spec:
      /spec:new 你想做的事(中文或英文 slug 都可以)

   4. 把 specflow 的安裝 commit 進 git:
      git add .claude/ specflow/
      git commit -m "chore: install specflow"

📚 文件: https://github.com/virtualorz/specflow
`);
}
