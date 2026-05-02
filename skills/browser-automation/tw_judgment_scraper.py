import os
import sys
# [PyInstaller Fix] Force Playwright to use the system-wide browser cache instead of the temporary _MEI folder
os.environ["PLAYWRIGHT_BROWSERS_PATH"] = "0"


import asyncio
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError
import json
import sys
import os

async def scout_judgment_system():
    """
    探路腳本：測試連接司法院裁判書系統並擷取首頁資訊
    """
    target_url = "https://judgment.judicial.gov.tw/FJUD/default.aspx"
    result = {"status": "error", "message": "Unknown error."}

    print(f"開始探路：嘗試連接 {target_url}...")

    try:
        async with async_playwright() as p:
            # 啟動 Chromium，為了除錯，暫時不使用無頭模式 (headless=False)，但在實際背景執行時需改為 True
            # 注意：在 OpenClaw 的背景環境中，通常必須使用無頭模式
                    
            launch_args = {"headless": True}
            if getattr(sys, 'frozen', False):
                import glob
                local_app_data = os.environ.get('LOCALAPPDATA', '')
                if local_app_data:
                    # Find chromium headless shell
                    search_pattern = os.path.join(local_app_data, "ms-playwright", "chromium_headless_shell-*", "chrome-headless-shell-win64", "chrome-headless-shell.exe")
                    found_browsers = glob.glob(search_pattern)
                    if not found_browsers:
                        search_pattern = os.path.join(local_app_data, "ms-playwright", "chromium-*", "chrome-win", "chrome.exe")
                        found_browsers = glob.glob(search_pattern)
                    if found_browsers:
                        launch_args["executable_path"] = found_browsers[0]
                    else:
                        print("WARNING: Could not find Playwright browsers in LOCALAPPDATA")
                        
            browser = await p.chromium.launch(**launch_args) 
            page = await browser.new_page()
            
            try:
                # 導航至目標網頁，設定較長的超時時間 (60秒) 以應對可能較慢的政府網站
                print("正在導航...")
                await page.goto(target_url, timeout=60000)
                print("導航完成，等待頁面載入...")
                
                # 等待網頁的特定元素出現，以確認頁面已基本載入完成
                # 假設裁判書系統有一個搜尋按鈕或特定的輸入框，這裡先簡單等待 body 載入
                await page.wait_for_selector("body", timeout=10000)
                
                page_title = await page.title()
                print(f"成功載入頁面，標題為: '{page_title}'")
                
                # 截圖以供確認
                screenshot_path = "judgment_system_scout.png"
                await page.screenshot(path=screenshot_path)
                print(f"已儲存首頁截圖至: {screenshot_path}")

                # 嘗試尋找主要的全文檢索輸入框 (這需要實際分析網頁 DOM，這裡先做個大膽的猜測或簡單的測試)
                # 透過檢查網頁原始碼，常見的搜尋框 ID 可能是 txtKW 或是 kw
                # 這裡我們先嘗試擷取整個 body 的一部分文字來確認內容
                body_text = await page.inner_text("body")
                preview_text = body_text[:200].replace('\n', ' ') # 取前 200 字預覽

                result = {
                    "status": "success",
                    "message": "Successfully connected to the judgment system.",
                    "title": page_title,
                    "preview": preview_text,
                    "screenshot": screenshot_path
                }

            except PlaywrightTimeoutError:
                result = {"status": "error", "message": f"連線超時：無法在 60 秒內載入 {target_url}"}
            except Exception as e:
                result = {"status": "error", "message": f"頁面互動失敗: {str(e)}"}
            finally:
                await browser.close()

    except Exception as e:
        result = {"status": "error", "message": f"Playwright 啟動失敗: {str(e)}"}

    return result

if __name__ == "__main__":
    # 使用 asyncio 執行異步主函數
    output = asyncio.run(scout_judgment_system())
    print("\n--- 探路結果 ---")
    print(json.dumps(output, ensure_ascii=False, indent=2))
