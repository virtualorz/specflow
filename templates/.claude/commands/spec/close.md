---
description: 把目前 spec 分支的變更合併回 base branch(no-ff merge,自動產生中文 summary commit;git_flow=disabled 時改為僅做完整性檢查與 summary 產生)
argument-hint: (git_flow=enabled 時不需要;git_flow=disabled 時需傳 task-name 或編號簡寫)
allowed-tools: Read, Bash(test:*), Bash(ls:*), Bash(cat:*), Bash(grep:*), Bash(date:*), Bash(git:*)
---

# /spec:close — 收尾並合併回 base branch

⚠️ 這個指令的行為依 `specflow/project.md` 的 `git_flow` 設定而不同:

**`git_flow: enabled`(預設)**:
1. 在 spec 分支上 commit 未存檔的變更(若有)
2. 切到 base branch 執行 `git merge --no-ff` 把 spec 分支合進去

兩個 commit 訊息都會用同一個自動產生的中文 summary。

**`git_flow: disabled`**:
1. 只做 task.md 完整性檢查(未勾選任務?執行後備註空白?)
2. 印出建議的 summary commit 訊息
3. **不做任何 git 操作**(commit / checkout / merge 全部跳過)
4. 由使用者自行決定後續 git 流程

## 你的任務

⚠️ **本指令全程用 Bash 工具探測狀態,不依賴載入時的內嵌 ``!`...` ``**。
原因:內嵌 ``!`...` `` 在載入時執行,其 CWD 不保證等於專案根(monorepo 子目錄或
異常 session CWD 下,相對路徑 `specflow/...`、`.git/...` 會誤報,但 git 子命令仍正常)。
改用 Bash 工具並先校正 CWD,可同時根除這個問題與「`ls` exit 2 導致載入 abort」。

### Step 0-root:校正 Bash 工具 CWD 到專案根

**使用 Bash 工具**執行:

```
test -f specflow/project.md && echo "ROOT_OK" || echo "NEED_RELOCATE"
```

- 輸出 `ROOT_OK` → CWD 已在專案根,進入 Step 1
- 輸出 `NEED_RELOCATE` → **使用 Bash 工具**切到 git repo 根再測一次:

  ```
  cd "$(git rev-parse --show-toplevel 2>/dev/null)" && test -f specflow/project.md && echo "RELOCATED:$(pwd)" || echo "NO_SPECFLOW"
  ```

  - 輸出 `RELOCATED:<path>` → 已切到專案根(Bash 工具 CWD 在後續調用間持久),進入 Step 1
  - 輸出 `NO_SPECFLOW` → **立即停止**:「找不到 `specflow/project.md`,請確認你在含有 `specflow/` 的專案目錄、且已安裝 specflow。」

⚠️ 完成本步後,後續所有相對路徑命令(含 `.git/...`、`specflow/...`)都以這個校正後的 CWD 為基準。

### Step 1:讀取 specflow/project.md 取得 git_flow 與 base_branches 設定

`specflow/project.md` 已在 Step 0-root 確認存在。使用 **Read 工具**讀取 `specflow/project.md`。

從 frontmatter 解析:

- `git_flow`:有則用該值,沒有則預設 `enabled`(向後相容)
- `base_branches`:有則用該清單,沒有則預設 `[dev, development, develop, main]`

把結果記為 `git_flow` 與 `base_branches`。

⚠️ 從這裡開始,所有後續 Step 都會依 `git_flow` 分流。每個 Step 開頭會明示是否要跳過。

### Step 2:[若 git_flow=enabled] 確認在 git repo 內

⚠️ 若 `git_flow == "disabled"` → **整個 Step 2 跳過**,直接進入 Step 3。

**使用 Bash 工具**執行:

```
git rev-parse --is-inside-work-tree 2>/dev/null || echo "NOT_GIT_REPO"
```

若輸出是 `NOT_GIT_REPO` → **立即停止**:「specflow 假設你在 git repo 內操作。若你不打算用 git,可在 project.md 設 `git_flow: disabled`。」

