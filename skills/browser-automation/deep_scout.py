import sys

import asyncio
from playwright.async_api import async_playwright

async def deep_scout_judgment():
    target_url = "https://judgment.judicial.gov.tw/FJUD/default.aspx"
    keyword = "區塊鏈"

    try:
        async with async_playwright() as p:
                    
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
            context = await browser.new_context()
            page = await context.new_page()
            
            # --- 監聽網路請求 ---
            print("開始監聽網路請求...")
            api_endpoints_found = []
            
            async def handle_response(response):
                # 我們關心的是可能包含判決資料的請求 (例如 JSON 或特定的 aspx 頁面)
                # 排除圖片、CSS、JS 等靜態資源
                if response.request.resource_type in ["xhr", "fetch", "document"]:
                    url = response.url
                    # 過濾掉 Google Analytics 或其他不相干的請求
                    if "judicial.gov.tw" in url and "google" not in url:
                        content_type = response.headers.get('content-type', '')
                        print(f"[網路回應] 狀態: {response.status}, 類型: {content_type}, URL: {url}")
                        
                        # 如果是 JSON，這通常是我們的黃金目標！
                        if "application/json" in content_type:
                            print(f"  --> 發現 JSON API 端點: {url}")
                            api_endpoints_found.append(url)
                            # 可以嘗試印出部分 JSON 內容
                            try:
                                json_data = await response.json()
                                print(f"  --> JSON 內容預覽: {str(json_data)[:200]}")
                            except Exception as e:
                                print(f"  --> 無法解析 JSON: {e}")

            page.on("response", handle_response)
            # --------------------

            print(f"導航至 {target_url} ...")
            await page.goto(target_url, timeout=60000)
            
            print(f"輸入關鍵字: {keyword}")
            await page.locator("#txtKW").fill(keyword)
            
            print("點擊送出查詢...")
            async with page.expect_navigation(timeout=60000):
                await page.locator("#btnSimpleQry").click()

            print("等待網路請求穩定...")
            await page.wait_for_load_state('networkidle')
            
            print("\n--- 檢查 iframe ---")
            frames = page.frames
            print(f"頁面上共有 {len(frames)} 個 frame(s)")
            for i, frame in enumerate(frames):
                print(f"Frame [{i}]: URL = {frame.url}, Name = {frame.name}")
                # 嘗試在 iframe 中尋找包含「號」的連結
                try:
                    links = await frame.locator("a:has-text('號')").all()
                    if links:
                         print(f"  --> 在 Frame [{i}] 中找到 {len(links)} 個可能包含判決案號的連結！")
                         # 印出第一個連結的文字和 URL
                         text = await links[0].inner_text()
                         href = await links[0].get_attribute("href")
                         print(f"  --> 範例: {text} -> {href}")
                except Exception as e:
                     print(f"  --> 無法檢查 Frame [{i}]: {e}")

            print("\n探勘結束。")
            
    except Exception as e:
        print(f"探勘失敗: {e}")
    finally:
        if 'browser' in locals():
            await browser.close()

if __name__ == "__main__":
    asyncio.run(deep_scout_judgment())
