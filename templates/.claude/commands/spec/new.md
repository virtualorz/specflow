---
description: 建立一個新的 specflow 變更提案,自動編號、開分支、產生 issue.md template
argument-hint: <自由輸入,中文或英文 slug 都可>
allowed-tools: Read, Write, Bash(test:*), Bash(ls:*), Bash(date:*), Bash(git rev-parse:*), Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(git symbolic-ref:*)
---

# /spec:new — 建立新的 specflow 提案

使用者輸入:`$ARGUMENTS`

這個輸入可能是自然語言描述(中文或混合)、也可能是英文 slug。
你的任務是把它轉成「`NNNN-<英文-slug>`」格式的編號 task,
並做完所有 git 安全檢查後才實際建立檔案與分支。

⚠️ 本指令會先讀 `specflow/project.md` 的 `git_flow` 設定:
- `git_flow: enabled`(預設) → 走完整流程,包含 git repo 檢查、base_branch 檢查、自動開分支
- `git_flow: disabled` → **跳過所有 git 操作**,只建立 spec 資料夾與 issue.md。
  分支管理由使用者自行處理。

## 你的任務

### Step 1:定位專案根並確認 specflow/project.md 存在

⚠️ **本步用 Bash 工具探測,不用載入時的內嵌 ``!`...` ``**。原因:內嵌 ``!`...` ``
在載入時執行,其 CWD 不保證等於專案根(monorepo 子目錄或異常 session CWD 下,
相對路徑 `specflow/...` 會誤報找不到,但 git 指令仍正常)。改用 Bash 工具並先校正 CWD。

**使用 Bash 工具**執行:

```
test -f specflow/project.md && echo "ROOT_OK" || echo "NEED_RELOCATE"
```

- 輸出 `ROOT_OK` → CWD 已在專案根,進入 Step 2
- 輸出 `NEED_RELOCATE` → **使用 Bash 工具**切到 git repo 根再測一次:

  ```
  cd "$(git rev-parse --show-toplevel 2>/dev/null)" && test -f specflow/project.md && echo "RELOCATED:$(pwd)" || echo "NO_SPECFLOW"
  ```

  - 輸出 `RELOCATED:<path>` → 已切到專案根(Bash 工具 CWD 在後續調用間持久),進入 Step 2
  - 輸出 `NO_SPECFLOW` → **立即停止**並告知:
    「specflow/project.md 不存在。這是 specflow 流程的核心規範檔,請先確認你在含有 `specflow/` 的專案目錄、且已建立此檔案後再執行 /spec:new。可參考 .claude/skills/specflow/SKILL.md 的說明。」

⚠️ 完成本步後,後續所有相對路徑命令都以這個校正後的 CWD 為基準。

### Step 2:讀取 project.md 取得 git_flow 與 base_branches 設定

使用 **Read 工具**讀取 `specflow/project.md`。

從檔案最上方的 YAML frontmatter(兩個 `---` 之間)解析:

#### 解析 `git_flow`

- 若 frontmatter 存在且有 `git_flow` 鍵 → 使用該值(`enabled` / `disabled`)
- 若 frontmatter 不存在、或沒有 `git_flow` 鍵 → **預設為 `enabled`**(向後相容)

把解析結果記為 `git_flow`。

#### 解析 `base_branches`

- 若 frontmatter 存在且有 `base_branches` 鍵 → 使用該清單
- 若 frontmatter 不存在、或沒有 `base_branches` 鍵 → 使用預設值
  `[dev, development, develop, main]`

把解析結果記為 `base_branches`。

⚠️ 若 `git_flow == "disabled"`,後續所有與 git 相關的 Step(3、4、5、8 後半、9)都**跳過**,但仍要做檔案層面的工作(Step 6、7、8 前半、10、11、12、13)。

完成 Step 2 解析後若是 disabled,**先告知使用者**再進入後續流程:

> ℹ️ 偵測到 `git_flow: disabled`,本次將跳過分支建立與 git 安全檢查,只建立 spec 資料夾。

### Step 3:[若 git_flow=enabled] 確認在 git repo 內、且至少有一個 commit