### Step 3:[若 git_flow=enabled] 確認沒處於未完成的 merge / rebase / cherry-pick

⚠️ 若 `git_flow == "disabled"` → **整個 Step 3 跳過**。

**使用 Bash 工具**執行(用 `git rev-parse --git-path` 取得正確的 .git 路徑,避免 worktree / submodule 下 `.git` 不是目錄的情況;同時不受 CWD 影響):

```
for f in MERGE_HEAD REBASE_HEAD CHERRY_PICK_HEAD rebase-merge rebase-apply; do test -e "$(git rev-parse --git-path $f)" && echo "FOUND:$f"; done; echo "DONE"
```

若輸出**含任何 `FOUND:`**(代表有殘留的 merge/rebase/cherry-pick 狀態)→
**立即停止**:

> ❌ 偵測到未完成的 merge/rebase/cherry-pick 狀態。
> 請先 `git status` 確認、解完衝突後 `git commit` 或 `git rebase --continue` /
> `git merge --abort` / `git rebase --abort` 收尾,再重跑 /spec:close。

若輸出只有 `DONE`(沒有任何 `FOUND:`)→ 乾淨,繼續 Step 4。

### Step 4:取得 spec_branch(視 git_flow 分流)

#### Step 4a:若 `git_flow == "enabled"` — 從當前分支推導

**使用 Bash 工具**執行:

```
git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "NO_HEAD"
```

把輸出記為 `spec_branch`。若 `NO_HEAD` → 立即停止:「無法取得目前分支(空 repo 或 detached HEAD),/spec:close 無法處理。」

驗證是否符合 `^[0-9]{4}-[a-z]+(-[a-z]+)*$`:

- ❌ 不符合 → 立即停止:
  > 目前在 `<spec_branch>` 分支,/spec:close 必須在 spec 分支(`NNNN-<slug>`)上執行。
  > 例如:`0001-refactor-campaign-proxy`。

#### Step 4b:若 `git_flow == "disabled"` — 從 $ARGUMENTS 解析

若 `$ARGUMENTS` 為空 → **立即停止**:

> ❌ `git_flow: disabled` 模式下,/spec:close 需要明確傳入 task-name 或編號簡寫。
>
> 例如:
> - `/spec:close 0001-refactor-campaign-proxy`
> - `/spec:close 0001`
> - `/spec:close 1`

列出現有 spec change 資料夾。**使用 Bash 工具**執行(CWD 已在 Step 0-root 校正):

```
ls -1 specflow/changes/ 2>/dev/null
```

把輸出記為 `existing_folders`(可能為空)。

解析 `$ARGUMENTS` 成 `spec_branch`:

- 若 `$ARGUMENTS` 是**純數字**(`^[0-9]+$`)→ 補零成 4 位數(`PADDED`),在 `existing_folders` 中找開頭是 `<PADDED>-` 的資料夾:
  - 找到 → `spec_branch` = 該資料夾名
  - 找不到 → 立即停止:「找不到編號 `<PADDED>` 對應的 spec change 資料夾。可用編號:`<列出 existing_folders 中符合格式者>`」
- 否則(完整 task name)→ `spec_branch = $ARGUMENTS`

驗證 `spec_branch` 對應的資料夾存在:

**使用 Bash 工具**執行(把 `SPEC_BRANCH` 替換為解析得到的值):

```
test -d specflow/changes/SPEC_BRANCH
```

非 0 → 立即停止:「找不到 `specflow/changes/<spec_branch>/`。」

⚠️ 從這裡開始,變數名雖叫 `spec_branch`,但 disabled 模式下它指的是 task 資料夾名,而非實際 git 分支。

### Step 5:【硬閘門】確認 issue.md 存在

**使用 Bash 工具**執行(把 `SPEC_BRANCH` 替換成 Step 4 的 `spec_branch`):

```
test -f specflow/changes/SPEC_BRANCH/issue.md
```

