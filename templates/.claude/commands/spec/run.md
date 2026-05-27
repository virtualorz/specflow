---
description: 從 design.md 產生 task.md 並逐項執行(若 design.md 有未處理問題會先處理或停下)
argument-hint: <task-name 或編號簡寫如 0002 / 2>
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# /spec:run — 完成 design 後一氣呵成執行

使用者輸入:`$ARGUMENTS`

⚠️ **輸入可能是兩種格式**:
- 完整 task name(例:`0002-modify-hello-controller`)
- **編號簡寫**(例:`0002`、`002`、`2`)

Step 0 會先把它解析成完整的 `task_name`。**之後所有檔案操作都用 `task_name`**(由 Step 0 解析得到),**不要直接用 `$ARGUMENTS`**;凡是路徑會用到 task_name 的命令,**改用 Bash 工具**呼叫,不可放在 `!\`...\``,因為 `!\`...\`` 載入時會直接代入 `$ARGUMENTS` 的字面值,簡寫情境下會找不到檔案。

⚠️ **這個指令吃下了原本 `/spec:task` 的職責**:它會檢查 design.md 是否就緒,
若就緒就**自動產 task.md 並直接開跑**;若不就緒就停下來處理(討論 / 提示勾選)。

## 你的任務

### Step 0:解析 task_name + 讀 git_flow + 分支檢查(enabled 時為硬閘門)

#### Step 0a:列出現有 spec change 資料夾

!`ls -1 specflow/changes/ 2>/dev/null || echo "__SPECFLOW_CHANGES_MISSING__"`

⚠️ `|| echo "__SPECFLOW_CHANGES_MISSING__"` 是必要的 fallback:`ls` 對不存在的目錄會 exit 2,Claude Code 載入 slash command 時會把這當成 shell error 並 abort 整個指令(`2>/dev/null` 只擋 stderr,擋不掉非零 exit code)。

把這個輸出記為 `existing_folders`(每行一個資料夾名稱)。

若輸出**含 `__SPECFLOW_CHANGES_MISSING__`** → 代表 `specflow/changes/` 目錄不存在,**立即停止**並告知:

> ❌ 找不到 `specflow/changes/` 目錄。常見原因:
> - 你不在專案根目錄(請 `cd` 到含有 `specflow/` 的目錄再執行)
> - 這個專案還沒安裝 specflow(請執行 `npx @virtualorz/specflow init`)

#### Step 0b:解析 task_name

依以下規則:

- 若 `$ARGUMENTS` 符合**純數字**格式(`^[0-9]+$`)→ 把它**補零成 4 位數**(`PADDED`),然後在 `existing_folders` 中找開頭是 `<PADDED>-` 的資料夾名:
  - 例:`$ARGUMENTS = "2"` → PADDED = `"0002"` → 找 `0002-modify-hello-controller`
  - 找到 → `task_name` = 該資料夾名
  - 找不到 → **立即停止**並告知:
    > 找不到編號 `<PADDED>` 對應的 spec change 資料夾。
    > 目前可用的編號:`<列出 existing_folders 中符合 [0-9]{4}- 開頭的所有編號前綴>`
- 否則(`$ARGUMENTS` 已經像完整 task name)→ `task_name = $ARGUMENTS`

⚠️ 從這一步之後,**只用 `task_name`**(不要再用 `$ARGUMENTS`)。

#### Step 0c:讀取 project.md 取得 git_flow 設定

先用 bash 確認 project.md 存在:

!`test -f specflow/project.md && echo "OK" || echo "MISSING"`

若輸出是 `MISSING` → **立即停止**並告知:「specflow/project.md 不存在,請先建立後再執行 /spec:run。」

使用 **Read 工具**讀取 `specflow/project.md`。從 frontmatter 解析 `git_flow`:
- 有 `git_flow` 鍵 → 用該值(`enabled` / `disabled`)
- 沒有 → 預設 `enabled`(向後相容)

把結果記為 `git_flow`。

#### Step 0d:[若 git_flow=enabled] 強制檢查目前分支

⚠️ 若 `git_flow == "disabled"` → **整個 Step 0d 跳過**,直接進入 Step 1。
告知使用者:

> ℹ️ `git_flow: disabled` —— 略過分支檢查。請自行確保在正確的工作分支上,
> /spec:run 會直接在當前分支寫程式碼。

