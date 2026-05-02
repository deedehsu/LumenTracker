import sys

import asyncio
from playwright.async_api import async_playwright

async def fetch_result_html():
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
            page = await browser.new_page()
            await page.goto(target_url, timeout=60000)
            
            await page.locator("#txtKW").fill(keyword)
            
            async with page.expect_navigation(timeout=60000):
                await page.locator("#btnSimpleQry").click()

            await page.wait_for_load_state('networkidle')
            
            # 將搜尋結果頁面的 HTML 儲存下來
            html_content = await page.content()
            with open("search_result_source.html", "w", encoding="utf-8") as f:
                f.write(html_content)
                
            print("搜尋結果 HTML 已成功儲存至 search_result_source.html")
            
    except Exception as e:
        print(f"失敗: {e}")
    finally:
        if 'browser' in locals():
            await browser.close()

if __name__ == "__main__":
    asyncio.run(fetch_result_html())