⚠️ 若 `git_flow == "disabled"` → **整個 Step 3 跳過**,直接進入 Step 6(Step 4、5 也跳過)。

⚠️ 以下 git 探測**用 Bash 工具**執行(不用載入時的內嵌 ``!`...` ``),確保跑在 Step 1 校正後的 CWD 上。**使用 Bash 工具**:

```
git rev-parse --is-inside-work-tree 2>/dev/null || echo "NOT_GIT_REPO"
```

若輸出包含 `NOT_GIT_REPO` → **立即停止**並告知:
「specflow 假設你在 git repo 內操作。請先 `git init`,並建立至少一個 commit 後再執行 /spec:new。

如果你的專案不打算用 git,可以在 `specflow/project.md` 的 frontmatter 設定 `git_flow: disabled` 後再執行。」

接著確認有 initial commit(否則後續 `git rev-parse HEAD` 會炸)。**使用 Bash 工具**:

```
git rev-parse --verify HEAD 2>/dev/null || echo "NO_INITIAL_COMMIT"
```

若輸出包含 `NO_INITIAL_COMMIT` → **立即停止**並告知:

> 目前 repo 還沒有任何 commit(沒有 initial commit)。請先做一個 commit 再執行 /spec:new,例如:
>
> ```
> git add .
> git commit -m "chore: initial commit (specflow install)"
> ```
>
> 因為 /spec:new 要從目前分支拉出新分支,沒 commit 就沒分支可拉。
>
> (或在 `specflow/project.md` 設 `git_flow: disabled` 略過 git 整合。)

### Step 4:[若 git_flow=enabled] 檢查目前分支在 base_branches 之內

⚠️ 若 `git_flow == "disabled"` → **整個 Step 4 跳過**。`base_branch` 變數設為 `null`(後續 Step 12 會用到)。

**使用 Bash 工具**執行:

```
git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "DETACHED_OR_ERROR"
```

把輸出記為 `current_branch`,**同時**記為 `base_branch`(這個值要保留到 Step 12
寫入 issue.md frontmatter,因為 Step 9 切到新分支後 `current_branch` 就會變)。

若輸出是 `DETACHED_OR_ERROR` → **立即停止**並告知:
「無法取得目前分支(可能在 detached HEAD 狀態)。請先 `git checkout <base_branch>` 切到正常分支後再執行。」

若 `current_branch` **不在** `base_branches` 清單中 →
**立即停止**並告知:

> 目前在 `<current_branch>` 分支,/spec:new 必須從以下分支之一開始:
> `<base_branches 清單>`
>
> 請先 `git checkout <base_branch>` 後再執行。
>
> 若你的團隊使用其他 base branch,可在 `specflow/project.md` 的 frontmatter
> 修改 `base_branches` 設定。

### Step 5:[若 git_flow=enabled] 檢查 working tree 是否乾淨

⚠️ 若 `git_flow == "disabled"` → **整個 Step 5 跳過**。

**使用 Bash 工具**執行:

```
git status --porcelain 2>/dev/null
```

判斷規則(只在 `git_flow == "enabled"` 時執行):

- 輸出**為空** → working tree 乾淨,通過此步
- 輸出**非空**(有未 commit 的變更或未追蹤檔案)→ **立即停止**並告知:

> Working tree 不乾淨,有未 commit 的變更:
>
> ```
> <git status --porcelain 的輸出>
> ```
>
> 請先 `git commit` 或 `git stash` 後再執行 /spec:new,
> 避免這些變更被帶到新建的 spec 分支上。

### Step 6:計算下一個編號

列出現有 spec 資料夾。**使用 Bash 工具**執行(CWD 已在 Step 1 校正):

```
ls -1 specflow/changes/ 2>/dev/null
```

若輸出為空(目錄不存在或沒有任何資料夾)→ **視為「還沒有任何 spec」**,`next_number = "0001"`(Step 12 的 Write 工具會自動建立 `specflow/changes/` 父目錄,不需先 mkdir)。

否則從輸出中**過濾出符合 `^[0-9]{4}-` 格式的資料夾名稱**(忽略 `.gitkeep`、舊式無編號資料夾、或其他雜項):