!`git rev-parse --is-inside-work-tree 2>/dev/null || echo "NOT_GIT_REPO"`

若輸出是 `NOT_GIT_REPO` → 直接進入 Step 1(舊版 specflow 的相容路徑)。
若是 git repo,繼續以下檢查:

!`git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "NO_HEAD"`

把輸出記為 `current_branch`。若 `NO_HEAD` → 跳過分支比對直接進入 Step 1(極罕見的空 repo 情境)。
否則若 `current_branch` **不等於** `task_name` →
**立即停止**並告知:

> ❌ 目前在 `<current_branch>` 分支,但 /spec:run 必須在 `<task_name>` 分支上執行。
>
> /spec:run 會實際修改程式碼,在錯誤的分支上跑會把變更寫到不該寫的地方。
>
> 請先執行:`git checkout <task_name>`,再重新執行 /spec:run。
>
> (若你的專案不想用 specflow 管 git,可在 `specflow/project.md` 設 `git_flow: disabled`。)

⚠️ **這裡是硬閘門,不可繞過**(git_flow=enabled 時)。即使使用者口頭說「我知道、繼續」,
也不要自行跳過,要求他們真的切換分支。

### Step 1:確認 design.md 存在

**使用 Bash 工具**執行(把 `TASK_NAME` 替換成 Step 0 解析得到的 `task_name`,後續所有 Bash 工具命令同理):

```
test -f specflow/changes/TASK_NAME/design.md
```

若 exit code != 0 → **立即停止**並提醒使用者「請先執行 /spec:design <task_name>」。

### Step 2:讀取 project.md(用 Read 工具)

`project.md` 是穩定的專案規範,使用 Read 工具讀取:

`specflow/project.md`

### Step 3:【關鍵】用 cat 強制重新讀取 design.md

⚠️ **重要**:`design.md` 是使用者剛剛在編輯器中審查、勾選、可能寫了討論問題的檔案。
**不可使用 Read 工具**(有快取)。**必須使用 cat**。

**使用 Bash 工具**執行:

```
cat specflow/changes/TASK_NAME/design.md
```

⚠️ 上述 cat 命令的輸出**就是 design.md 的真實內容**,以此為準。

### Step 4:檢查兩個閘門條件

進入「實際執行」之前,design.md 必須同時滿足:

1. **決策清單全部勾選**(沒有 `- [ ]` 項目)
2. **「待討論問題」區塊清空**(沒有實質內容,只剩 template 說明文字)

#### 條件 1 檢查:決策清單

**使用 Bash 工具**執行:

```
grep -cE "^\s*- \[ \]" specflow/changes/TASK_NAME/design.md
```

把輸出記為 `unchecked_count`。

#### 條件 2 檢查:待討論問題區塊

**使用 Bash 工具**執行:

```
awk '/^## 待討論問題/,0' specflow/changes/TASK_NAME/design.md
```

判斷此區塊是否有「實質討論問題」:

- ✅ **有實質問題**:存在不在 `>` 引用區塊內、不在 `<!-- -->` 註解內、且看起來像是使用者真的寫的問題的 bullet 點(例如「- 決策 4 - 是否要加 is_active 欄位?」)
- ❌ **無實質問題**:區塊只剩 template 預設的說明文字(`>` 開頭的引用、`<!-- -->` 註解、空行)

判斷原則:**仰賴你的閱讀理解**,不要被 template 說明文字干擾。

### Step 5:依條件分支執行

| 條件 1(決策清單) | 條件 2(待討論問題) | 走哪個流程 |
|---|---|---|
| 全勾選 | 無問題 | **A. 產 task.md → 執行** |
| 全勾選 | 有問題 | **B. 討論模式**(處理完停下) |
| 未全勾選 | 無問題 | **C. 提示勾選**(停下) |
| 未全勾選 | 有問題 | **B. 討論模式**(優先處理討論,處理完停下) |

---

## 流程 A:產 task.md → 執行

(條件 1 + 條件 2 都滿足 → 進入這個流程)

### A-1:判斷 task.md 處理策略

先確認 task.md 是否存在。**使用 Bash 工具**執行:

```
test -f specflow/changes/TASK_NAME/task.md && echo "EXISTS" || echo "MISSING"
```

依以下決策樹處理:

#### A-1-1:輸出 `MISSING`(task.md 不存在)

