# specflow

專為 [Claude Code](https://docs.claude.com/en/docs/claude-code) 設計的**輕量規格驅動開發工作流**。

設計靈感來自 OpenSpec,但去掉了大型團隊協作所需的儀式感,聚焦在「先對齊意圖、再動手寫程式碼」這件事。
個人開發者跟小團隊用得最舒服。

## 為什麼需要 specflow?

如果你認真用 Claude Code 寫過正式專案,大概有踩過兩個坑:

1. **Claude 對小改動過度設計** —— 你只想改 30 行,它給你重構 300 行
2. **Claude 不熟你的專案慣例** —— 用錯架構層、命名亂套、目錄放錯

specflow 用一個強制的多階段流程解決這兩個問題:

```
/spec:new  →  issue.md  →  /spec:design  →  design.md  →  /spec:run  →  task.md(自動產生)  →  程式碼  →  /spec:close
   ↑           ↑                              ↑                            ↑                              ↑
開分支       你寫                       Claude 提出設計決策            Claude 拆任務並逐項執行         no-ff merge 回 base
                                        ↑反覆討論直到決策全勾選↑
```

審查 checkpoint 在 **design.md**:你勾完決策、清掉待討論問題,執行 `/spec:run`,
Claude 才會自動產 task.md 並開始改程式碼。task.md 主要當執行軌跡(每完成一項勾一個 checkbox + 結尾的執行後備註),通常不需要手動 review。

執行完用 `/spec:close` 自動產生中文 summary commit、no-ff merge 回 base branch。

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

先確定你目前在 base branch(預設 `dev` / `development` / `develop` / `main`)上,且 working tree 乾淨。然後在 Claude Code 中執行:

```
/spec:new 重構 campaign proxy
```

或者直接給英文 slug 也可以:

```
/spec:new refactor-campaign-proxy
```

specflow 會:

1. 自動算下一個編號(例:`0001`)
2. 把輸入轉成英文 slug(中文輸入會由 Claude 翻譯)
3. 建立並切換到新分支 `0001-refactor-campaign-proxy`
4. 建立 `specflow/changes/0001-refactor-campaign-proxy/issue.md`

編輯 `issue.md`,寫入:

- **想解決的問題**
- **期望的結果**
- **範圍限制**(只動什麼、絕對不動什麼)

然後執行(後續指令都用完整的編號 + slug):

```
/spec:design 0001-refactor-campaign-proxy
```

Claude 會讀 `project.md` + `issue.md`,產出 `design.md`,裡面是一個 checkbox 形式的設計決策清單。
逐項審查、勾選;有疑問就寫到「待討論問題」區塊。確認對齊後執行:

```
/spec:run 0001-refactor-campaign-proxy
```

`/spec:run` 會依 design.md 的狀態自動分流:

- 有「待討論問題」 → Claude 回答、修正受影響的決策、把 checkbox reset、停下等你重新審查
- 決策還有未勾選 → 提示你勾選後重跑
- **決策全勾選 + 待討論清空** → 自動產 `task.md`,接著逐項執行,每完成一項勾一個 checkbox,結尾寫一份「執行後備註」總結整次改動

也就是說,你只需要反覆 `/spec:run` 直到 Claude 真的開跑為止,不需要手動切到「產 task」這個額外步驟。

執行驗收完之後,在 spec 分支上執行:

```
/spec:close
```

`/spec:close` 會把目前分支收尾並 no-ff merge 回 base branch:

1. 從 issue.md 標題 + task.md 執行紀錄抽出**30 字內中文 summary**(格式:`<動詞> <對象>:<簡述>`)
2. 把未 commit 的變更 stage + commit(用 summary 當訊息)
3. 切回 base branch(從 issue.md frontmatter 取得),`git merge --no-ff` 把 spec 分支合進去
4. 衝突的話停下,把控制權交回給你

不會自動 push、不會自動刪除 spec 分支(讓你保留歷史軌跡)。

## Slash Commands 一覽

| 指令 | 用途 |
|------|------|
| `/spec:new <自由輸入>` | 自動編號 + 建立分支 + 建立 spec 任務資料夾與 issue.md template(輸入可以是中文或英文 slug) |
| `/spec:design <task-name\|編號>` | 讀取 issue.md,產生 design.md(含設計決策清單) |
| `/spec:run <task-name\|編號>` | 依 design.md 狀態分流:有討論問題 → 處理後停下;決策全勾選 → 自動產 task.md 並逐項執行,結尾填執行後備註 |
| `/spec:close` | 自動產生中文 summary commit,把目前 spec 分支 no-ff merge 回 issue.md frontmatter 紀錄的 base branch |

`<task-name>` 統一格式為 `NNNN-<英文-slug>`(例:`0001-refactor-campaign-proxy`),由 `/spec:new` 自動產生。

`/spec:design` 與 `/spec:run` 也接受**編號簡寫**:`/spec:run 0002`、`/spec:run 002`、`/spec:run 2` 都會自動解析成 `0002-...` 那個資料夾,不必每次打全名。

> 舊版的 `/spec:task` 已併入 `/spec:run`。如果你從舊版升上來,既有的 spec change 直接用 `/spec:run` 即可,不再需要手動切「產 task」這一步。

## 討論模式

審查 `design.md` 時,你可以在 **「待討論問題」** 區塊寫下對某條決策的疑問。
重新執行 `/spec:run` 時,Claude 會:

1. 偵測到「待討論問題」有內容
2. 基於 `project.md` 跟現有脈絡逐題回答
3. 修改受影響的決策、把它們的 checkbox 重置為 `[ ]`(需重新審查)
4. 把問題摘要搬到 **「已討論問題」** 區塊(保留決策演進的脈絡)
5. 停下來,等你重新審查(此時不會產 task.md、不會執行任何任務)

這讓你在不離開檔案的前提下,跟 Claude 來回討論直到對齊意圖。確認對齊後,只要決策全勾選 + 待討論清空,下一次 `/spec:run` 就會直接進入「產 task → 執行」。

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
│       ├── run.md
│       └── close.md
└── specflow/
    ├── project.md                  ← 編輯這份(最上方 frontmatter 是 specflow 設定)
    └── changes/
        └── NNNN-<slug>/             ← /spec:new 自動編號 + 開分支
            ├── issue.md
            ├── design.md
            └── task.md
```

建議將 `.claude/` 跟 `specflow/` 都 commit 進 git,這樣團隊成員 clone 下來就能直接用。

## 任務命名與 git 整合

每個 spec change 跟一條 git 分支綁定:

- 資料夾與分支命名:`NNNN-<英文-slug>`(例:`0001-refactor-campaign-proxy`)
  - `NNNN` 由 `/spec:new` 自動編號(現有最大編號 + 1,4 位數零填補)
  - `<英文-slug>` 由使用者輸入或 Claude 翻譯
- `/spec:new` 在執行前會強制檢查:
  1. 目前在 git repo 內
  2. 目前分支是合法的 base branch(預設 `dev` / `development` / `develop` / `main`)
  3. Working tree 乾淨(沒有未 commit 的變更)
- 通過檢查後會 `git checkout -b NNNN-<slug>` 切換到新分支再建立 issue.md

### 自訂 base branch

若你的團隊用其他 base branch(例如 `staging`、`trunk`),在 `specflow/project.md` 最上方的 frontmatter 設定:

```yaml
---
base_branches: [staging, main]
---
```

### 後續指令的分支行為

- `/spec:design`:目前分支不符會**警告但繼續**(允許 cherry-pick / 暫時切離等情境)
- `/spec:run`:目前分支不符會**直接中止**(因為它會實際改程式碼)

### 輸入格式

`/spec:new` 接受兩種輸入:

- ✅ 中文/自由文字:`/spec:new 重構 campaign proxy` —— Claude 翻譯成英文 slug
- ✅ 英文 slug(`^[a-z]+(-[a-z]+)*$`):`/spec:new refactor-campaign-proxy` —— 直接使用

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
- **狀態機優於流程控制** —— `/spec:run` 由「閘門條件」(決策全勾 + 待討論清空)決定要進入「處理討論」、「提示勾選」還是「產 task.md → 執行」,而非由 Claude「記得該做什麼」

## 相容性

- 需要 [Claude Code](https://docs.claude.com/en/docs/claude-code)
- 跟任何專案類型都相容(Laravel、React、Node.js、Python 等) —— specflow 本身只是一堆 Markdown
- 執行 `init` / `update` 需要 Node.js 18+(只有安裝步驟需要,specflow 跑流程時不需要 Node)

## License

MIT © virtualorz

## 回報問題與貢獻

歡迎在 [github.com/virtualorz/specflow](https://github.com/virtualorz/specflow) 提 issue 或 PR。
