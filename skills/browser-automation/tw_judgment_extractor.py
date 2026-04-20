
import asyncio
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError
import json
import csv
import sys
import os
import argparse
from datetime import datetime

async def search_and_extract_judgments(keyword, max_results=10, output_format="json", output_dir="results"):
    """
    使用 Playwright 在司法院裁判書系統搜尋並擷取結構化結果，並儲存為檔案。
    """
    target_url = "https://judgment.judicial.gov.tw/FJUD/default.aspx"
    print(f"[{datetime.now().strftime('%H:%M:%S')}] 啟動自動化搜尋：關鍵字 '{keyword}' (上限 {max_results} 筆)...")

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
            
            # 5. 擷取資料
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
                    
                    try:
                        parent_row = link_element.locator("xpath=ancestor::tr").first
                        if parent_row:
                            row_text = await parent_row.inner_text()
                            parts = [p.strip() for p in row_text.split('\t') if p.strip()]
                            if len(parts) >= 4:
                                date_str = parts[2]
                                reason_str = parts[3]
                    except Exception as parse_e:
                        print(f"  (提取額外資訊失敗: {parse_e})")

                    results.append({
                        "title": title,
                        "date": date_str,
                        "reason": reason_str,
                        "url": full_url
                    })
                    
                    print(f"  [{i+1}/{limit}] 已擷取: {title}")

            except PlaywrightTimeoutError:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] 查無結果或頁面超時。")
                return {"status": "success", "data": [], "message": "查無結果"}

            # --- 6. 資料匯出模組 (Task B2) ---
            output_data = {
                "status": "success",
                "keyword": keyword,
                "timestamp": datetime.now().isoformat(),
                "count": len(results),
                "data": results
            }

            if len(results) > 0:
                # 確保輸出目錄存在
                os.makedirs(output_dir, exist_ok=True)
                
                timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
                # 替換不合法的檔名字元
                safe_keyword = "".join([c if c.isalnum() else "_" for c in keyword])
                base_filename = f"judgments_{safe_keyword}_{timestamp_str}"
                
                if output_format.lower() in ["json", "both"]:
                    json_path = os.path.join(output_dir, f"{base_filename}.json")
                    with open(json_path, 'w', encoding='utf-8') as f:
                        json.dump(output_data, f, ensure_ascii=False, indent=2)
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] ✅ 成功儲存 JSON 檔案: {json_path}")
                
                if output_format.lower() in ["csv", "both"]:
                    csv_path = os.path.join(output_dir, f"{base_filename}.csv")
                    with open(csv_path, 'w', encoding='utf-8', newline='') as f:
                        writer = csv.writer(f)
                        # 寫入標頭
                        writer.writerow(["Title", "Date", "Reason", "URL"])
                        for row in results:
                            writer.writerow([row['title'], row['date'], row['reason'], row['url']])
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

    args = parser.parse_args()

    print(f"--- 啟動情報擷取工具 (CLI 模式) ---")
    output = asyncio.run(search_and_extract_judgments(
        keyword=args.keyword,
        max_results=args.max_results,
        output_format=args.format,
        output_dir=args.output_dir
    ))
    
    if output.get("status") == "success":
         print(f"--- 擷取完成。共獲取 {output.get('count', 0)} 筆資料 ---")
    else:
         print(f"--- 擷取失敗 ---")