- 若一個都沒有 → `next_number = "0001"`
- 若有 → 取所有編號中的**最大值** + 1,以 4 位數零填補
  - 例:現有 `0001-x`、`0003-y` → max = 3 → `next_number = "0004"`(注意:用 max 不是用「資料夾數量」,刪掉的編號不會回收)

### Step 7:決定 slug

判斷 `$ARGUMENTS` 是否已經是合法英文 slug:

- 合法 slug 規則:`^[a-z]+(-[a-z]+)*$`(只有小寫字母與 hyphen,長度 5~50)
- ✅ 合法:`refactor-controller`、`add-helper-function`
- ❌ 不合法:`重構 proxy`、`Refactor Controller`、`fix bug #123`

#### 7a:若 `$ARGUMENTS` 已是合法 slug

`slug = $ARGUMENTS`,直接使用。

#### 7b:若 `$ARGUMENTS` 不是合法 slug(中文或自由文字)

**你**(Claude)依下列原則產出 slug:

- 全部小寫
- 只用 `a-z` 與 hyphen
- 動詞用對應的英文(重構→`refactor`、新增→`add`、修正→`fix`、初始化→`init`、移除→`remove`、優化→`optimize` 等)
- **技術名詞保留**(controller、proxy、migration、API 等中英文都直接使用)
- 移除冗詞(「的」「相關的」「一些」)
- 控制長度在 3~6 個 hyphen-separated 詞之間,讓資料夾名好讀
- 範例:
  - `重構 campaign proxy` → `refactor-campaign-proxy`
  - `新增 user repository 的快取層` → `add-user-repository-cache`
  - `修掉那個 webhook 重複觸發的 bug` → `fix-webhook-duplicate-trigger`

把產出的字串記為 `slug`。**不需要問使用者確認**,直接進入下一步;
若使用者覺得 slug 不好,看到 Step 13 的回報後可以自行 `mv` 資料夾與重新命名分支。

### Step 8:組合最終 task-name 與檢查分支不存在

`task_name = "{next_number}-{slug}"`(例:`0001-refactor-campaign-proxy`)

⚠️ 若 `git_flow == "disabled"` → 組好 `task_name` 後**直接跳到 Step 10**(Step 8 後半與 Step 9 都跳過)。

確認對應分支不存在。**使用 Bash 工具**執行(把 `TASK_NAME` 替換成上面組好的 `task_name`):

```
git rev-parse --verify "refs/heads/TASK_NAME"
```

⚠️ 不要用 `!\`...\`` 內嵌語法寫這條,因為 Claude Code 的權限檢查會把 `<...>` 形式的占位符當成 shell redirect 而失敗。所有需要 Claude 替換變數的命令都要透過 Bash 工具直接呼叫,不可走 `!\`...\``。

若 exit code = 0(分支已存在,通常是先前殘留)→ **立即停止**並告知:

> 分支 `<task_name>` 已存在。這通常是先前 /spec:new 中斷後的殘留。
>
> 請手動處理:
> - 若該分支已無用:`git branch -D <task_name>`
> - 若想繼續使用:`git checkout <task_name>` 後 review 既有檔案

### Step 9:[若 git_flow=enabled] 建立並切換到新分支

⚠️ 若 `git_flow == "disabled"` → **整個 Step 9 跳過**。

**使用 Bash 工具**執行(把 `TASK_NAME` 替換成上面組好的 `task_name`):

```
git checkout -b TASK_NAME
```

(同樣不能用 `!\`...\`` 寫,理由同 Step 8。)

成功後 `current_branch = task_name`。

### Step 10:讀取 issue.md template

使用 **Read 工具**讀取 `.claude/skills/specflow/templates/issue.md` 的完整內容。

### Step 11:取得今日日期

!`date +%Y-%m-%d`

把輸出記為 `created_at`(例:`2026-05-07`)。

### Step 12:寫入新檔案(替換 frontmatter 與標題占位符)

使用 **Write 工具**將 Step 10 讀到的 template 內容寫入:

`specflow/changes/<task_name>/issue.md`

Write 工具會自動建立必要的父目錄,**不需要先用 bash mkdir**。

