/**
 * specflow init 指令
 *
 * 行為:
 * 1. 檢查當前目錄是否已有 .claude/skills/specflow/ 或 specflow/
 *    - 任一存在 → 提示已安裝,中止
 * 2. 複製 templates/.claude/ → 當前目錄/.claude/
 * 3. 複製 templates/specflow/ → 當前目錄/specflow/
 * 4. 顯示後續步驟
 */

import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { copyDirRecursive } from '../utils/copy.js';

export async function runInit({ packageRoot }) {
  const cwd = process.cwd();
  const targetClaude = join(cwd, '.claude');
  const targetSpecflow = join(cwd, 'specflow');

  // ── Step 1: 檢查是否已安裝 ──────────────────
  const claudeExists = existsSync(join(targetClaude, 'skills', 'specflow'));
  const specflowExists = existsSync(targetSpecflow);

  if (claudeExists || specflowExists) {
    console.error('\n⚠️  specflow appears to be already installed in this directory:\n');
    if (claudeExists) console.error(`   - ${join('.claude', 'skills', 'specflow')}/ exists`);
    if (specflowExists) console.error(`   - specflow/ exists`);
    console.error('\nTo update an existing installation, please use:');
    console.error('   npx @virtualorz/specflow update    (coming soon)\n');
    console.error('Or manually remove the above directories and re-run init.\n');
    throw new Error('Already installed');
  }

  // ── Step 2 & 3: 複製檔案 ──────────────────
  const sourceClaude = join(packageRoot, 'templates', '.claude');
  const sourceSpecflow = join(packageRoot, 'templates', 'specflow');

  console.log('\n📦 Installing specflow...\n');

  console.log('  Copying .claude/ ...');
  await copyDirRecursive(sourceClaude, targetClaude);

  console.log('  Copying specflow/ ...');
  await copyDirRecursive(sourceSpecflow, targetSpecflow);

  // ── Step 4: 顯示後續步驟 ──────────────────
  console.log(`
✅ specflow has been installed.

📁 Created:
   .claude/
   ├── skills/specflow/         (skill definition + templates)
   └── commands/spec/           (slash commands: new, design, task, run)

   specflow/
   ├── project.md               (⚠️  REQUIRED: edit this with your project rules)
   └── changes/                 (your specs will live here)

📝 Next steps:

   1. Edit specflow/project.md to define YOUR project rules
      (technical stack, architecture constraints, naming conventions, etc.)

   2. Restart Claude Code or open a new session so it picks up
      the new slash commands (/spec:new, /spec:design, /spec:task, /spec:run)

   3. Start your first spec:
      /spec:new my-first-task

   4. Commit the installation:
      git add .claude/ specflow/
      git commit -m "chore: install specflow"

📚 Documentation: https://github.com/virtualorz/specflow
`);
}
