---
name: specflow
description: A lightweight spec-driven development workflow. Use this skill when the user invokes /spec:new, /spec:design, /spec:run, or /spec:close commands, refers to files in the specflow/ folder (project.md, issue.md, design.md, task.md), or asks to plan a code change in a structured way. This skill enforces a strict sequence: user writes issue.md → Claude generates design.md → user confirms (and discusses) → /spec:run auto-generates task.md and executes → /spec:close merges back to base branch.
---

# Specflow:輕量規格驅動開發

Specflow 主要透過 4 個 slash command 運作。**完整的執行步驟、檔案讀寫規則、
分支判斷邏輯都寫在各 slash command 檔案中**,Claude 在執行時直接照那邊的 prompt 走。

本檔案僅記錄**slash command 沒覆蓋到、但全流程適用**的設計哲學與通用原則。

## 4 個 slash command 速查

- `/spec:new <自由輸入>` —— 自動編號 + 開分支 + 建立 issue.md template(輸入可以是中文或英文 slug)
- `/spec:design <task-name|編號>` —— 讀 issue.md,產生 design.md
- `/spec:run <task-name|編號>` —— 檢查 design.md 就緒、處理討論問題、自動產生 task.md、逐項執行
- `/spec:close` —— 把目前 spec 分支 no-ff merge 回 base branch(自動產生中文 summary commit)

`/spec:design` 與 `/spec:run` 接受兩種輸入:完整 task name(`0002-modify-hello-controller`)或編號簡寫(`0002`、`002`、`2`)。簡寫會自動補零成 4 位數,並在 `specflow/changes/` 中找對應資料夾。

詳細行為見 `.claude/commands/spec/` 底下對應的 .md 檔案。

⚠️ **舊版 `/spec:task` 已併入 `/spec:run`**。原本「產 task.md」與「討論模式」
都改由 `/spec:run` 依 design.md 的狀態自動分流。

## 任務命名與分支綁定

specflow 把每個 spec change 跟一條 git 分支綁在一起:

- 資料夾命名格式:`NNNN-<英文-slug>`(例:`0001-refactor-campaign-proxy`)
  - `NNNN` 是 4 位數零填補編號,由 `/spec:new` 自動算出(現有最大編號 + 1)
  - `<英文-slug>` 是小寫字母與 hyphen
- **分支名 = 資料夾名**,由 `/spec:new` 自動建立並切換
- `/spec:new` 必須在「合法的 base branch」上執行(預設 `dev`、`development`、`develop`、`main`)
  - 可在 `specflow/project.md` 開頭的 frontmatter 用 `base_branches:` 自訂

`<task-name>` 的判斷邏輯(在 `/spec:new` 內):

- 若使用者輸入已符合 `^[a-z]+(-[a-z]+)*$` → 直接當作 slug 使用
- 否則(中文、含空白、含大寫等) → Claude 翻譯成英文 slug
- 最終都會加上 `NNNN-` 前綴

`/spec:design` 在分支不符時會**軟性警告但繼續**;
`/spec:run` 在分支不符時**硬性中止**(因為它會實際改程式碼)。
`/spec:close` 必須在 spec 分支(`NNNN-...`)上執行,base 分支來源是讀 issue.md
frontmatter 的 `base_branch` 欄位(由 `/spec:new` 寫入)。

## 通用設計哲學

### 1. 規模處理:用最小化形式而非跳過階段

無論改動多小,都產出完整三份檔案(issue / design / task)。但允許最小化形式:

- **小型改動的 design.md** 可以只有 2~3 個決策項,實作細節寫「無額外細節,見 task.md」
- **小型改動的 task.md** 可能只有 3~5 個 checkbox

關鍵是**保留三份檔案的存在**,讓流程一致;而不是用「跳過階段」來節省時間。

### 2. 反快取原則

使用者會在編輯器中修改 `issue.md` / `design.md` / `task.md`(填寫內容、勾選 checkbox、
寫討論問題)。Claude 的 Read 工具有快取機制,可能回傳過期內容。

**必須使用 bash `cat` 命令讀取使用者剛編輯過的檔案**,不可依賴 Read 工具或記憶。

所有 slash command 已內建此機制。若你在 slash command 之外的情境讀取這些檔案,
也應遵循此原則。

⚠️ 唯一例外:`task.md` 在 `/spec:run` 階段需要被 Edit(勾選 checkbox),
此時必須用 Read 工具(Edit 需要透過 Read 定位行號),但會用 cat 交叉驗證。

### 3. 狀態機優於流程控制

specflow 用「**檔案的狀態**」決定 Claude 該做什麼,而非「**Claude 記住該做什麼**」。

例如 `/spec:run` 的閘門條件是兩個 AND(在實際執行前檢查 design.md):

1. 決策清單全部勾選(沒有 `- [ ]`)
2. 「待討論問題」區塊清空

只要任一條件不滿足,Claude 就**不可能**進入「產 task → 執行」流程——這是檔案
狀態決定的,不需要 Claude 自己記得停下來。狀態機的不變式(invariant)比流程
控制可靠得多。

### 4. Checkpoint 在 design.md,不在 task.md

specflow 強制使用者審查的點是 **design.md** 而非 task.md:

- `/spec:design` 產完 design.md 後**一定停下**,等使用者勾選決策、寫待討論問題
- `/spec:run` 處理完討論模式後也**一定停下**,因為它會把改過的決策 reset 為 `[ ]`
- 但一旦進入「決策全勾選 + 待討論清空」狀態,`/spec:run` 會**直接產 task.md
  並開始執行,中間不再 checkpoint**

這個設計反映現實使用模式:design.md 才是規格的真相來源,task.md 是執行用的
checkbox 清單。使用者反覆審查 design.md、設計對齊後,task.md 通常不需要手動
review。若仍想看 task.md,可中斷 /spec:run 後再重跑(會偵測到 task.md 已存在
且全 `[ ]` 而沿用)。

## 自然語言觸發的引導

若使用者沒用 slash command,而是用自然語言要求(例如「幫我規劃 X 重構」、
「幫我建立一個 specflow 任務」),**先建議他改用 slash command**,
以獲得完整的流程保證:

> 「我建議你用 `/spec:new <你想做的事>` 開始(中文或英文都可以,例如
>  `/spec:new 重構 campaign proxy`)。這會自動編號、開分支、建立任務
>  資料夾與 issue.md template,讓整個流程有檔案軌跡可循。
>  跑完之後可用 `/spec:close` 把分支 merge 回 base。」

只有在使用者明確拒絕用 slash command 時,才退而求其次用自然語言走完流程。