→ 直接進入 A-2 產生新的 task.md。

#### A-1-2:輸出 `EXISTS`,且 task.md 內**有任何 `- [x]`**(代表執行已開始)

統計勾選狀態。**使用 Bash 工具**執行(連跑兩次):

```
grep -cE "^\s*- \[x\]" specflow/changes/TASK_NAME/task.md
```

```
grep -cE "^\s*- \[ \]" specflow/changes/TASK_NAME/task.md
```

把兩個數字記為 `done_count` 與 `pending_count`。

- 若 `pending_count == 0`(全部已勾選)→ 告知使用者「task.md 已全部完成,無需執行」並停止
- 若 `pending_count > 0` → **直接沿用現有 task.md**,不重產(執行已開始,不該重新洗牌),跳到 A-3。
  告知使用者:「偵測到 task.md 已完成 `done_count` 項,剩餘 `pending_count` 項待執行,從第一個未勾選項目繼續。」

⚠️ 這個分支**不檢查過期**——一旦執行開始,計畫就應該照原計畫走完,
除非使用者主動刪掉 task.md 或手動編輯。

#### A-1-3:輸出 `EXISTS`,且 task.md 內**全部 `- [ ]`**(尚未執行)

可能的狀況:上次產完 task.md 但還沒跑、或是上次跑到一半使用者重置了。
這裡要檢查 task.md 是否相對於 design.md 過期。**使用 Bash 工具**執行:

```
find specflow/changes/TASK_NAME/design.md -newer specflow/changes/TASK_NAME/task.md 2>/dev/null
```

- 若**輸出非空**(design.md 比 task.md 新)→ 告知使用者並**停下來問**:

  > ⚠️ design.md 比 task.md 還新,task.md 可能已過期。
  >
  > 要重新產生 task.md 嗎?(y = 重產 / n = 沿用既有的)
  >
  > - 重產:會以目前的 design.md 重新拆任務(會覆蓋 task.md 內容)
  > - 沿用:直接用現有 task.md 開始執行(若 design.md 改的部分跟既有任務衝突,執行中可能要停下調整)

  使用者明確回 y → 進入 A-2 重產(會覆蓋舊的 task.md)
  使用者明確回 n → 跳到 A-3 用既有的執行
  其他回應(包含留白)→ 預設沿用,跳到 A-3

- 若**輸出為空**(task.md 跟 design.md 一樣新或更新)→ 直接跳到 A-3 用既有的。

### A-2:產生 task.md

(只有 A-1-1 或 A-1-3 + 重產 才會走到這裡)

#### A-2-1:讀取 issue.md(用 cat 繞過快取)

**使用 Bash 工具**執行:

```
cat specflow/changes/TASK_NAME/issue.md
```

design.md 已在 Step 3 用 cat 讀過,project.md 已在 Step 2 用 Read 讀過,不必重讀。

#### A-2-2:依 template 產生 task.md

依照 `.claude/skills/specflow/templates/task.md` 格式產出。

**強制要求**:

- 每項任務是一個 checkbox,顆粒度為**5 分鐘內可完成**
- 每項任務必須包含「**檔案路徑** + **改動內容**」兩個子項
- 涉及新 Service 時,任務必須包含三步驟(依 project.md §3):
  1. 建立 Core interface(`app/Core/Services/{Module}/Contracts/`)
  2. 建立 implementation(`app/Services/{Module}/`)
  3. 注入到使用方
- 「驗證」區塊必須列出測試命令、coding style 檢查、其他手動驗證
- 「執行後備註」區塊**保持空白**(由本流程後段填寫)
- 整份 task.md 必須使用**繁體中文**撰寫

#### A-2-3:寫入 task.md

使用 **Write 工具**寫入 `specflow/changes/<task_name>/task.md`(把 `<task_name>` 換成 Step 0 解析的值)。

簡短告知使用者:

> 📋 已產生 task.md(N 項任務),即將開始執行...

⚠️ **不要在這裡停下來等使用者確認**——這就是合併後的 /spec:run 的設計:
產完 task.md 直接接續執行。使用者若想看 task.md,可以中斷後手動 review,
再重跑 /spec:run(已存在且全 `[ ]` → 走 A-1-3 沿用)。

### A-3:讀取 task.md(用 Read 工具,因為後續要 Edit)

