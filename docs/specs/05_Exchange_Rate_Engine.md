# Exchange Rate Engine (匯率計算引擎) 規格書

## 核心目的 (Objective)
在調查加密貨幣詐欺或洗錢案件時，將鏈上資產數量 (Crypto) 轉換為法幣損失金額 (TWD) 是一項關鍵的證據轉換工作。
為避免手動查詢的人為誤差，並符合 ARRJ 原則中的「可重現性 (Reproducibility)」與「可稽核性 (Auditability)」，LumenTracker 將內建自動化匯率計算引擎，並將計算公式與數據來源白箱化。

## 計算公式 (Calculation Logic)
依據實務需求與開發決策，系統採用的「當日平均匯率」計算邏輯如下：

1. **獲取加密貨幣美金均價 (Crypto to USD)**
   * 公式：`(當日最高價 High + 當日最低價 Low) ÷ 2`
   * 定義：當日時間區間以 UTC+0 為基準，涵蓋 00:00:00 至 23:59:59。
2. **法幣匯率轉換 (USD to TWD)**
   * 公式：`(第一步計算出之美金均價) × (交易當日之 USD/TWD 匯率)`

## 數據來源 (Data Sources) - Zero Budget Strategy
為堅守「零預算開發」原則，系統將完全避開需付費訂閱歷史數據之服務 (如 CoinMarketCap, CoinGecko)，改採公開且免費的數據源：

1. **加密貨幣歷史 K 線 (OHLCV)**
   * 來源：**Binance Public API** (`https://api.binance.com/api/v3/klines`)
   * 優勢：無須 API Key，無請求次數或歷史年份之嚴格限制，適合調查舊案。
2. **法幣歷史匯率 (USD/TWD)**
   * 來源：**開源外匯 API** (例如: Frankfurter API, ExchangeRate-API 的免費層) 或 **內建靜態對照表** (若免費 API 不穩定，將定期更新台銀歷史資料包入系統)。

## 系統防護機制 (Fallback & Validation)
1. **API 錯誤處理**：若 Binance 或外匯 API 請求失敗 (如網路阻擋或格式變更)，系統不得崩潰，必須在 UI 上明確提示「獲取失敗，請手動查驗」，並允許調查員以人工補登。
2. **匯率異常警告**：若系統計算出之「當日平均匯率」與調查員輸入之「被害人實際交易匯率 (TWD/Crypto)」落差大於特定閥值 (例如 > 5%)，系統應在「微觀證據面板」中顯示警告，提示該筆交易可能存在場外交易 (OTC) 溢價或水房套利行為。

## 證據揭示要求 (Transparency)
在最終產出的 PDF/Word 鑑識報告中，此模組的運算結果必須附帶明確聲明，例如：
> 「本報告中之當日平均匯率，係由 LumenTracker 系統自動向 Binance 公開 API 擷取 [日期] 之 [幣種/USDT] 歷史最高與最低價求取平均，並乘上當日 USD/TWD 匯率所得。計算公式為：((High + Low)/2) * TWD_Rate。查詢時間為：[系統執行時間]。」

## 附錄：數位資產法幣價值核定計算基準 (供鑑識報告引用)

為確保本系統產出之鑑識報告具備最高程度之客觀性、一致性，並能經受法庭交互詰問之考驗，本系統計算交易當日「虛擬貨幣折算新台幣」之基準，一律採用**「雙軌高低均價計算核定法 (Dual-Track High/Low Average Method)」**。

### 1. 核心計算公式
本系統之最終台幣換算匯率，由以下兩道公式交乘得出：

*   **公式一：虛擬資產美金均價核定**
    > `Crypto_USD_Avg = (當日最高價 High + 當日最低價 Low) / 2`
*   **公式二：外匯美金台幣均價核定**
    > `USD_TWD_Avg = (當日最高價 High + 當日最低價 Low) / 2`
*   **最終交易當日參考匯率**
    > `Final_Exchange_Rate (TWD) = Crypto_USD_Avg × USD_TWD_Avg`
*   **該筆交易法定財產價值 (TWD)**
    > `Total_Fiat_Value = 交易數量 (Crypto Amount) × Final_Exchange_Rate`

### 2. 實作考量與法學正當性 (Justifiability)
1. **消弭極端波動爭議**：虛擬貨幣單日波動極大，若採「開盤價」或「收盤價」，極易受時區差異或特定主力拉抬影響。採用「最高與最低之算術平均值」，最能代表該日之一般交易水準，落實司法公平性。
2. **計算標準一致性**：無論是「加密貨幣/美金」或「美金/台幣」板塊，皆嚴格套用同一均價邏輯，杜絕辯方對於計算基準雙標之質疑。
3. **資料來源客觀性**：採用全球具公信力之開源金融數據 (Yahoo Finance Historical Data) 作為第三方公正報價來源，符合數位證據之可稽核性 (Auditability)。
