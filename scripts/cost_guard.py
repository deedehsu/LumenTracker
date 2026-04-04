import os
import re
from datetime import datetime

# 配置路徑 (建議使用相對路徑轉絕對路徑)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HEARTBEAT_PATH = os.path.join(BASE_DIR, "HEARTBEAT.md")

def check_pro_usage():
    if not os.path.exists(HEARTBEAT_PATH):
        print(f"Error: {HEARTBEAT_PATH} not found.")
        return

    today_str = datetime.now().strftime("%Y-%m-%d")
    pro_count = 0
    
    with open(HEARTBEAT_PATH, "r", encoding="utf-8") as f:
        content = f.readlines()

    # 統計當日 Pro 使用次數
    for line in content:
        if today_str in line and ("gemini-3.1-pro" in line.lower() or "3.1-pro" in line.lower()):
            pro_count += 1

    print(f"Today's Gemini 3.1 Pro Usage: {pro_count}")

    # 檢查是否超過門檻 (240次)
    if pro_count >= 240:
        alert_msg = f"⚠️ !!! BUDGET ALERT: Gemini 3.1 Pro DAILY LIMIT REACHED ({pro_count}/240) !!!\n"
        if alert_msg not in content[0]: # 避免重複寫入
            content.insert(0, alert_msg)
            with open(HEARTBEAT_PATH, "w", encoding="utf-8") as f:
                f.writelines(content)
            print("Alert written to HEARTBEAT.md")

if __name__ == "__main__":
    check_pro_usage()