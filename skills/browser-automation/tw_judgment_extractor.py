
import asyncio
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError
import json
import csv
import sys
import os
import argparse
import random
from datetime import datetime

async def fetch_judgment_content(context, url):
    """
    導航至單一判決書頁面並擷取全文內容。
    """
    print(f"    -> 正在擷取全文: {url}")
    content_text = ""
    try:
        # 開啟一個新的分頁來抓全文，避免干擾列表頁
        page = await context.new_page()
        await page.goto(url, timeout=30000)
        
        # 司法院全文頁面的主文通常包在具有 class="htmlformat" 的 div 中
        # 如果找不到，就抓取整個 body 的 innerText 作為備案
        try:
            content_element = await page.wait_for_selector("div.htmlformat", timeout=10000)
            content_text = await content_element.inner_text()
        except PlaywrightTimeoutError:
            print("      (找不到 .htmlformat 標籤，嘗試抓取整個頁面內文...)")
            content_text = await page.inner_text("body")
            
        # 簡單清理：移除多餘的空白列
        content_text = "\n".join([line for line in content_text.splitlines() if line.strip()])
        
    except Exception as e:
        print(f"    ❌ 擷取全文失敗: {e}")
        content_text = f"[Error fetching content: {str(e)}]"
    finally:
        if 'page' in locals() and not page.is_closed():
            await page.close()
            
    return content_text

