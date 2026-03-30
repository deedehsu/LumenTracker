# HEARTBEAT.md

# 專案會計與成本監控 (Accountant)
每次收到 Heartbeat 時，請執行以下檢查：
1. 呼叫 `session_status` 工具，取得當前專案的累積花費 (Cost, 美金)。
2. 將美金轉換為新台幣 (TWD)，匯率暫估為 1 USD = 32 TWD。
3. 讀取 `memory/budget-state.json`（若無則建立），確認上次已通知的「100元級距」。
4. 若當前累積金額（TWD）已經跨越新的 100 元門檻（例如達到 100, 200, 300...），請主動發送訊息給 Deede，匯報目前的總花費與專案進度。
5. 若無跨越門檻且無其他事項，回覆 `HEARTBEAT_OK`。
