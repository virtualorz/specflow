# specflow

專為 [Claude Code](https://docs.claude.com/en/docs/claude-code) 設計的**輕量規格驅動開發工作流**。

設計靈感來自 OpenSpec,但去掉了大型團隊協作所需的儀式感,聚焦在「先對齊意圖、再動手寫程式碼」這件事。
個人開發者跟小團隊用得最舒服。

## 為什麼需要 specflow?

如果你認真用 Claude Code 寫過正式專案,大概有踩過兩個坑:

1. **Claude 對小改動過度設計** —— 你只想改 30 行,它給你重構 300 行
2. **Claude 不熟你的專案慣例** —— 用錯架構層、命名亂套、目錄放錯

specflow 用一個強制的三階段流程解決這兩個問題:

```
issue.md  →  /spec:design  →  design.md  →  /spec:task  →  task.md  →  /spec:run  →  程式碼
   ↑                            ↑                          ↑                          ↑
 你寫                       Claude 提出設計決策       Claude 提出細顆粒度的任務     Claude 逐項執行
```

每個階段中間都有 checkpoint,**Claude 必須等你審查確認後才會繼續**。

## 快速開始

### 在你的專案安裝

```bash
cd /path/to/your/project
npx @virtualorz/specflow init
```

這會在當前目錄建立 `.claude/`(skill + slash commands)跟 `specflow/`(專案規範 + 你的 spec 任務)。

### 定義你的專案規範

編輯 `specflow/project.md`,寫入你的技術棧、架構約束、命名慣例等。
這份檔案是**整個專案的憲法** —— Claude 在產生任何 design 或 task 前都會讀它。

### 開始第一個 spec

在 Claude Code 中執行:

```
/spec:new my-first-task
```

這會建立 `specflow/changes/my-first-task/issue.md`。編輯它,寫入:

- **想解決的問題**
- **期望的結果**
- **範圍限制**(只動什麼、絕對不動什麼)

然後執行:

```
/spec:design my-first-task
```

Claude 會讀 `project.md` + `issue.md`,產出 `design.md`,裡面是一個 checkbox 形式的設計決策清單。
逐項審查、勾選後執行:

```
/spec:task my-first-task
```

Claude 會產出 `task.md`,裡面是具體的執行步驟 checkbox。審查後執行:

```
/spec:run my-first-task
```

Claude 會逐項執行 task,每完成一項勾一個 checkbox,結尾會寫一份「執行後備註」總結整次改動。

## Slash Commands 一覽

| 指令 | 用途 |
|------|------|
| `/spec:new <task-name>` | 建立新的 spec 任務資料夾與 issue.md template |
| `/spec:design <task-name>` | 讀取 issue.md,產生 design.md(含設計決策清單) |
| `/spec:task <task-name>` | 讀取 design.md,產生 task.md(可執行的 checkbox 清單)。若 design.md 有「待討論問題」會先進入討論模式 |
| `/spec:run <task-name>` | 逐項執行 task.md,完成後填寫執行後備註 |

## 討論模式

審查 `design.md` 時,你可以在 **「待討論問題」** 區塊寫下對某條決策的疑問。
重新執行 `/spec:task` 時,Claude 會:

1. 偵測到「待討論問題」有內容
2. 基於 `project.md` 跟現有脈絡逐題回答
3. 修改受影響的決策、把它們的 checkbox 重置為 `[ ]`(需重新審查)
4. 把問題摘要搬到 **「已討論問題」** 區塊(保留決策演進的脈絡)
5. 停下來,等你重新審查

這讓你在不離開檔案的前提下,跟 Claude 來回討論直到對齊意圖。

## 檔案結構

執行 `init` 後,你的專案會多出:

```
your-project/
├── .claude/
│   ├── skills/specflow/
│   │   ├── SKILL.md
│   │   ├── .specflow-version       (記錄安裝版本,給 update 用)
│   │   └── templates/
│   │       ├── issue.md
│   │       ├── design.md
│   │       └── task.md
│   └── commands/spec/
│       ├── new.md
│       ├── design.md
│       ├── task.md
│       └── run.md
└── specflow/
    ├── project.md                  ← 編輯這份
    └── changes/
        └── <task-name>/
            ├── issue.md
            ├── design.md
            └── task.md
```

建議將 `.claude/` 跟 `specflow/` 都 commit 進 git,這樣團隊成員 clone 下來就能直接用。

## 任務命名規則

`<task-name>` 必須符合:`^[a-z]+(-[a-z]+)*$`

- ✅ `refactor-controller-and-readme`
- ❌ `Refactor_Controller`(含大寫與底線)
- ❌ `重構-proxy`(含中文)

## 升級

當 specflow 推出新版時,在已安裝的專案執行:

```bash
npx @virtualorz/specflow update
```

`update` 會:

- ✅ 覆蓋 `.claude/skills/specflow/` 跟 `.claude/commands/spec/`(specflow 工具本體)
- 🛡️ **不動** `specflow/project.md`(你的專案規範)
- 🛡️ **不動** `specflow/changes/`(你的工作軌跡)

執行前會列出將被覆蓋的範圍並詢問確認。完成後建議用 `git diff .claude/` 審查變更,確認沒問題再 commit。

## 設計哲學

- **用結構強迫思考品質,但保留最小化形式給小改動** —— 30 行的小改動,design.md 可以只有 3 條決策
- **每個階段都有 checkpoint** —— specflow 的價值在於每階段的人工審查,不是自動化
- **不要相信 Claude 的記憶** —— slash command 用 `cat` 而非 Read 工具讀檔,避開 Claude Code 的檔案快取
- **狀態機優於流程控制** —— `/spec:task` 由「閘門條件」(決策全勾 + 待討論清空)決定要做什麼,而非由 Claude「記得該做什麼」

## 相容性

- 需要 [Claude Code](https://docs.claude.com/en/docs/claude-code)
- 跟任何專案類型都相容(Laravel、React、Node.js、Python 等) —— specflow 本身只是一堆 Markdown
- 執行 `init` / `update` 需要 Node.js 18+(只有安裝步驟需要,specflow 跑流程時不需要 Node)

## License

MIT © virtualorz

## 回報問題與貢獻

歡迎在 [github.com/virtualorz/specflow](https://github.com/virtualorz/specflow) 提 issue 或 PR。
