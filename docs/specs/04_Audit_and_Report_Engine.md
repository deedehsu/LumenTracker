# UI & 報告引擎: 證據鏈稽核與透明度揭示 (Audit & Transparency Engine)

## 核心設計理念：ARRJ 原則的終極實踐
依據 ISO/IEC 27037 數位證據保全標準與 ARRJ (Auditability, Reproducibility, Repeatability, Justifiability) 鑑識科學原則，LumenTracker 產出的任何分析報告，不能僅提供「結論」，必須完整揭示「產生該結論的過程與依據」。

本引擎旨在將 LumenTracker 的底層技術、資料來源與運算邏輯，以法庭可讀 (Court-readable) 的方式封裝進最終的鑑識報告中。

## 報告必須強制揭示之技術附錄 (Technical Appendix)

每次使用者點擊「匯出鑑識報告 (PDF/Word)」時，系統將自動在報告的最後一章附加【鑑識方法與技術聲明】，強制包含以下資訊：

### 1. 軟體環境與工具版本 (Tools)
*   **軟體名稱與版本**：LumenTracker v1.0.x (Local Desktop Environment)
*   **加密與金鑰管理 (BYOK)**：聲明 API Key 由調查員個人提供，並採用 PBKDF2 (100,000 次迭代) 加密存放於本機，確保系統開發方無從介入查詢過程。

### 2. 數據來源聲明 (Data Sources)
詳細列出所有 API 的端點 (Endpoints) 與提供商：
*   **以太坊 / EVM 交易紀錄**：`Etherscan API V2 (https://api.etherscan.io/v2/api)`。聲明數據來自鏈上公開帳本之直接映射。
*   **波場 / TRC-20 交易紀錄**：`Tronscan API (https://apilist.tronscanapi.com/api/)`。
*   **加密貨幣歷史市場價格**：`Binance Public Klines API (https://api.binance.com/api/v3/klines)`。聲明此為免金鑰之公開市場深度歷史資料。
*   **法幣歷史匯率 (USD/TWD)**：[待定：例如台灣銀行開源匯率庫或第三方開源 API]。

### 3. 自動化計算公式揭示 (Calculation Methodology)
將系統背後的「黑箱」計算過程徹底「白箱化」：
*   **單筆交易匯率計算**：`(被害人陳述之新台幣損失金額) ÷ (報案陳述之加密貨幣數量)` = 該筆交易專屬匯率。
*   **當日平均市場匯率計算**：
    *   Step A: 擷取交易發生當日 (UTC+0) 之 Binance K線數據。
    *   Step B: `(當日最高價 High + 當日最低價 Low) ÷ 2` = 當日平均美金計價 (USD)。
    *   Step C: `(當日平均美金計價) × (當日 USD/TWD 歷史匯率)` = 當日新台幣平均參考匯率。
    *   *法庭價值：將「系統算出的平均匯率」與「被害人遭詐騙的實際匯率」並列對照，若被害人匯率顯著高於市場均價，可作為詐欺水房「賺取匯差/套利」的間接證據。*

### 4. 數位證據完整性保全 (Integrity & Chain of Custody)
*   **操作日誌 (Audit Log)**：列出該次調查的啟動時間、登入之調查員身分 (單位/職稱/姓名/聯絡電話)。
*   **數位指紋 (Hash)**：報告產出瞬間，系統將對整份報告檔案生成一組 SHA-256 雜湊值 (Hash)，並印於報告首頁或騎縫處，確保報告提交至法庭後，任何字元的竄改皆能被檢驗。

## 開發任務分配
1. 在 Node.js 後端建立 `AuditLogger` 模組，於每次 API 呼叫、登入、新增紀錄時，默默寫入 JSON 格式的本地日誌。
2. 開發報告產出模組 (Report Generator)，將上述四點以範本 (Template) 的方式固定寫入報告末尾。