⚠️ **特殊情況**:task.md 後續需要用 Edit 工具勾選 checkbox(`- [ ]` → `- [x]`),
Edit 工具需要透過 Read 工具讀過才能正確定位行號。**因此 task.md 必須用 Read 工具讀取**。

但為了避免快取問題,在 Read 之前先用 cat 印一次內容做交叉比對。**使用 Bash 工具**執行:

```
cat specflow/changes/TASK_NAME/task.md
```

接著使用 Read 工具讀取 `specflow/changes/<task_name>/task.md`。

如果 cat 輸出跟 Read 結果**有顯著差異**(例如 cat 顯示某項已勾選但 Read 顯示未勾選),
**立即停止**並告知使用者「task.md 的內容讀取結果不一致,請重新開啟 Claude Code session」。

### A-4:逐項執行

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

### A-5:執行驗證區塊

所有 task 完成後,執行 task.md「驗證」區塊列出的所有檢查:

- 執行測試
- 執行 coding style 檢查
- 其他驗證

**將驗證結果記錄下來**,準備寫入執行後備註。

### A-6:填寫執行後備註

用 Edit 工具將 task.md 末尾「執行後備註」區塊填上:

- **實際改動檔案**:列出所有 Write/Edit 過的檔案路徑
- **偏離原計畫**:若有,說明哪一項任務怎麼改變、原因為何;若無,寫「無」
- **發現的新問題或後續建議**:條列說明;若無,寫「無」

### A-7:回報完成

告知使用者:

> ✅ 執行完成
>
> - 共完成 N 項任務
> - 驗證結果:[通過 / 失敗(列出失敗項)]
>
> 請 review:
> 1. `git diff` 檢視程式碼變更
> 2. `specflow/changes/<task_name>/task.md` 末尾的執行後備註

---

## 流程 B:討論模式

(只要條件 2 有問題,無論條件 1 是否滿足,都進入此流程)

### B-1:讀取背景資料

- `specflow/project.md` → Step 2 已讀
- issue.md → **使用 Bash 工具**執行:`cat specflow/changes/TASK_NAME/issue.md`
- `design.md` → Step 3 已用 cat 讀過

### B-2:取得當前日期(用於記錄到「已討論問題」)

!`date +%Y-%m-%d`

記下這個日期,稱為 `today`,後續寫入「已討論問題」時使用。

### B-3:逐題處理

對「待討論問題」區塊中的**每一個使用者寫的問題**:

1. **理解問題**:讀懂使用者在問什麼,屬於哪條決策
2. **回答問題**:基於 project.md、issue.md、現有 design.md 的脈絡給出技術判斷
3. **判斷是否需要修改決策**:
   - 若使用者的疑問引出了應該調整的點 → **需要修改受影響的決策**
   - 若只是請求解釋(例:「為什麼選這個索引順序?」)且原決策仍合理 → **不修改決策**,僅記錄解釋

### B-4:修改 design.md(三個動作)

使用 **Edit 工具**對 design.md 做以下修改:

#### 動作 1:修改受影響的決策

- 若決策需要修改:直接覆蓋決策內容(**不保留歷史版本**;歷史交給「已討論問題」+ git)
- 若決策不需修改:跳過此動作
- 若決策被修改了:把該決策的 `- [x]` 改回 `- [ ]`(需要重新審查)
- 若決策原本就是 `- [ ]`(使用者還沒勾):維持 `- [ ]`

#### 動作 2:把問題摘要追加到「已討論問題」區塊

⚠️ 這是**追加**,不是覆蓋。如果區塊裡已經有舊的討論記錄,**保留它們**,把新記錄加在最後。

對每個處理過的問題,寫入下列格式:

```markdown
### N. 決策 X - <問題主題的精簡標題>
- **問題**:<使用者原問題的簡短復述>
- **結論**:<你的技術判斷,1~2 句話>
- **影響**:<選擇下列其一>
  - 決策 X 已更新:<簡述更新內容>
  - 未修改決策(僅補充說明)
- **討論時間**:`today`(B-2 取得的日期)
```

⚠️ `N` 的編號是**連續的**——若區塊裡已經有 `### 1.`、`### 2.`,新的就從 `### 3.` 開始。
若區塊原本是空的(只有 template 註解),從 `### 1.` 開始。

