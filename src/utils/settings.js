/**
 * 自動設置 .claude/settings.local.json 的 specflow allow list
 *
 * 行為:
 * - 詢問使用者是否要自動寫入(預設 N,安全)
 * - y → 讀現有 settings(若有)、merge specflow 需要的 allow、寫回、加進 .gitignore
 * - n / 無回應 → 跳過,印手動貼的指引
 *
 * 設計上不覆蓋使用者既有的 settings 欄位,只 merge permissions.allow 清單(去重)。
 * 若該檔已經包含所有 specflow allow → 提示「已是最新」並跳過。
 */

import { existsSync } from 'node:fs';
import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const SETTINGS_PATH = '.claude/settings.local.json';
const GITIGNORE_PATH = '.gitignore';

// specflow 的 .md slash commands 用到的 Bash 命令前綴
const SPECFLOW_PERMISSIONS = [
  'Bash(cd:*)',
  'Bash(node:*)',
  'Bash(git rev-parse:*)',
];

/**
 * @param {{ cwd: string, autoYes?: boolean }} opts
 * @returns {Promise<'written' | 'merged' | 'no-change' | 'skipped' | 'failed'>}
 */
export async function setupClaudeSettings({ cwd, autoYes = false }) {
  const settingsPath = join(cwd, SETTINGS_PATH);
  const gitignorePath = join(cwd, GITIGNORE_PATH);

  // ── 1. 讀現有 settings(若有) ─────────────────
  let existing = null;
  if (existsSync(settingsPath)) {
    try {
      existing = JSON.parse(await readFile(settingsPath, 'utf-8'));
    } catch (err) {
      console.log(`\n⚠️  ${SETTINGS_PATH} 存在但無法解析:${err.message}`);
      console.log(`   跳過自動寫入。請手動加入以下 allow 設定:`);
      printManualHint();
      return 'failed';
    }
  }

  // ── 2. 已含所有 specflow allow → 無事可做 ───
  const existingAllow = existing?.permissions?.allow ?? [];
  const missing = SPECFLOW_PERMISSIONS.filter(p => !existingAllow.includes(p));
  if (missing.length === 0) {
    console.log(`\n✨ ${SETTINGS_PATH} 已含所有 specflow allow 設定,無需修改。`);
    return 'no-change';
  }

  // ── 3. 詢問使用者 ───────────────────────────
  console.log(`\n🔐 specflow 想把以下 Bash allow 加進 ${SETTINGS_PATH}:`);
  for (const p of missing) console.log(`   - ${p}`);
  console.log(`\n   這樣 Claude 跑 /spec:* 時不會每次問你確認 cd / node / git rev-parse。`);
  console.log(`   (此檔是個人設定,會自動加進 .gitignore 不 commit。)`);

  if (!autoYes) {
    const rl = createInterface({ input, output });
    const answer = (await rl.question('\n要自動寫入嗎? (y/N) ')).trim().toLowerCase();
    rl.close();
    if (answer !== 'y' && answer !== 'yes') {
      console.log(`\n已跳過。若日後想自己加,參考以下設定:`);
      printManualHint();
      return 'skipped';
    }
  }

  // ── 4. Merge + 寫入 ─────────────────────────
  const merged = existing ?? {};
  merged.permissions = merged.permissions ?? {};
  merged.permissions.allow = Array.from(new Set([...existingAllow, ...SPECFLOW_PERMISSIONS]));

  await writeFile(settingsPath, JSON.stringify(merged, null, 2) + '\n', 'utf-8');
  console.log(`\n✅ 已寫入 ${SETTINGS_PATH}`);

  // ── 5. 加進 .gitignore ──────────────────────
  const gitignoreLine = '.claude/settings.local.json';
  let needAppend = true;
  let gitignoreExisted = existsSync(gitignorePath);
  if (gitignoreExisted) {
    const gitignore = await readFile(gitignorePath, 'utf-8');
    if (gitignore.split('\n').some(l => l.trim() === gitignoreLine)) {
      needAppend = false;
    }
  }
  if (needAppend) {
    const prefix = gitignoreExisted ? '\n' : '';
    await appendFile(gitignorePath, `${prefix}${gitignoreLine}\n`, 'utf-8');
    console.log(`✅ 已將 ${gitignoreLine} 加進 .gitignore`);
  }

  return existing ? 'merged' : 'written';
}

function printManualHint() {
  console.log(`
  在 ${SETTINGS_PATH} 加入(若該檔不存在則新建):

  {
    "permissions": {
      "allow": [
${SPECFLOW_PERMISSIONS.map(p => `        ${JSON.stringify(p)}`).join(',\n')}
      ]
    }
  }

  並把 ${SETTINGS_PATH} 加進 .gitignore。
`);
}