⚠️ 本檔案中所有需要替換變數的命令都必須透過 Bash 工具呼叫,**不可**用 `!\`...\``,因為 Claude Code 的權限檢查會把 `<...>` 占位符當成 shell redirect 而失敗。

非 0 → **立即停止**:
> 找不到 `specflow/changes/<spec_branch>/issue.md`。
> 這個分支/資料夾不像是用 /spec:new 建立的,/spec:close 無法處理。

### Step 6:[若 git_flow=enabled] 解析 issue.md frontmatter,取得 base_branch

⚠️ 若 `git_flow == "disabled"` → **整個 Step 6 跳過**(disabled 模式下不需要 base_branch,因為不會做 merge)。

使用 **Read 工具**讀取 `specflow/changes/<spec_branch>/issue.md`。

從**檔案最上方**(兩個 `---` 之間)的 YAML frontmatter 解析 `base_branch` 鍵:

- 若 frontmatter 不存在、或沒有 `base_branch` 鍵、或 `base_branch` 是 `null` → **立即停止**:

  > ❌ 找不到 base_branch frontmatter(或值為 null)。
  >
  > 請在 `specflow/changes/<spec_branch>/issue.md` 最上方加入:
  >
  > ```yaml
  > ---
  > base_branch: dev
  > created_at: 2026-05-07
  > ---
  > ```
  >
  > (`base_branch` 換成這個 spec 當初是從哪個分支拉出來的)
  >
  > 加完後重跑 /spec:close。
  >
  > ⚠️ 這個欄位是 v0.3+ 才開始寫的,升級前建立的 spec change 需要手動補。
  > 若是當初在 `git_flow: disabled` 模式下建立的 spec change,你可以:
  > - 把 project.md 暫時切回 `git_flow: disabled` 走簡化流程(不會做 merge),或
  > - 填上實際的 base_branch 後維持 enabled 走完整 merge 流程。

- 取到 `base_branch` 值 → 繼續

### Step 7:[若 git_flow=enabled] 驗證 base_branch 在本地真的存在

⚠️ 若 `git_flow == "disabled"` → **整個 Step 7 跳過**。

**使用 Bash 工具**執行(把 `BASE_BRANCH` 替換成 Step 6 取到的 `base_branch`):

```
git rev-parse --verify "refs/heads/BASE_BRANCH"
```

非 0 → **立即停止**:
> ❌ frontmatter 紀錄的 base_branch `<base_branch>` 在本地不存在
> (可能被刪了、或 frontmatter 寫錯)。
> 請手動修正 issue.md 的 base_branch 後重跑 /spec:close。

(額外檢查)若 `base_branch` 不在 Step 1 取得的 `base_branches` 清單裡,**警告但繼續**:
> ⚠️ frontmatter 的 base_branch `<base_branch>` 不在 project.md 的 base_branches
> 清單 `<list>` 中。仍然會嘗試合併,但建議檢查是否有設定錯誤。

### Step 8:【硬閘門】驗證 task.md 完整性

#### 8a:task.md 存在

**使用 Bash 工具**執行(`SPEC_BRANCH` = Step 4 的值):

```
test -f specflow/changes/SPEC_BRANCH/task.md
```

非 0 → **立即停止**:
> ❌ 找不到 task.md。請先執行 /spec:run 完成任務後再 close。

#### 8b:【關鍵】用 cat 讀取 task.md(不要用 Read 避免快取)

**使用 Bash 工具**執行:

```
cat specflow/changes/SPEC_BRANCH/task.md
```

以這份輸出為準。

#### 8c:檢查所有任務都已勾選

**使用 Bash 工具**執行:

```
grep -cE "^\s*- \[ \]" specflow/changes/SPEC_BRANCH/task.md
```

輸出 > 0 → **立即停止**:
> ❌ task.md 還有 N 個未勾選的任務。請先跑完 /spec:run 再 close。

#### 8d:檢查「執行後備註」有實質內容