寫入時要做**三處**占位符替換:

#### 替換 1:frontmatter 的 `<BASE_BRANCH>`

template 開頭的 frontmatter 是:

```yaml
---
base_branch: <BASE_BRANCH>
created_at: <CREATED_AT>
---
```

依 `git_flow` 設定處理:

- **`git_flow == "enabled"`**:把 `<BASE_BRANCH>` 換成 Step 4 記下的 `base_branch`(例:`dev`)
- **`git_flow == "disabled"`**:把 `<BASE_BRANCH>` 換成 `null`(沒有 base 分支可記)。`/spec:close` 在 disabled 模式下不會用到這個欄位

#### 替換 2:frontmatter 的 `<CREATED_AT>`

把 `<CREATED_AT>` 換成 Step 11 記下的 `created_at`(例:`2026-05-07`)。

#### 替換 3:標題占位符

template 緊接 frontmatter 之後的第一行 markdown 是:

```
# Issue: <一句話標題,描述你想做什麼>
```

把這一行替換成:

```
# Issue: <中文標題> (<task_name>)
```

「中文標題」依輸入來源決定:

- **若 Step 7 走 7a 分支(使用者輸入英文 slug)**:你產出對應的中文翻譯
  - 例:`refactor-campaign-proxy` → `重構 campaign proxy`
- **若 Step 7 走 7b 分支(使用者輸入中文/自由文字)**:**直接使用使用者原本的輸入**(不要重新翻譯、不要修飾)
  - 例:使用者輸入「重構 campaign proxy」→ 標題就是「重構 campaign proxy」

⚠️ 上述三處之外,**其他所有 `<...>` 占位符保持原樣**,讓使用者填寫
(範圍限制、想解決的問題等區塊)。

### Step 13:回報結果

#### 若 `git_flow == "enabled"`

簡短告知使用者:

> ✅ 已建立 spec change
>
> - 資料夾:`specflow/changes/<task_name>/issue.md`
> - 分支:`<task_name>`(已切換)
>
> 請編輯 `specflow/changes/<task_name>/issue.md` 填寫內容。
> **「範圍限制」區塊為必填**,空白會導致 `/spec:design` 拒絕產出。
>
> 完成後執行:`/spec:design <task_name>`
>
> 若你不喜歡這個 slug,現在還沒有後續檔案引用它,可手動:
> - `git branch -m <new-name>` 改分支名
> - `mv specflow/changes/<task_name> specflow/changes/<new-name>` 改資料夾名

#### 若 `git_flow == "disabled"`

簡短告知使用者:

> ✅ 已建立 spec change(`git_flow: disabled` 模式)
>
> - 資料夾:`specflow/changes/<task_name>/issue.md`
> - 分支:**未建立**(由你自行決定是否要開分支)
>
> 請編輯 `specflow/changes/<task_name>/issue.md` 填寫內容。
> **「範圍限制」區塊為必填**,空白會導致 `/spec:design` 拒絕產出。
>
> 完成後執行:`/spec:design <task_name>`
>
> ⚠️ disabled 模式下,`/spec:run` **不會檢查當前分支**——請自行確保在正確的 git 狀態下執行。`/spec:close` 也只會做 task.md 完整性檢查,不會自動 commit / merge。

## 重要原則

- **嚴格按 Step 1~5 順序檢查,任一失敗就停下** —— 不要為了「讓使用者順利」而跳過 git 檢查(disabled 模式下整段才會跳過)
- **編號用 max + 1 而非 count + 1** —— 刪除過的編號不要回收
- **base_branches 從 project.md frontmatter 讀** —— 沒有就用預設,不要寫死
- **git_flow 預設 enabled** —— 沒設定就維持原本行為,確保升級向後相容
- **不要嘗試替使用者填寫 issue.md 內文** —— 即使你看得出他想做什麼,讓使用者自己寫
- **不要進入 design 階段** —— 你的任務在建立 issue.md(與分支,若啟用)後就結束
- **使用 Write 工具而非 bash mkdir/cp** —— Write 會自動建立父目錄
- **slug 不需要跟使用者確認** —— 編號保證唯一,使用者不滿意可自行改名
