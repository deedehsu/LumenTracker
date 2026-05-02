
import asyncio
from playwright.async_api import async_playwright
import sys

async def fetch_html_structure():
    """
    抓取司法院裁判書系統首頁的 HTML 原始碼，以便分析輸入框和按鈕的結構。
    """
    target_url = "https://judgment.judicial.gov.tw/FJUD/default.aspx"
    html_content = ""

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto(target_url, timeout=60000)
            await page.wait_for_load_state('networkidle') # 等待網路靜止
            
            # 獲取整個 body 的 HTML
            html_content = await page.content()

            # 將 HTML 儲存到本地檔案，方便後續分析
            with open("judgment_system_source.html", "w", encoding="utf-8") as f:
                f.write(html_content)
                
            print("HTML 原始碼已成功儲存至 judgment_system_source.html")
            
    except Exception as e:
        print(f"抓取 HTML 失敗: {e}")
    finally:
        if 'browser' in locals():
            await browser.close()

if __name__ == "__main__":
    asyncio.run(fetch_html_structure())