⚠️ Edit 工具的 old_str 應該定位到 template 註解 `<!-- 討論記錄會自動追加在這裡。初始狀態為空。 -->`
**之後**(下一行開始)插入新記錄;**保留**這個註解。
若區塊已經有舊記錄,則 old_str 定位到最後一個記錄的尾巴,在後面追加。

#### 動作 3:清空「待討論問題」區塊

- 刪除使用者寫的所有問題 bullet
- **保留** template 的說明文字(`>` 引用區塊、`<!-- -->` 註解)
- 這樣下次 cat 看到的「待討論問題」區塊會回到空白狀態

⚠️ **不要修改「決策清單」+「已討論問題」+「待討論問題」以外的區塊**
(影響範圍、實作細節、降級策略),除非那些區塊的內容真的因為討論結論而需要更新。

### B-5:回報處理結果

告知使用者:

> ## 討論處理完成
>
> ### 處理的問題
>
> 1. **問題**: [使用者原問題]
>    **回答**: [你的技術判斷]
>    **動作**: [修改了決策 X / 未修改決策(僅解釋)]
>
> 2. ...
>
> ### 變更摘要
>
> - 修改的決策: [列出決策編號與標題]
> - 重置為待審查的 checkbox: [N 個]
> - 已寫入「已討論問題」: [N 筆記錄]
> - 「待討論問題」區塊: 已清空
>
> ### 下一步
>
> 請審查 design.md 中變更過的決策,確認後勾選 checkbox。
> 若有新的疑問,可繼續寫入「待討論問題」區塊。
> 全部勾選且無新問題後,重新執行 `/spec:run <task_name>`(也可用編號簡寫)。

### B-6:停止

**不要繼續產 task.md、不要執行任何任務**。即使你修改完決策後檢查發現
「決策清單剛好全勾選 + 待討論清空」,也不要往下跑,因為:

1. 你剛才把修改過的決策的 `[x]` 改回 `[ ]`,所以條件 1 必然不滿足
2. 即使有 edge case 讓條件 1 仍滿足(例如使用者只問了「為什麼這樣設計」沒改決策),
   仍應停下來讓使用者重新檢視

---

## 流程 C:提示使用者勾選決策

(條件 1 未滿足,條件 2 已清空 → 進入此流程)

告知使用者並停止:

> ⚠️ design.md 中仍有 N 個未勾選的決策項。
>
> 請在編輯器中將同意的決策從 `- [ ]` 改為 `- [x]`,
> 或修改該項內容後勾選。
>
> 全部勾選後重新執行 `/spec:run <task_name>`(也可用編號簡寫)。

---

## 硬規則

- ❌ **絕對不要在 `!\`...\`` 中用 `$ARGUMENTS` 接路徑** —— 編號簡寫情境下會找不到檔案。所有檔案操作改用 Bash 工具配 task_name(命令字串中的 `TASK_NAME` 占位符要替換成 Step 0 解析得到的值)
- ❌ **git_flow=enabled 時絕對不要在分支不符時繼續執行**(Step 0d 是硬閘門) —— 即使使用者說「我知道、繼續」也要求他們切回對應分支
- ⚠️ **git_flow=disabled 時防護被關閉** —— /spec:run 會直接在當前分支寫程式碼,使用者必須自行確保已切到正確分支。這是 disabled 模式的明確 trade-off,不要靜默地補回 enabled 模式的檢查
- ❌ **絕對不要在「決策清單未全勾選」+「待討論問題清空」時產 task.md 或執行**
- ❌ **絕對不要在討論模式中自動產 task.md 或執行**(無論決策清單看起來多完整)
- ❌ **絕對不要在執行已開始(task.md 有 `[x]`)時重產 task.md** —— 沿用現有計畫
- ❌ **不可自行修改 issue.md / design.md**(除了討論模式中明確允許的三個動作)
- ❌ **不可在偏離計畫時靜默繼續** —— 一定要先停下來告知
- ❌ **不可跳過驗證步驟** —— 即使你「看起來」程式碼是對的
- ❌ **不可在執行後備註留空** —— 即使一切順利,也要明確寫「無偏離」、「無新問題」
- ❌ **絕對不要用 Read 工具讀 issue.md / design.md**(必須用 cat 繞過快取)
- ❌ **絕對不要說「沒有變更」這種仰賴記憶的判斷**
- ❌ task 顆粒度**禁止超過 5 分鐘**(超過要拆分)
