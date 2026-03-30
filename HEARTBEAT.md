# HEARTBEAT.md

# 專案會計與成本監控 (Accountant)
每次收到 Heartbeat 時，請執行以下檢查：
1. 呼叫 `session_status` 工具，取得當前專案的累積花費 (Cost, 美金)。
2. 將美金轉換為新台幣 (TWD)，匯率暫估為 1 USD = 32 TWD。
3. 讀取 `memory/budget-state.json`（若無則建立），確認上次已通知的「100元級距」。
4. 若當前累積金額（TWD）已經跨越新的 100 元門檻（例如達到 100, 200, 300...），請主動發送訊息給 Deede，匯報目前的總花費與專案進度。
5. 若無跨越門檻且無其他事項，回覆 `HEARTBEAT_OK`。

# 資安審計與掃描 (CISO)
每次收到 Heartbeat 時，請執行以下檢查：
1. 確認工作區的 `.env` 檔案（包含 GitHub Token 與所有 API Key）絕對沒有被加入 Git 版本控制。
2. 確認 `.gitignore` 的阻擋規則有效運作中。
3. **[Zero Trust 網路控管]**：確保 Mac 本機的 Tailscale 服務預設處於「斷線 (Down)」狀態。未經 Deede 於 Telegram 明確授權前，嚴禁將其開啟 (Up)。