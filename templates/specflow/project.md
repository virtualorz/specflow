---
# Specflow 流程設定 — Claude 在所有 /spec:* 指令中讀取
#
# git_flow:是否啟用 git 整合。預設 enabled,維持原本的「自動開分支 + no-ff merge」流程
#   - enabled  → /spec:new 會切到新分支、/spec:run 強制檢查分支、/spec:close 會自動 commit + merge
#   - disabled → 全部跳過 git 操作。spec 資料夾仍會建立,但分支與 merge 由你自行處理
#               適合不想被 specflow 動 git 的個人專案、或還沒進入 git workflow 的早期專案
# base_branches:git_flow=enabled 時,列出哪些分支可以執行 /spec:new(會從這些分支 fork 出 spec 分支)
#   預設值:[dev, development, develop, main]。依團隊 git workflow 調整
#   git_flow=disabled 時此設定會被忽略
git_flow: enabled
base_branches: [dev, development]
---

# <專案名> 專案規範(Project.md)

> 這份文件是專案的「憲法」。Specflow 流程中,任何 design 或 task 產出前,
> Claude 必須先讀這份。請依你的專案實際情況填寫以下章節。
>
> 沒填寫的章節,刪掉即可,**不要保留空白章節**——空白章節會讓 Claude 誤以為「這個面向不重要」。
>
> ⚠️ 檔案最上方的 `---` frontmatter 區塊是 specflow 流程設定,**請保留**。

## 1. 技術棧

- 語言/框架:
- 資料庫:
- 快取:
- 佇列:
- 部署環境:
- 其他關鍵服務:

## 2. 架構約束

列出**不可違反**的設計原則。每一條後面加上「為什麼」,讓 Claude 理解理由,
而不是死背規則。

範例:

- **Repository Pattern**:所有資料存取必須透過 `app/Repositories/`,Controller 不直接查 DB
  - 為什麼:統一資料存取入口、便於測試替換、避免邏輯散落

(請依專案填寫)

## 3. 命名慣例

- Class / 檔案名稱:
- Method:
- 變數:
- 資料庫欄位:
- (其他)

⚠️ 若專案使用**非主流慣例**(例如 PHP 專案不用 PSR-12、JS 專案不用 camelCase),
請特別標註,Claude 才不會用預設值蓋過。

## 4. 內部套件 / 共用工具(若有)

列出專案使用的內部維護套件、SDK,告訴 Claude 何時用哪個。

範例:
- `@your-org/sdk` —— 提供基礎 contract 介面,所有 service 必須使用
- (其他)

## 5. 已知陷阱與例外

紀錄那些「看起來該這樣但實際不能這樣」的反直覺行為,避免 Claude 踩雷。

範例:
- **某 API 的 response shape 會依參數變化**:當 `per_page > 0` 時 response 為
  `{data: [...], meta: {...}}`,當 `per_page = 0` 時直接是 `[...]`。

(請依專案填寫,若無可刪除整個章節)

## 6. 測試規範

- 新增功能必須有的測試類型:
- 重構不可改變的測試:
- (其他)

## 7. 不要做的事(反 Pattern 清單)

明確列出 Claude 容易誤踩的反 pattern。用 ❌ 標記強化視覺。

範例:
- ❌ 不要在 Controller 寫商業邏輯
- ❌ 不要為了通過測試而修改測試斷言
- ❌ 不要在 production code 留 debug 訊息

(請依專案填寫)