從 8b 的 cat 輸出,定位「## 執行後備註」區塊,確認下面的「實際改動檔案」、
「偏離原計畫」、「發現的新問題或後續建議」三個小節**都不是 template 占位符**
(不是空白、也不是 `<...>` 包圍的提示文字)。

任一仍是 template 占位符 → **立即停止**:
> ❌ task.md 的「執行後備註」尚未填寫完整。/spec:run 結束時應該把這三項都寫上。
> 請補完後重跑 /spec:close。

### Step 9:讀取 issue.md 內容供 summary 抽取

**使用 Bash 工具**執行 cat 讀取 issue.md(避免 Read 快取):

```
cat specflow/changes/SPEC_BRANCH/issue.md
```

(task.md 已在 8b 用 cat 讀過,不需重讀)

### Step 10:組出 summary

從以下材料抽:

- issue.md 標題(例:「重構 campaign proxy (0001-refactor-campaign-proxy)」)
- task.md「實際改動檔案」(顯示動了哪些東西)
- task.md「偏離原計畫」(若有,代表結果跟原計畫不同,要反映出來)

格式:**`<動詞> <對象>:<簡述>`,30 個中文字內**。

範例:
- `重構 campaign proxy:抽出 cache layer`
- `修正 webhook 重複觸發:加 dedup token`
- `新增 user repository 快取:5 分鐘 TTL`
- `整理 admin 路由:拆 5 個 group module`

把產出記為 `summary`。**控制在 30 字以內**(超過就壓縮)。

---

⚠️ **從這裡開始,流程依 git_flow 分為兩條路徑**:

- `git_flow == "enabled"` → 繼續執行 Step 11~14(完整 git 流程)
- `git_flow == "disabled"` → **跳過 Step 11~13**,直接進入 Step 14(僅回報)

---

### Step 11:[若 git_flow=enabled] 依 working tree 狀態決定要不要在 spec 分支建 commit

⚠️ 若 `git_flow == "disabled"` → **整個 Step 11 跳過**。

**使用 Bash 工具**執行:

```
git status --porcelain 2>/dev/null
```

#### 11a:輸出非空(有未存檔變更)

→ 在 spec 分支建一個包含所有變更的 commit。

⚠️ 以下兩個指令**必須**透過 Bash 工具執行,**不可**用 `!\`...\``,因為 `!\`...\`` 會在 slash command 載入時就執行(不管前面條件是否成立),這裡 `git add -A` / `git commit` 都有 side effect,只能在 Claude 判斷 11a 條件成立後才呼叫。

先 stage。**使用 Bash 工具**執行:

```
git add -A
```

再 commit。**使用 Bash 工具**執行(把 `SUMMARY_TEXT` 替換成 Step 10 產出的 `summary`,注意 shell 引號跳脫,中文不用特別處理):

```
git commit -m "SUMMARY_TEXT"
```

確認 commit 成功。**使用 Bash 工具**執行(同樣不可用 `!\`...\``,因為 load 時 commit 還沒發生):

```
git rev-parse HEAD
```

簡短告知使用者:
> 📝 已在 `<spec_branch>` 上建立 wrap-up commit:`<summary>`

#### 11b:輸出為空(乾淨)

→ 跳過 commit 步驟。簡短告知:
> 📝 工作樹乾淨,沒有要在 spec 分支建立新 commit。

### Step 12:[若 git_flow=enabled] 切換到 base_branch

⚠️ 若 `git_flow == "disabled"` → **整個 Step 12 跳過**。

**使用 Bash 工具**執行(把 `BASE_BRANCH` 替換成 Step 6 取到的 `base_branch`):

```
git checkout BASE_BRANCH
```

若失敗(罕見,例如有覆蓋風險的未追蹤檔案)→ **立即停止**並把錯誤訊息原封轉述給使用者。

### Step 13:[若 git_flow=enabled] 執行 no-ff merge

⚠️ 若 `git_flow == "disabled"` → **整個 Step 13 跳過**。

**使用 Bash 工具**執行(把 `SPEC_BRANCH` 替換成 Step 4 的 `spec_branch`,`SUMMARY_TEXT` 替換成 Step 10 的 `summary`):

