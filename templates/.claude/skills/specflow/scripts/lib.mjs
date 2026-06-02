// lib.mjs — specflow CLI 腳本共用 utility
//
// 所有 .mjs(new.mjs / design-preflight.mjs / run-preflight.mjs / close-preflight.mjs)
// 都會用到的純技術操作:CLI 解析、JSON verdict 輸出、git 包裝、檔案讀取、
// 專案根定位、frontmatter 解析、spec change 探測。
//
// 業務邏輯(硬閘門組合、訊息文案、產 design/task 規範)仍在各支 .mjs 內。

import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync } from 'node:fs';

// ── CLI / 系統 ──────────────────────────────────────

export function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) args[a.slice(2)] = argv[++i];
  }
  return args;
}

export function emit(payload) {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

export function halt(reason, message) {
  emit({
    verdict: 'halt',
    haltReason: reason,
    haltMessage: message,
  });
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function tryGit(gitArgs) {
  const r = spawnSync('git', gitArgs, { encoding: 'utf8' });
  if (r.status !== 0) return null;
  return r.stdout.trim();
}

// ── 專案根定位與 metadata ──────────────────────────

// 副作用:成功的話 process.chdir 到專案根。
// 回傳 true=CWD 已在含 specflow/project.md 的目錄;false=找不到。
export function relocateToProjectRoot() {
  if (existsSync('specflow/project.md')) return true;
  const top = tryGit(['rev-parse', '--show-toplevel']);
  if (top) {
    try { process.chdir(top); } catch { /* ignore */ }
  }
  return existsSync('specflow/project.md');
}

// 讀 project.md frontmatter + 內容
// 回傳 { gitFlow, baseBranches, content } 或 null(檔案不存在)
// - gitFlow:有則用該值(小寫),沒有則預設 'enabled'
// - baseBranches:有則用該清單,沒有則預設 ['dev', 'development', 'develop', 'main']
export function readProjectMetadata() {
  if (!existsSync('specflow/project.md')) return null;
  const content = readFileSync('specflow/project.md', 'utf8');
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const fm = fmMatch ? fmMatch[1] : '';

  const gitFlow = (fm.match(/^[ \t]*git_flow[ \t]*:[ \t]*['"]?(\w+)['"]?/m)?.[1] ?? 'enabled').toLowerCase();

  const bbRaw = fm.match(/^[ \t]*base_branches[ \t]*:[ \t]*\[(.*?)\]/m)?.[1];
  const baseBranches = bbRaw
    ? bbRaw.split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)
    : ['dev', 'development', 'develop', 'main'];

  return { gitFlow, baseBranches, content };
}

// ── git 狀態 ───────────────────────────────────────

// 回傳 { inGitRepo, hasInitialCommit, currentBranch }
// - currentBranch:detached HEAD 或無 HEAD 時為 null
export function probeGitState() {
  const inGitRepo = tryGit(['rev-parse', '--is-inside-work-tree']) === 'true';
  const hasInitialCommit = inGitRepo && tryGit(['rev-parse', '--verify', 'HEAD']) !== null;
  let currentBranch = null;
  if (inGitRepo && hasInitialCommit) {
    currentBranch = tryGit(['rev-parse', '--abbrev-ref', 'HEAD']);
    if (currentBranch === 'HEAD') currentBranch = null; // detached
  }
  return { inGitRepo, hasInitialCommit, currentBranch };
}

// ── spec change 探測 ──────────────────────────────

// 列出 specflow/changes/ 內所有符合 NNNN- 格式的資料夾名(已排序)
// 回傳 ['0001-foo', '0002-bar', ...];目錄不存在回 []
export function listSpecChanges() {
  try {
    return readdirSync('specflow/changes', { withFileTypes: true })
      .filter(d => d.isDirectory() && /^\d{4}-/.test(d.name))
      .map(d => d.name)
      .sort();
  } catch {
    return [];
  }
}

// 解析使用者輸入的 task name(支援數字簡寫)
// 接受:純數字 '2' / '0002' / 完整 task name '0002-foo'
// 回傳:完整 task_name | null(純數字時找不到對應資料夾)
// 注意:非純數字輸入直接回傳原字串,不檢查資料夾是否存在(呼叫端需自行用 readSpecChangeFile 確認)
export function resolveTaskName(arg, existing) {
  if (/^\d+$/.test(arg)) {
    const padded = arg.padStart(4, '0');
    return existing.find(name => name.startsWith(`${padded}-`)) ?? null;
  }
  return arg;
}

// 讀某個 spec change 內的指定檔案內容
// 回傳檔案內容字串 | null(檔案不存在)
// 用 fs 直接讀,**沒有 Claude Code 工具層的快取問題**(這正是用 .mjs 取代 cat 繞快取的根本解)
export function readSpecChangeFile(taskName, file) {
  const path = `specflow/changes/${taskName}/${file}`;
  if (!existsSync(path)) return null;
  return readFileSync(path, 'utf8');
}
