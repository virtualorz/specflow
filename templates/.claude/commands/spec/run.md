---
description: 逐項執行 task.md 中的任務,完成後填寫執行後備註
argument-hint: <task-name>
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# /spec:run — 執行 task.md

使用者要求執行 `$ARGUMENTS` 的 task.md。

## 你的任務

### Step 1:確認檔案存在

!`test -f specflow/changes/$ARGUMENTS/task.md`

若 exit code != 0 → **立即停止**並提醒使用者「請先執行 /spec:task $ARGUMENTS」。

### Step 2:讀取 project.md(用 Read 工具)

`project.md` 是穩定的專案規範,使用 Read 工具讀取:

`specflow/project.md`

### Step 3:【關鍵】用 cat 強制重新讀取 issue.md 與 design.md

⚠️ **重要**:這兩份檔案是使用者的決策記錄,可能在編輯器中被修改過。
**必須使用 bash `cat` 命令**直接讀取,**不可使用 Read 工具**(會被快取)。

執行:

!`cat specflow/changes/$ARGUMENTS/issue.md`
!`cat specflow/changes/$ARGUMENTS/design.md`

⚠️ 以上 cat 命令的輸出就是這兩份檔案的真實內容,以此為準。

### Step 4:讀取 task.md(用 Read 工具,因為後續要 Edit)

⚠️ **特殊情況**:task.md 後續需要用 Edit 工具勾選 checkbox(`- [ ]` → `- [x]`),
Edit 工具需要透過 Read 工具讀過才能正確定位行號。**因此 task.md 必須用 Read 工具讀取**:

使用 Read 工具讀取 `specflow/changes/$ARGUMENTS/task.md`。

⚠️ 但為了避免快取問題,在 Read 之前先用 cat 印一次內容做交叉比對:

!`cat specflow/changes/$ARGUMENTS/task.md`

如果 cat 輸出跟 Read 結果**有顯著差異**(例如 cat 顯示某項已勾選但 Read 顯示未勾選),
**立即停止**並告知使用者「task.md 的內容讀取結果不一致,請重新開啟 Claude Code session」。

### Step 5:檢查 task.md 進度狀態

統計已完成與未完成的項目:

!`grep -cE "^\s*- \[x\]" specflow/changes/$ARGUMENTS/task.md`
!`grep -cE "^\s*- \[ \]" specflow/changes/$ARGUMENTS/task.md`

若有部分項目已勾選 → 告知使用者:
「偵測到 task.md 已完成 N 項,剩餘 M 項待執行。將從第一個未勾選項目繼續。」

若全部已勾選 → 告知使用者「task.md 已全部完成,無需執行」並停止。

### Step 6:逐項執行

**執行模式**:一口氣完成所有未勾選項目,**不需要每項停下來等確認**。

對每一個 `- [ ]` 項目:

1. 執行該項任務(寫程式碼、新增檔案、修改檔案等)
2. 用 Edit 工具將 task.md 中該項的 `- [ ]` 改為 `- [x]`
3. 進入下一項

**遇到障礙時必須停下來**:

- 若任務描述不清,無法執行 → 停下來問使用者
- 若執行過程發現 design.md 的決策有誤(例:介面方法簽章衝突)→ 停下來告知使用者並建議調整
- 若需要使用者提供資訊(例:外部 API key、特定設定值)→ 停下來問

**不可自行偏離計畫**:若實作中發現某個 task 應該換做法,**先停下來告知使用者**,
取得同意後再繼續。

### Step 7:執行驗證區塊

所有 task 完成後,執行 task.md「驗證」區塊列出的所有檢查:

- 執行測試
- 執行 coding style 檢查
- 其他驗證

**將驗證結果記錄下來**,準備寫入執行後備註。

### Step 8:填寫執行後備註

用 Edit 工具將 task.md 末尾「執行後備註」區塊填上:

- **實際改動檔案**:列出所有 Write/Edit 過的檔案路徑
- **偏離原計畫**:若有,說明哪一項任務怎麼改變、原因為何;若無,寫「無」
- **發現的新問題或後續建議**:條列說明;若無,寫「無」

### Step 9:回報完成

告知使用者:

> ✅ 執行完成
>
> - 共完成 N 項任務
> - 驗證結果:[通過 / 失敗(列出失敗項)]
>
> 請 review:
> 1. `git diff` 檢視程式碼變更
> 2. `specflow/changes/$ARGUMENTS/task.md` 末尾的執行後備註

## 硬規則

- ❌ **不可自行修改 issue.md / design.md**(這兩份是使用者的決策記錄)
- ❌ **不可在偏離計畫時靜默繼續** —— 一定要先停下來告知
- ❌ **不可跳過驗證步驟** —— 即使你「看起來」程式碼是對的
- ❌ **不可在執行後備註留空** —— 即使一切順利,也要明確寫「無偏離」、「無新問題」
- ❌ **絕對不要用 Read 工具讀 issue.md / design.md**(必須用 cat 繞過快取)
- ❌ **絕對不要說「沒有變更」這種仰賴記憶的判斷**
