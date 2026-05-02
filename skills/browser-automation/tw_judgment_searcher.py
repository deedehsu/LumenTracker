import os
import sys
# [PyInstaller Fix] Force Playwright to use the system-wide browser cache instead of the temporary _MEI folder
os.environ["PLAYWRIGHT_BROWSERS_PATH"] = "0"


import asyncio
from playwright.async_api import async_playwright
import json

async def search_tw_judgment(keyword):
    """
    使用 Playwright 在司法院裁判書系統進行自動搜尋。
    :param keyword: 要搜尋的關鍵字。
    """
    target_url = "https://judgment.judicial.gov.tw/FJUD/default.aspx"
    print(f"正在啟動自動化搜尋：關鍵字 '{keyword}'...")

    try:
        async with async_playwright() as p:
            # 啟動無頭瀏覽器 (背景執行)
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            # 1. 導航至首頁
            print("導航至司法院裁判書系統首頁...")
            await page.goto(target_url, timeout=60000)

            # 2. 定位輸入框並輸入關鍵字
            # 我們從原始碼得知輸入框 ID 是 txtKW
            search_input = page.locator("#txtKW")
            print(f"輸入關鍵字: {keyword}")
            await search_input.fill(keyword)

            # 3. 定位「送出查詢」按鈕並點擊
            # 我們從原始碼得知按鈕 ID 是 btnSimpleQry
            search_button = page.locator("#btnSimpleQry")
            print("點擊送出查詢按鈕...")
            
            # 點擊後，網頁會跳轉到結果頁面，我們必須等待跳轉完成
            # 使用 expect_navigation 來確保等待新的頁面載入
            async with page.expect_navigation(timeout=60000):
                await search_button.click()

            print("搜尋結果頁面已載入！")

            # 4. 初步驗證與資料擷取 (Day 3 的前奏)
            # 在結果頁面，我們通常會看到一個包含判決列表的表格
            # 我們先簡單擷取網頁的標題和一部分內容來確認搜尋成功
            
            # 等待主要的內容區域載入 (這裡需要根據實際結果頁面調整，先等 body)
            await page.wait_for_load_state('networkidle')
            
            page_title = await page.title()
            print(f"當前頁面標題: {page_title}")

            # 截圖確認搜尋結果頁面
            screenshot_path = f"search_result_{keyword}.png"
            await page.screenshot(path=screenshot_path)
            print(f"已儲存搜尋結果截圖至: {screenshot_path}")

            # 簡單擷取 body 內文前 500 字，看看是否有搜尋到的案件資訊
            body_text = await page.inner_text("body")
            preview_text = body_text[:500].replace('\n', ' ')

            result = {
                "status": "success",
                "keyword": keyword,
                "title": page_title,
                "preview": preview_text,
                "screenshot": screenshot_path
            }

            return result

    except Exception as e:
        print(f"自動化搜尋過程中發生錯誤: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        if 'browser' in locals():
            await browser.close()

if __name__ == "__main__":
    # 測試搜尋關鍵字 "區塊鏈"
    test_keyword = "區塊鏈"
    output = asyncio.run(search_tw_judgment(test_keyword))
    print("\n--- 自動化搜尋結果 ---")
    print(json.dumps(output, ensure_ascii=False, indent=2))
