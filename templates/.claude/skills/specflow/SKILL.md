---
name: specflow
description: A lightweight spec-driven development workflow for Laravel projects. Use this skill when the user invokes /spec:new, /spec:design, /spec:task, or /spec:run commands, refers to files in the specflow/ folder (project.md, issue.md, design.md, task.md), or asks to plan a code change in a structured way. This skill enforces a strict sequence: user writes issue.md → Claude generates design.md → user confirms → Claude generates task.md → user confirms → Claude executes.
---

# Specflow:輕量規格驅動開發

Specflow 主要透過 4 個 slash command 運作。**完整的執行步驟、檔案讀寫規則、
分支判斷邏輯都寫在各 slash command 檔案中**,Claude 在執行時直接照那邊的 prompt 走。

本檔案僅記錄**slash command 沒覆蓋到、但全流程適用**的設計哲學與通用原則。

## 4 個 slash command 速查

- `/spec:new <task-name>` —— 建立 specflow 任務資料夾與 issue.md template
- `/spec:design <task-name>` —— 讀 issue.md,產生 design.md
- `/spec:task <task-name>` —— 讀 design.md,產生 task.md(若有「待討論問題」會先進入討論模式)
- `/spec:run <task-name>` —— 逐項執行 task.md,完成後寫執行後備註

詳細行為見 `.claude/commands/spec/` 底下對應的 .md 檔案。

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

例如 `/spec:task` 的閘門條件是兩個 AND:

1. 決策清單全部勾選(沒有 `- [ ]`)
2. 「待討論問題」區塊清空

只要任一條件不滿足,Claude 就**不可能**進入「產 task 模式」——這是檔案狀態決定的,
不需要 Claude 自己記得停下來。狀態機的不變式(invariant)比流程控制可靠得多。

### 4. 永遠保留 checkpoint

每個 slash command 執行完都應該停下來,等使用者明確下一步指令。
**不要自動串連階段**(例如 `/spec:design` 完成後不可自動產 task.md)——
specflow 的價值就在於每個階段都讓使用者有機會說「等等」。

## 自然語言觸發的引導

若使用者沒用 slash command,而是用自然語言要求(例如「幫我規劃 X 重構」、
「幫我建立一個 specflow 任務」),**先建議他改用 slash command**,
以獲得完整的流程保證:

> 「我建議你用 `/spec:new <task-name>` 開始(task-name 用小寫英文跟 hyphen,
>  例如 `refactor-x-controller`)。這會建立任務資料夾與 issue.md template,
>  讓整個流程有檔案軌跡可循。」

只有在使用者明確拒絕用 slash command 時,才退而求其次用自然語言走完流程。
