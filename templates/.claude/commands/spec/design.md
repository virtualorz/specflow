---
description: 讀取 issue.md 並產生 design.md(包含決策清單)
argument-hint: <task-name 或編號簡寫如 0002 / 2>
allowed-tools: Read, Write, Bash(test:*), Bash(ls:*), Bash(wc:*), Bash(stat:*), Bash(cat:*), Bash(git rev-parse:*)
---

# /spec:design — 產生 design.md

使用者輸入:`$ARGUMENTS`

⚠️ **輸入可能是兩種格式**:
- 完整 task name(例:`0002-modify-hello-controller`)
- **編號簡寫**(例:`0002`、`002`、`2`)

Step 0 會先把它解析成完整的 `task_name`。**之後所有檔案操作都用 `task_name`**(由 Step 0 解析得到),**不要直接用 `$ARGUMENTS`**;凡是路徑會用到 task_name 的命令,**改用 Bash 工具**呼叫,不可放在 `!\`...\``。

## 你的任務

### Step 0:定位專案根 + 解析 task_name 並做分支提醒

⚠️ **Step 0 全部用 Bash 工具探測狀態,不依賴載入時的內嵌 ``!`...` ``**。
原因:內嵌 ``!`...` `` 在載入時執行,其 CWD 不保證等於專案根(monorepo 子目錄或
異常 session CWD 下,相對路徑 `specflow/...` 會誤報找不到,但 git 指令仍正常)。
改用 Bash 工具並先校正 CWD,可同時根除這個問題與「`ls` exit 2 導致載入 abort」。

#### Step 0-root:校正 Bash 工具 CWD 到專案根

**使用 Bash 工具**執行:

```
test -f specflow/project.md && echo "ROOT_OK" || echo "NEED_RELOCATE"
```

- 輸出 `ROOT_OK` → CWD 已在專案根,進入 Step 0a
- 輸出 `NEED_RELOCATE` → **使用 Bash 工具**切到 git repo 根再測一次:

  ```
  cd "$(git rev-parse --show-toplevel 2>/dev/null)" && test -f specflow/project.md && echo "RELOCATED:$(pwd)" || echo "NO_SPECFLOW"
  ```

  - 輸出 `RELOCATED:<path>` → 已切到專案根(Bash 工具 CWD 在後續調用間持久),進入 Step 0a
  - 輸出 `NO_SPECFLOW` → **立即停止**:「找不到 `specflow/project.md`。請確認你在含有 `specflow/` 的專案目錄、且已安裝 specflow(`npx @virtualorz/specflow init`)。」

⚠️ 完成本步後,後續所有相對路徑命令都以這個校正後的 CWD 為基準。

#### Step 0a:列出現有 spec change 資料夾

**使用 Bash 工具**執行(CWD 已在 Step 0-root 校正):

```
ls -1 specflow/changes/ 2>/dev/null
```

把這個輸出記為 `existing_folders`(每行一個資料夾名稱)。

#### Step 0b:解析 task_name

依以下規則決定 `task_name`:

- 若 `$ARGUMENTS` 符合**純數字**格式(`^[0-9]+$`)→ 把它**補零成 4 位數**(`PADDED`),然後在 `existing_folders` 中找開頭是 `<PADDED>-` 的資料夾名:
  - 例:`$ARGUMENTS = "2"` → PADDED = `"0002"` → 在 existing_folders 中找以 `0002-` 開頭的(例如 `0002-modify-hello-controller`)
  - 例:`$ARGUMENTS = "0002"` → PADDED = `"0002"` → 同上
  - 找到 → `task_name` = 該資料夾名
  - 找不到 → **立即停止**並告知:
    > 找不到編號 `<PADDED>` 對應的 spec change 資料夾。
    > 目前可用的編號:`<列出 existing_folders 中符合 [0-9]{4}- 開頭的所有編號前綴>`
- 否則(`$ARGUMENTS` 已經像完整 task name)→ `task_name = $ARGUMENTS`

⚠️ 從這一步之後,**只用 `task_name`**(不要再用 `$ARGUMENTS`)。

#### Step 0c:讀取 project.md 取得 git_flow 設定

`specflow/project.md` 已在 Step 0-root 確認存在。使用 **Read 工具**讀取 `specflow/project.md`。

從檔案最上方的 YAML frontmatter 解析 `git_flow`:
- 若 frontmatter 存在且有 `git_flow` 鍵 → 使用該值(`enabled` / `disabled`)
- 若 frontmatter 不存在、或沒有 `git_flow` 鍵 → **預設為 `enabled`**(向後相容)

把結果記為 `git_flow`。

#### Step 0d:[若 git_flow=enabled] 檢查目前分支是否相符(軟性提醒)

⚠️ 若 `git_flow == "disabled"` → **整個 Step 0d 跳過**,直接進入 Step 1。

**使用 Bash 工具**執行:

```
git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "NOT_GIT_OR_NO_HEAD"
```

把輸出記為 `current_branch`。若輸出是 `NOT_GIT_OR_NO_HEAD` → 跳過此步。

否則若 `current_branch` **不等於** `task_name`:

- **不要停下**,但要在開始之前明確警告使用者:

> ⚠️ 目前分支是 `<current_branch>`,但你正在為 `<task_name>` 產生 design.md。
> 若這不是有意為之(例如 cherry-pick、暫時切去看其他分支),建議先
> `git checkout <task_name>` 後再執行,讓 design.md 寫到對應的 spec 分支上。
>
> 若你確定要繼續,我會直接往下做。

警告完直接繼續 Step 1,不需要使用者明確回應。

### Step 1:確認 issue.md 存在

`specflow/project.md` 已在 Step 0-root 確認存在,這裡只需檢查 issue.md。

**使用 Bash 工具**執行(把 `TASK_NAME` 替換成 Step 0 解析得到的 `task_name`):

```
test -f specflow/changes/TASK_NAME/issue.md
```

非 0 → **立即停止**並告知使用者「找不到 `specflow/changes/<task_name>/issue.md`,請先執行 /spec:new」。

### Step 2:檢查 design.md 是否已存在

**使用 Bash 工具**執行:

```
test -f specflow/changes/TASK_NAME/design.md
```

若 exit code = 0(已存在),**停下來問使用者**:
「design.md 已存在,要覆蓋嗎?(y/n)」
等使用者明確回答 y 才繼續;n 或無回應則中止。

### Step 3:讀取 project.md(用 Read 工具)

`project.md` 是穩定的專案規範,使用 Read 工具讀取:

`specflow/project.md`

### Step 4:【關鍵】用 cat 強制重新讀取 issue.md

⚠️ **重要**:`issue.md` 是使用者剛剛在編輯器中填寫的檔案。
**不可使用 Read 工具**——Read 工具有快取機制,可能回傳過期內容。
**必須使用 bash `cat` 命令**直接讀取檔案的當前真實內容。

**使用 Bash 工具**執行:

```
cat specflow/changes/TASK_NAME/issue.md
```

⚠️ 上述 `cat` 命令的輸出**就是 issue.md 的真實內容**,以此為準。
即使你 context 中有「之前讀過的 issue.md 版本」,**全部忽略**,
只看上述 cat 命令的輸出。

### Step 5:檢查 issue.md 完整性

**根據 Step 4 的 cat 輸出**(不是記憶中的版本)檢查:

- 「想解決的問題」區塊是否填寫(不再是 `<2~3 句話描述...>` 這類 template 占位符)
- 「期望的結果」區塊是否填寫(不再是 template 占位符)
- 「範圍限制」區塊的「只動 / 不動 / 不處理」**至少有一項有實質內容**

判斷原則:

- ✅ 已填寫:該段落內容是具體的中文/英文描述,例如「現有的 Controller 直接呼叫 Model」
- ❌ 未填寫:該段落仍是 `<...>` 包圍的提示文字,或完全空白

若任一項仍是 template 原文或空白 → **立即停下來問使用者**,逐項列出疑問,**不要腦補**。

### Step 6:產生 design.md

通過 Step 5 檢查後,依照 `.claude/skills/specflow/templates/design.md` 的格式產出。

**強制要求**:

- 「決策清單」區塊用 checkbox 形式,每項包含**標題、決策內容、理由、替代方案**
- 「影響範圍」區塊明確列出直接改動 / 間接影響 / 不影響但需注意
- 「實作細節」區塊**不可寫程式碼**(那是 task.md 的職責),只描述「要怎麼做」
- 涉及跨外部系統呼叫時,**必須說明降級策略**(依 project.md §10)
- 涉及新 Service 時,**必須在決策清單中包含「同步建立 Core/Services/{Module}/Contracts/{Module}Contract.php」**(依 project.md §3)
- 整份 design.md 必須使用**繁體中文**撰寫
- 所有引用 project.md 規範時,使用 §章節編號 引用(例:「依 project.md §9 命名慣例」)

**最小化形式**:若這是小型改動(例:單一檔案、< 50 行、無架構影響),
可採最小化形式 —— 決策清單 2~3 項即可、實作細節寫「無額外細節,見 task.md」。
但「決策清單」區塊不可省略。

### Step 7:寫入檔案並回報

使用 Write 工具寫入 `specflow/changes/<task_name>/design.md`(把 `<task_name>` 換成 Step 0 解析的值),然後告知使用者:

> ✅ 已產生 `specflow/changes/<task_name>/design.md`
>
> 請審查「決策清單」並逐項勾選 checkbox。若不同意某項,直接修改該項內容後勾選。
> 若有疑問,寫到「待討論問題」區塊,後續可以反覆討論。
>
> 全部勾選且無待討論問題後,執行 `/spec:run <task_name>`(會自動產生 task.md 並開始執行)。

## 硬規則

- ❌ **絕對不要在沒讀 project.md 的情況下產出 design.md**
- ❌ **絕對不要自動接著產 task.md**(即使看起來很順理成章)
- ❌ **絕對不要替使用者勾選決策清單**
- ❌ issue.md 模糊時**先問,不要腦補**
- ❌ **絕對不要用 Read 工具讀 issue.md**(必須用 cat 繞過快取)
- ❌ **絕對不要說「沒有變更」這種仰賴記憶的判斷** —— 永遠以 cat 命令的輸出為準
- ❌ **絕對不要在 `!\`...\`` 中用 `$ARGUMENTS` 接路徑** —— 編號簡寫情境下會找不到檔案,所有檔案操作改用 Bash 工具配 task_name
