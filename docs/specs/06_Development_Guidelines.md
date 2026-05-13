# LumenTracker 開發守則與品質控制 (Development Guidelines & QA)

## 核心反省與改進 (Core Retrospective)
在 UI 6 與 UI 7 的密集開發階段，發生了數次嚴重的程式碼覆蓋、功能遺失、以及 Git 狀態衝突等問題。這些錯誤不僅影響了測試效率，也造成了開發資源 (Token) 的浪費。作為 Chief Agent 兼 Developer，必須深刻檢討並嚴格執行以下開發守則。

## 1. 程式碼修改原則 (Code Modification Rules)
*   **精準替換 (Precise Replacement)**：禁止使用過度寬鬆的正則表達式 (Regex) 進行大範圍替換。所有對 HTML/JS 的修改，必須精確錨定上下文 (Context Anchoring)，並在替換前驗證目標字串的存在。
*   **增量開發 (Incremental Development)**：避免一次性重寫整個檔案。每個功能區塊 (Block) 的修改必須獨立、可測試。
*   **防禦性編程 (Defensive Programming)**：
    *   DOM 元素操作必須加上可選串連 (Optional Chaining, `?.`) 或 Null 檢查，防止 `Cannot read properties of null` 導致全域腳本崩潰。
    *   所有 API 呼叫與非同步操作必須包覆在 `try...catch` 區塊中，並在 UI 上提供明確的錯誤回饋。

## 2. Git 與部署守則 (Git & Deployment Protocol)
*   **狀態確認**：在每次 `git push` 前，必須執行 `git status` 與 `git diff`，確認即將推送的變更符合預期，且未意外刪除其他功能的程式碼。
*   **衝突預防**：若預期使用者的本地端可能有未提交的變更 (如 `package.json` 的更新)，必須在提供更新指令時，明確給予 `git fetch` 與 `git reset --hard origin/main` 的操作建議，確保本地與遠端強制同步。

## 3. 測試與驗證 (Testing & Validation)
*   **本地驗證 (Local Verification)**：在提交程式碼前，必須利用 OpenClaw 的 `exec` 環境，模擬 Node.js 執行或分析 HTML 結構，確認語法正確且關鍵 ID/邏輯未遺失。
*   **功能隔離測試**：當新增一個功能 (如：UI 7 畫布) 時，必須確保不影響既有功能 (如：UI 6 的按鈕)。

## 4. 資源與效率控管 (Resource Efficiency)
*   **謀定而後動 (Think Before Act)**：在接收到新的需求時，先進行系統架構與影響範圍的評估，提出完整的實作計畫並與決策者 (Deede) 確認後，再開始撰寫程式碼，避免反覆修改帶來的浪費。

## 3. 外部 API 連線與限制防禦機制 (External API Defensive Strategies)

為應對 Etherscan 將免費版 API 單次請求上限自 10,000 筆下調至 1,000 筆之政策（生效日：2026/07/01），並堅守 LumenTracker 之「零預算戰略」，系統實作必須強制遵循以下防禦策略：

1. **精準時空擷取 (Time/Block-bound Fetching)**
   - 在抓取歷史交易 (`/api?module=account&action=txlist`) 時，不可依賴預設之無限制查詢。應將被害人受騙時間點轉換為區塊高度 (`startblock` 與 `endblock`)，以大幅縮小撈取範圍，防止關鍵交易遭截斷。
2. **巨量節點側寫 (Volume Profiling Strategy)**
   - 若 API 回傳之交易筆數觸及 1,000 筆上限，系統不應視為報錯，而應將此限制轉化為鑑識特徵。系統須於 UI 7 標記該節點為「**高頻巨量交易節點**」，並自動提示調查員該地址極可能為「交易所熱錢包 (Hot Wallet)」、「混幣器 (Mixer)」或「大型洗錢水庫」，提醒其改變追查策略。
3. **自動分頁迴圈防護 (Safe Pagination)**
   - 若必須執行全歷史掃描，底層通訊模組需實作基於 `page` 與 `offset` 之自動翻頁迴圈，並嚴格設定「防暴衝延遲 (Throttle Delay)」，確保 API 呼叫頻率不會觸發 `429 Too Many Requests` (目前上限為 5 req/sec)。