async def search_and_extract_judgments(keyword, max_results=10, output_format="json", output_dir="results", fetch_full_text=False):
    """
    使用 Playwright 在司法院裁判書系統搜尋並擷取結構化結果。
    """
    target_url = "https://judgment.judicial.gov.tw/FJUD/default.aspx"
    print(f"[{datetime.now().strftime('%H:%M:%S')}] 啟動自動化搜尋：關鍵字 '{keyword}' (上限 {max_results} 筆)...")
    if fetch_full_text:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] ⚠️ 已啟用全文擷取模式 (執行時間將顯著增加)")

    results = []

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
            page = await context.new_page()

            # 1. 導航至首頁
            print(f"[{datetime.now().strftime('%H:%M:%S')}] 導航至司法院裁判書系統首頁...")
            await page.goto(target_url, timeout=60000)

            # 2. 填寫關鍵字
            print(f"[{datetime.now().strftime('%H:%M:%S')}] 填寫關鍵字: {keyword}")
            await page.locator("#txtKW").fill(keyword)

            # 3. 送出查詢
            print(f"[{datetime.now().strftime('%H:%M:%S')}] 點擊送出查詢按鈕...")
            async with page.expect_navigation(timeout=60000):
                await page.locator("#btnSimpleQry").click()

            print(f"[{datetime.now().strftime('%H:%M:%S')}] 等待搜尋結果框架 (iframe) 載入...")
            
            # 4. 切換 iframe
            frame_element = await page.wait_for_selector("iframe[name='iframe-data']", timeout=30000)
            frame = await frame_element.content_frame()
            
            if not frame:
                return {"status": "error", "message": "找不到搜尋結果框架 (iframe)。"}

            print(f"[{datetime.now().strftime('%H:%M:%S')}] 成功進入結果框架，開始解析資料...")
            
            # 5. 擷取資料列表
            try:
                await frame.wait_for_selector("a[href*='data.aspx']", timeout=15000)
                judgment_links = await frame.locator("a[href*='data.aspx']").all()
                
                print(f"[{datetime.now().strftime('%H:%M:%S')}] 第一頁共找到 {len(judgment_links)} 筆判決，準備擷取前 {min(len(judgment_links), max_results)} 筆。")
                
                limit = min(len(judgment_links), max_results)
                
                for i in range(limit):
                    link_element = judgment_links[i]
                    title = (await link_element.inner_text()).strip()
                    href = await link_element.get_attribute("href")
                    full_url = f"https://judgment.judicial.gov.tw/FJUD/{href}"
                    
                    date_str = ""
                    reason_str = ""
                    full_content = ""
                    
                    try:
                        parent_row = link_element.locator("xpath=ancestor::tr").first
                        if parent_row:
                            row_text = await parent_row.inner_text()
                            parts = [p.strip() for p in row_text.split('\t') if p.strip()]
                            if len(parts) >= 4:
                                date_str = parts[2]
                                reason_str = parts[3]
                    except Exception as parse_e:
                        print(f"  (提取列表額外資訊失敗: {parse_e})")

                    print(f"  [{i+1}/{limit}] 處理中: {title}")
                    
                    # 6. Deep Scraping: 擷取全文 (如果啟用)
                    if fetch_full_text:
                        full_content = await fetch_judgment_content(context, full_url)
                        # 加入隨機延遲 (1~3秒)，避免被判定為惡意爬蟲
                        delay = random.uniform(1.0, 3.0)
                        await asyncio.sleep(delay)

                    results.append({
                        "title": title,
                        "date": date_str,
                        "reason": reason_str,
                        "url": full_url,
                        "content": full_content if fetch_full_text else "[未啟用全文擷取]"
                    })

            except PlaywrightTimeoutError:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] 查無結果或頁面超時。")
                return {"status": "success", "data": [], "message": "查無結果"}

            # --- 7. 資料匯出模組 ---
            output_data = {
                "status": "success",
                "keyword": keyword,
                "timestamp": datetime.now().isoformat(),
                "count": len(results),
                "data": results
            }

            if len(results) > 0:
                os.makedirs(output_dir, exist_ok=True)
                timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
                safe_keyword = "".join([c if c.isalnum() else "_" for c in keyword])
                # 檔名加上標示，區分是否有全文
                mode_str = "FULL" if fetch_full_text else "LIST"
                base_filename = f"judgments_{safe_keyword}_{mode_str}_{timestamp_str}"
                
                if output_format.lower() in ["json", "both"]:
                    json_path = os.path.join(output_dir, f"{base_filename}.json")
                    with open(json_path, 'w', encoding='utf-8') as f:
                        json.dump(output_data, f, ensure_ascii=False, indent=2)
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] ✅ 成功儲存 JSON 檔案: {json_path}")
                
                if output_format.lower() in ["csv", "both"]:
                    csv_path = os.path.join(output_dir, f"{base_filename}.csv")
                    with open(csv_path, 'w', encoding='utf-8-sig', newline='') as f:
                        writer = csv.writer(f)
                        # 寫入標頭 (新增 Content)
                        writer.writerow(["Title", "Date", "Reason", "URL", "Content"])
                        for row in results:
                            # 如果內容過長，在 CSV 中可能會難以閱讀，但為了資料完整性仍需匯出
                            writer.writerow([row['title'], row['date'], row['reason'], row['url'], row['content']])
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] ✅ 成功儲存 CSV 檔案: {csv_path}")

            return output_data

    except Exception as e:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] ❌ 自動化搜尋過程中發生致命錯誤: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        if 'browser' in locals():
            await browser.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="司法院裁判書系統自動擷取工具")
    parser.add_argument("keyword", type=str, help="要搜尋的關鍵字 (例如：'詐欺 虛擬貨幣')")
    parser.add_argument("-m", "--max_results", type=int, default=10, help="最大擷取筆數 (預設: 10)")
    parser.add_argument("-f", "--format", type=str, choices=["json", "csv", "both"], default="json", help="輸出檔案格式 (json, csv, both. 預設: json)")
    parser.add_argument("-o", "--output_dir", type=str, default="results", help="儲存結果的目錄 (預設: results)")
    parser.add_argument("--full", action="store_true", help="啟用全文擷取模式 (警告：執行時間會顯著增加)") # 新增 --full 參數

    args = parser.parse_args()

    print(f"--- 啟動情報擷取工具 (CLI 模式) ---")
    output = asyncio.run(search_and_extract_judgments(
        keyword=args.keyword,
        max_results=args.max_results,
        output_format=args.format,
        output_dir=args.output_dir,
        fetch_full_text=args.full # 傳遞 full 參數
    ))
    
    if output.get("status") == "success":
         print(f"--- 擷取完成。共獲取 {output.get('count', 0)} 筆資料 ---")
    else:
         print(f"--- 擷取失敗 ---")
