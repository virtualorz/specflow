/**
 * specflow update 指令
 *
 * 行為:
 * 1. 檢查 .claude/skills/specflow/ 是否存在(若無提示先 init)
 * 2. 讀取已安裝版本(從 .specflow-version),跟 package 版本比對
 * 3. 列出將被覆蓋的檔案,詢問使用者是否繼續
 * 4. 覆蓋 .claude/skills/specflow/ 跟 .claude/commands/spec/
 *    - 絕對不動 specflow/project.md
 *    - 絕對不動 specflow/changes/
 * 5. 更新 .specflow-version
 * 6. 提示使用者用 git diff 審查變更
 */

import { existsSync } from 'node:fs';
import { readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { copyDirRecursive } from '../utils/copy.js';
import { setupClaudeSettings } from '../utils/settings.js';

export async function runUpdate({ packageRoot }) {
  const cwd = process.cwd();
  const targetClaude = join(cwd, '.claude');
  const targetSkill = join(targetClaude, 'skills', 'specflow');
  const targetCommands = join(targetClaude, 'commands', 'spec');
  const targetSpecflow = join(cwd, 'specflow');

  // ── Step 1: 確認已安裝 ──────────────────
  if (!existsSync(targetSkill)) {
    console.error('\n⚠️  此目錄尚未安裝 specflow。\n');
    console.error('請先執行:');
    console.error('   npx @virtualorz/specflow init\n');
    throw new Error('Not installed');
  }

  // ── Step 2: 讀版本 ──────────────────
  const pkgJson = JSON.parse(
    await readFile(join(packageRoot, 'package.json'), 'utf-8')
  );
  const newVersion = pkgJson.version;

  const versionFile = join(targetSkill, '.specflow-version');
  let currentVersion = 'unknown';
  if (existsSync(versionFile)) {
    currentVersion = (await readFile(versionFile, 'utf-8')).trim();
  }

  console.log(`\n📦 specflow update`);
  console.log(`   已安裝版本: ${currentVersion}`);
  console.log(`   套件版本:   ${newVersion}\n`);

  if (currentVersion === newVersion) {
    console.log('✨ 已經是最新版本,無需升級。\n');
    console.log('如果你想強制重新覆蓋檔案(例如手動改壞了想還原),');
    console.log('可以先刪除 .claude/skills/specflow/.specflow-version 再執行 update。\n');
    return;
  }

  // ── Step 3: 顯示變更範圍並詢問 ──────────────────
  console.log('🔄 此次升級會覆蓋以下目錄:');
  console.log('   .claude/skills/specflow/');
  console.log('   .claude/commands/spec/\n');
  console.log('🛡️  以下目錄不會被動到(你的專案規範與工作軌跡):');
  console.log('   specflow/project.md');
  console.log('   specflow/changes/\n');
  console.log('⚠️  如果你曾手動修改過 .claude/ 底下的檔案(例如客製 SKILL.md 或 slash command),');
  console.log('   你的修改將會被覆蓋。建議先確認 git status 是否乾淨。\n');

  const rl = createInterface({ input, output });
  const answer = (await rl.question('要繼續嗎? (y/N) ')).trim().toLowerCase();
  rl.close();

  if (answer !== 'y' && answer !== 'yes') {
    console.log('\n已取消,沒有任何檔案被修改。\n');
    return;
  }

  // ── Step 4: 覆蓋檔案 ──────────────────
  console.log('\n📦 升級中...\n');

  // 先刪除舊的目錄,再複製新的(避免新版少了某個檔案而舊版殘留)
  console.log('  移除舊版 .claude/skills/specflow/ ...');
  await rm(targetSkill, { recursive: true, force: true });

  console.log('  移除舊版 .claude/commands/spec/ ...');
  await rm(targetCommands, { recursive: true, force: true });

  // 從 package templates 複製
  const sourceSkill = join(packageRoot, 'templates', '.claude', 'skills', 'specflow');
  const sourceCommands = join(packageRoot, 'templates', '.claude', 'commands', 'spec');

  console.log('  複製新版 .claude/skills/specflow/ ...');
  await copyDirRecursive(sourceSkill, targetSkill);

  console.log('  複製新版 .claude/commands/spec/ ...');
  await copyDirRecursive(sourceCommands, targetCommands);

  // ── Step 5: 更新版本標記 ──────────────────
  await writeFile(versionFile, newVersion + '\n', 'utf-8');

  // ── Step 6: 詢問是否寫入 / 更新 settings.local.json ──
  await setupClaudeSettings({ cwd });

  // ── Step 7: 完成提示 ──────────────────
  console.log(`
✅ specflow 已升級至 v${newVersion}

📝 接下來:

   1. 重啟 Claude Code 或開新 session,讓它載入新版的 SKILL.md 與 slash commands

   2. 用 git diff 審查這次升級造成的變更:
      git diff .claude/

   3. 確認沒問題後 commit:
      git add .claude/
      git commit -m "chore: update specflow to v${newVersion}"

📚 變更紀錄: https://github.com/virtualorz/specflow/releases
`);
}