```
git merge --no-ff SPEC_BRANCH -m "SUMMARY_TEXT"
```

判斷結果:

#### 13a:exit code = 0(merge 成功)

→ 進入 Step 14。

#### 13b:exit code != 0 且輸出含「CONFLICT」(衝突)

**不要 abort、不要解衝突**。停下並告知使用者:

> ⚠️ Merge 有衝突,留在 `<base_branch>` 分支等你解決。
>
> 衝突檔案:
> ```
> <git status 的 Unmerged paths 段落>
> ```
>
> 請手動解衝突後執行:
> ```
> git add <已解衝突的檔案>
> git commit
> ```
> (commit message 已經預設為 summary,直接存檔送出即可)
>
> 不需要重跑 /spec:close。

接著把當前狀態印給使用者參考。**使用 Bash 工具**執行(不可用 `!\`...\``,因為 load 時 merge 尚未發生,輸出會是 pre-merge 狀態):

```
git status
```

然後**停下**,不繼續 Step 14。

#### 13c:其他失敗(非衝突)

直接把 git 錯誤訊息原封轉述給使用者並停下。

### Step 14:回報完成

#### 若 `git_flow == "enabled"`(只有 13a 走到這裡)

告知使用者:

> ✅ /spec:close 完成
>
> - Spec 分支:`<spec_branch>`(保留,未刪除)
> - Base 分支:`<base_branch>`(已合入 merge commit)
> - Summary:`<summary>`
>
> 後續動作(由你決定,/spec:close 不會自動做):
> - 推到 remote:`git push`
> - 刪除 spec 分支:`git branch -d <spec_branch>`(本地)、`git push origin --delete <spec_branch>`(remote,若曾推過)

#### 若 `git_flow == "disabled"`

告知使用者:

> ✅ /spec:close 完整性檢查通過(`git_flow: disabled` 模式)
>
> - Spec 資料夾:`specflow/changes/<spec_branch>/`(已完成,task.md 全勾選 + 備註齊全)
> - 建議的 summary(可直接拿來當 commit message):
>
>   ```
>   <summary>
>   ```
>
> ⚠️ disabled 模式下,本指令**沒有**:
> - 沒有自動 commit 變更
> - 沒有切換分支
> - 沒有 merge 回 base
>
> 後續 git 流程由你自行決定。常見作法:
>
> ```bash
> git add -A
> git commit -m "<summary>"
> # 然後依你的 workflow merge / PR / push
> ```

## 硬規則

- ❌ **git_flow=enabled 時不可在分支不符 spec 格式時繼續**(Step 4a) — 防呆,避免在 base 分支或其他分支誤跑
- ❌ **git_flow=disabled 時不可缺 $ARGUMENTS**(Step 4b) — 沒分支可推導 spec_name,必須要使用者明指
- ❌ **不可在 base_branch frontmatter 缺失時推測**(enabled 模式) — 寧可報錯讓使用者補,也不要靠 `git merge-base` 猜
- ❌ **不可在 task.md 不完整時 close** — 沒跑完 /spec:run 就 close 會留下半成品(不論 git_flow 設定)
- ❌ **不可自動 abort merge 衝突** — 衝突時把控制權交回使用者
- ❌ **不可自動 push 到 remote** — 推不推由使用者決定
- ❌ **不可自動刪除 spec 分支** — 使用者可能還想保留歷史軌跡
- ❌ **summary 不可超過 30 個中文字** — 簡短易讀為先
- ❌ **絕對不要用 Read 工具讀 task.md / issue.md 內文**(改動驗證) — 必須用 cat 繞過快取。Step 6 讀 issue.md 取 frontmatter 例外,因為 frontmatter 是 specflow 自己寫的、不會被使用者編輯成多版本
- ❌ **git_flow=disabled 模式下不可自作主張做任何 git 操作** — 即使看起來「順便做了使用者也會感謝」,也不要。disabled 模式的承諾就是「不動 git」
