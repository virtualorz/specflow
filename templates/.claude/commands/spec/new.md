---
description: 建立一個新的 specflow 變更提案,產生資料夾與 issue.md template
argument-hint: <task-name>
allowed-tools: Read, Write, Bash(test:*)
---

# /spec:new — 建立新的 specflow 提案

使用者要求建立一個新的 specflow 提案,task name 為:`$ARGUMENTS`

## 你的任務

### Step 1:驗證 task name

檢查 `$ARGUMENTS` 是否符合命名規則:

- 只允許小寫英文字母 `a-z` 跟 hyphen `-`
- 長度 5~50 字元
- 不可開頭或結尾為 hyphen
- 不可連續兩個 hyphen
- 正則:`^[a-z]+(-[a-z]+)*$`

若不符合,**立即停止**並告訴使用者違反哪一條,給出修正建議。
範例:`Refactor_Controller`(❌ 含底線與大寫)、`重構-proxy`(❌ 含中文)、
`refactor-controller-and-readme`(✅)。

### Step 2:檢查 issue.md 是否已存在

執行:

!`test -f specflow/changes/$ARGUMENTS/issue.md`

若 exit code = 0(檔案已存在)→ **立即停止**並告訴使用者
「specflow/changes/$ARGUMENTS/issue.md 已存在,請改用其他名稱或刪除既有資料夾」。

### Step 3:確認 specflow/project.md 存在

執行:

!`test -f specflow/project.md`

若 exit code != 0(檔案不存在)→ **立即停止**並提醒使用者:
「specflow/project.md 不存在。這是 specflow 流程的核心規範檔,
請先建立此檔案後再執行 /spec:new。可參考 .claude/skills/specflow/SKILL.md 的說明。」

### Step 4:讀取 issue.md template

使用 **Read 工具**讀取 `.claude/skills/specflow/templates/issue.md` 的完整內容。

### Step 5:寫入新檔案(替換標題占位符)

使用 **Write 工具**將 Step 4 讀到的 template 內容寫入:

`specflow/changes/$ARGUMENTS/issue.md`

Write 工具會自動建立必要的父目錄(`specflow/changes/$ARGUMENTS/`),
**不需要先用 bash mkdir**。

#### 標題占位符替換

template 第一行是:

```
# Issue: <一句話標題,描述你想做什麼>
```

寫入時,**只替換這一行的占位符**,改成:

```
# Issue: <task-name 的中文翻譯> (<原 task-name>)
```

範例:

- `init-migration-data` → `# Issue: 初始化 migration 資料 (init-migration-data)`
- `refactor-campaign-proxy` → `# Issue: 重構 campaign proxy (refactor-campaign-proxy)`
- `add-helper-function` → `# Issue: 新增 helper function (add-helper-function)`

翻譯原則:

- 動詞用中文(`refactor` → 重構、`add` → 新增、`fix` → 修正、`init` → 初始化)
- **技術名詞保留英文**(migration、controller、helper、API、proxy 等)
- 翻譯只是輔助理解的初稿,**使用者填 issue.md 時可以自由修改**

⚠️ **只替換第一行的占位符,其他所有 `<...>` 占位符保持原樣**,
讓使用者填寫。template 中的「想解決的問題」、「期望的結果」、「範圍限制」
等區塊的占位符不可動。

### Step 6:回報結果

簡短告知使用者:

> ✅ 已建立 `specflow/changes/$ARGUMENTS/issue.md`
>
> 請填寫該檔案。**「範圍限制」區塊為必填**,空白會導致 `/spec:design` 拒絕產出。
>
> 完成後執行:`/spec:design $ARGUMENTS`

## 重要原則

- **不要嘗試替使用者填寫 issue.md** —— 即使你看得出他想做什麼,讓使用者自己寫
- **不要進入 design 階段** —— 你的任務在建立 issue.md 後就結束
- **使用 Write 工具而非 bash mkdir/cp** —— Write 會自動建立父目錄,避免 Claude Code 的目錄建立權限限制
