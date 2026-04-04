# 論文大綱結構與第一章草稿 (Thesis Structure and Introduction)

## 論文標題
**From Investigative Steps to Legal Proof: A Guided Blockchain Forensic System with Localized Evidence Preservation**

## 論文大綱結構 (基於設計科學研究法 Design Science Research, DSR)

本研究採用設計科學研究法 (DSR) 作為核心方法論。DSR 旨在透過建構創新的「人造物 (Artifact)」（本研究中為一套單機版區塊鏈幣流分析與風險評估軟體）來解決實務上的核心問題，並透過嚴謹的評估來驗證其效用。

論文大綱結構如下：

*   **1. Introduction (緒論)**
    *   1.1 Research Background and Motivation (研究背景與動機)
    *   1.2 Research Objectives (研究目的)
    *   1.3 Research Limitations (研究限制)
    *   1.4 Thesis Structure (論文架構)
*   **2. Background and Literature Review (背景與文獻回顧)**
    *   2.1 Current State of Blockchain Forensics Technology (區塊鏈鑑識技術發展現況)
    *   2.2 Digital Evidence Standards and Judicial Challenges (數位證據標準與司法挑戰)
    *   2.3 Application Potential of Serverless Architecture in Forensics (無伺服器架構在鑑識領域的應用潛力)
    *   2.4 Forensic Science and Visual Presentation (鑑識科學與視覺化呈現)
*   **3. Research Questions and Goals (研究問題與目標)**
    *   3.1 Research Questions (研究問題)
    *   3.2 Research Objectives (研究目的)
*   **4. Research Methodology and System Design (研究方法與系統設計)**
    *   4.1 System Architecture (系統架構)
    *   4.2 Key Feature Implementation (關鍵功能實作)
    *   4.3 Security and Evidence Preservation (資安與證據保全)
    *   4.4 Forensic Integrity Mechanisms (鑑識完整性機制)
*   **5. Expected Contributions (預期貢獻)**
    *   Academic (學術貢獻)
    *   Technical (技術貢獻)
    *   Practical (實務貢獻)

---

## 第一章：緒論 (Introduction)

### 1.1 研究背景與動機

近年來，詐欺集團及跨境犯罪廣泛利用虛擬資產（加密貨幣）進行資金轉移，由於其去中心化與偽匿名的特性，大幅增加了資金斷點與執法機關的偵查難度。執法機關在追查加密貨幣金流時，面臨著前所未有的挑戰。

傳統上，執法單位高度依賴商業化的區塊鏈分析軟體（如 Chainalysis 等）。然而，這些現行解決方案存在幾項顯著的困境，成為本研究的核心動機：
1.  **洗錢態樣繁複且學習曲線陡峭**：犯罪集團常使用混幣行為（Mixers）、跨鏈操作（Cross-chain Bridges）等進階態樣，基層調查員缺乏足夠知識，難以獨立判讀複雜的交易行為。
2.  **傳統軟體昂貴且黑箱 (Black-box)**：商用軟體不僅授權費高昂，其風險評分演算法多屬商業機密。這導致在法庭上常面臨辯方對「證據產生過程」的質疑，難以滿足司法對證據透明度的要求。
3.  **偵查不公開與隱私洩露風險**：使用雲端商用軟體，意味著調查員必須將嫌疑地址上傳至第三方伺服器，存在違反「偵查不公開」原則的風險。
4.  **法庭證據轉換之挑戰**：加密貨幣交易調查往往涉及複雜交易流程、技術專有名詞與大量資料圖譜。如何將此轉化為法官與陪審團「可理解、可驗證之證據鏈」，是目前區塊鏈數位鑑識在法庭攻防上的重要挑戰。

有鑑於此，開發一套能夠解析常見洗錢態樣、建立透明風險評估模型，且能將鑑識過程轉化為法庭可驗證證據的本土化實證工具，實屬當務之急。

### 1.2 研究目的

本研究擬透過區塊鏈交易資料分析，建構「幣流關聯圖」與「風險評分模型」，以辨識常見之洗錢態樣（如混幣行為、跨鏈操作）。並運用「設計科學研究法 (DSR)」，將此模型實作為一套專為司法調查設計的單機版軟體。具體目的如下：

1.  **建構幣流查緝之風險評分模型**：基於真實犯罪態樣，建立一套量化的風險評估標準（例如：資金來源分析、權限轉移判定、水庫特徵比對），協助調查員快速篩選高風險地址。
2.  **開發單機版實證分析工具 (BYOK 架構)**：軟體採完全單機運行，調查員自備免費 API 金鑰 (BYOK) 獲取公開帳本資料，並結合主動式防呆驗證（如匯率自動比對），確保資料正確性並落實偵查不公開。
3.  **確保證據同一性之雜湊 (Hash) 封裝機制**：系統底層對從區塊鏈擷取之原始數據與調查員之操作日誌進行即時 SHA-256 雜湊運算。在匯出分析報告或展示案件包時，系統將自動驗證雜湊碼，確保證據產生過程的不可篡改性，並滿足司法實務對證據傳遞鏈之嚴格要求。
4.  **建構幣流關聯圖與「法庭展演模式」**：系統將風險模型與交易紀錄視覺化為關聯圖，並內建足跡引擎。調查結果可封裝為加密案件包，於法庭斷網環境中，以互動式重現資金追查的邏輯與證據，強化司法說服力。

### 1.3 研究限制

本研究所開發之系統與探討範圍存在以下限制：
1.  **資源限制 (零預算開發)**：本研究在零預算環境下建構，風險評分模型主要依賴公開帳本特徵與開源情報 (OSINT)，無法維護龐大的專有標籤資料庫。
2.  **系統環境限制 (單機運行)**：為確保絕對的隱私安全，軟體採單機版，無法提供多人即時協同調查，案件共享需透過實體檔案傳遞。
3.  **網路依賴與 API 限制**：獲取區塊鏈數據需連線至外部公開節點（透過自備 API Key），調查過程可能受限於免費 API 的呼叫頻率限制。