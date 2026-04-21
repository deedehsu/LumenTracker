
import asyncio
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError
import json
import csv
import sys
import os
import argparse
import random
from datetime import datetime

async def fetch_judgment_content(context, url, logger=print):
    """
    導航至單一判決書頁面並擷取全文內容。
    """
    logger(f"    -> 正在擷取全文: {url}")
    content_text = ""
    try:
        page = await context.new_page()
        await page.goto(url, timeout=30000)
        
        try:
            content_element = await page.wait_for_selector("div.htmlformat", timeout=10000)
            content_text = await content_element.inner_text()
        except PlaywrightTimeoutError:
            logger("      (找不到 .htmlformat 標籤，嘗試抓取整個頁面內文...)")
            content_text = await page.inner_text("body")
            
        content_text = "\n".join([line for line in content_text.splitlines() if line.strip()])
        
    except Exception as e:
        logger(f"    ❌ 擷取全文失敗: {e}")
        content_text = f"[Error fetching content: {str(e)}]"
    finally:
        if 'page' in locals() and not page.is_closed():
            await page.close()
            
    return content_text

async def search_and_extract_judgments(keyword, max_results=10, output_format="json", output_dir="results", fetch_full_text=False, logger=print, history=None):
    """
    使用 Playwright 在司法院裁判書系統搜尋並擷取結構化結果。
    加入動態遞補機制：若遇到已下載的案件會自動跳過，直到抓滿指定數量的新案件。
    """
    target_url = "https://judgment.judicial.gov.tw/FJUD/default.aspx"
    logger(f"啟動自動化搜尋：關鍵字 '{keyword}' (目標獲取 {max_results} 筆新資料)...")
    if fetch_full_text:
        logger(f"⚠️ 已啟用深度擷取模式 (執行時間將顯著增加)")

    results = []
    valid_count = 0 # 記錄真正成功處理(或下載)的新資料筆數
    
    if history is None:
        history = []

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
            page = await context.new_page()

            logger("導航至司法院裁判書系統首頁...")
            await page.goto(target_url, timeout=60000)

            logger(f"填寫關鍵字: {keyword}")
            await page.locator("#txtKW").fill(keyword)

            logger("點擊送出查詢按鈕...")
            async with page.expect_navigation(timeout=60000):
                await page.locator("#btnSimpleQry").click()

            logger("等待搜尋結果框架 (iframe) 載入...")
            
            frame_element = await page.wait_for_selector("iframe[name='iframe-data']", timeout=30000)
            frame = await frame_element.content_frame()
            
            if not frame:
                return {"status": "error", "message": "找不到搜尋結果框架 (iframe)。"}

            logger("成功進入結果框架，開始解析資料...")
            
            current_page_num = 1
            
            # 使用 while 迴圈處理跨頁抓取，直到 valid_count 達到目標
            while valid_count < max_results:
                try:
                    await frame.wait_for_selector("a[href*='data.aspx']", timeout=15000)
                    judgment_links = await frame.locator("a[href*='data.aspx']").all()
                    
                    logger(f"--- 正在處理第 {current_page_num} 頁 (本頁有 {len(judgment_links)} 筆) ---")
                    
                    for link_element in judgment_links:
                        if valid_count >= max_results:
                            break # 如果已經達到目標筆數，跳出迴圈
                            
                        title = (await link_element.inner_text()).strip()
                        href = await link_element.get_attribute("href")
                        full_url = f"https://judgment.judicial.gov.tw/FJUD/{href}"
                        
                        date_str = ""
                        reason_str = ""
                        full_content = ""
                        local_file_path = ""
                        
                        try:
                            parent_row = link_element.locator("xpath=ancestor::tr").first
                            if parent_row:
                                row_text = await parent_row.inner_text()
                                parts = [p.strip() for p in row_text.split('\t') if p.strip()]
                                if len(parts) >= 4:
                                    date_str = parts[2]
                                    reason_str = parts[3]
                        except Exception as parse_e:
                            pass # 忽略單筆額外資訊解析錯誤

                        # --- 防重複檢查 (Deduplication) ---
                        is_duplicate = False
                        if history is not None and fetch_full_text:
                            if full_url in history:
                                is_duplicate = True
                                logger(f"  ⏩ [跳過] {title} (發現本地紀錄)")
                                # 如果是重複的，我們不把它算進 valid_count，也不加入 results 中
                                continue 
                        
                        # 到這裡表示這是一筆我們需要處理的「新資料」
                        logger(f"  ⬇️ [下載] 處理中: {title} ({valid_count + 1}/{max_results})")
                        
                        # 6. Deep Scraping: 擷取全文
                        if fetch_full_text:
                            full_content = await fetch_judgment_content(context, full_url, logger=logger)
                            
                            if full_content and not full_content.startswith("[Error"):
                                safe_title = "".join([c if c.isalnum() or c in " _-" else "_" for c in title])
                                txt_filename = f"{safe_title}.txt"
                                txt_filepath = os.path.join(output_dir, txt_filename)
                                
                                try:
                                    # 確保 output_dir 存在
                                    os.makedirs(output_dir, exist_ok=True)
                                    with open(txt_filepath, 'w', encoding='utf-8') as f:
                                        f.write(f"標題: {title}\n")
                                        f.write(f"日期: {date_str}\n")
                                        f.write(f"案由: {reason_str}\n")
                                        f.write(f"網址: {full_url}\n")
                                        f.write("-" * 40 + "\n\n")
                                        f.write(full_content)
                                    local_file_path = txt_filename
                                    logger(f"    📄 判決書已存為: {txt_filename}")
                                except Exception as save_e:
                                    logger(f"    ❌ 儲存 TXT 失敗: {save_e}")
                            
                            delay = random.uniform(1.0, 3.0)
                            await asyncio.sleep(delay)
                            
                            if history is not None:
                                history.append(full_url)

                        results.append({
                            "title": title,
                            "date": date_str,
                            "reason": reason_str,
                            "url": full_url,
                            "local_file": local_file_path if fetch_full_text else "[未啟用全文擷取]",
                            "content": full_content if fetch_full_text else "[未啟用全文擷取]"
                        })
                        
                        valid_count += 1 # 成功處理一筆新資料，計數器加 1

                    # 如果當前頁面的資料都處理完了，但還沒達到目標筆數，嘗試翻到下一頁
                    if valid_count < max_results:
                        # 尋找「下一頁」按鈕 (通常是個 'a' 標籤且文字為 '下一頁'，或是特定的 class)
                        try:
                            # 司法院的翻頁按鈕 id 通常是 hlNext
                            next_page_btn = frame.locator("#hlNext")
                            if await next_page_btn.count() > 0 and await next_page_btn.is_visible():
                                logger(f"--- 準備翻頁，前往第 {current_page_num + 1} 頁 ---")
                                await next_page_btn.click()
                                # 等待新頁面載入 (這裡可能需要依賴網路請求穩定)
                                await page.wait_for_load_state('networkidle')
                                # 重新抓取 frame
                                frame_element = await page.wait_for_selector("iframe[name='iframe-data']", timeout=30000)
                                frame = await frame_element.content_frame()
                                current_page_num += 1
                            else:
                                logger("已到達最後一頁，無更多結果可擷取。")
                                break # 沒有下一頁了，跳出大迴圈
                        except Exception as e:
                            logger(f"尋找或點擊下一頁時發生錯誤: {e}")
                            break # 翻頁失敗，跳出大迴圈
                            
                except PlaywrightTimeoutError:
                    logger("查無結果或頁面超時。")
                    break

            # --- 7. 資料匯出模組 ---
            output_data = {
                "status": "success",
                "keyword": keyword,
                "timestamp": datetime.now().isoformat(),
                "count": len(results), # 這裡的 results 只包含新擷取的資料
                "data": results
            }

            if len(results) > 0:
                os.makedirs(output_dir, exist_ok=True)
                timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
                safe_keyword = "".join([c if c.isalnum() else "_" for c in keyword])
                mode_str = "FULL" if fetch_full_text else "LIST"
                base_filename = f"judgments_{safe_keyword}_{mode_str}_{timestamp_str}"
                
                # 依然保留每次獨立的 JSON 檔案作為完整資料備份
                if output_format.lower() in ["json", "both"]:
                    json_path = os.path.join(output_dir, f"{base_filename}.json")
                    with open(json_path, 'w', encoding='utf-8') as f:
                        json.dump(output_data, f, ensure_ascii=False, indent=2)
                    logger(f"✅ 成功儲存 JSON 備份檔: {json_path}")
                
                # 修改 CSV 輸出為單一總表附加模式
                if output_format.lower() in ["csv", "both"]:
                    csv_master_path = os.path.join(output_dir, "Lumen_Judgment_Master_Index.csv")
                    file_exists = os.path.isfile(csv_master_path)
                    
                    # 使用 'a' (append) 模式開啟，如果檔案不存在會自動建立
                    with open(csv_master_path, 'a', encoding='utf-8-sig', newline='') as f:
                        writer = csv.writer(f)
                        # 如果檔案是新建的，才寫入標題列
                        if not file_exists:
                            writer.writerow(["Title", "Date", "Reason", "URL", "Local_File", "Search_Keyword", "Timestamp"])
                        
                        # 寫入資料列，並加入搜尋關鍵字和時間戳記以便追溯
                        for row in results:
                            writer.writerow([
                                row['title'], 
                                row['date'], 
                                row['reason'], 
                                row['url'], 
                                row.get('local_file', ''),
                                keyword,
                                timestamp_str
                            ])
                    logger(f"✅ 成功將 {len(results)} 筆目錄資料附加至總表: {csv_master_path}")

            output_data['history'] = history
            return output_data

    except Exception as e:
        logger(f"❌ 自動化搜尋過程中發生致命錯誤: {e}")
        return {"status": "error", "message": str(e), "history": history}
    finally:
        if 'browser' in locals():
            await browser.close()

if __name__ == "__main__":
    def console_logger(msg):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

    parser = argparse.ArgumentParser(description="司法院裁判書系統自動擷取工具")
    parser.add_argument("keyword", type=str, help="要搜尋的關鍵字 (例如：'詐欺 虛擬貨幣')")
    parser.add_argument("-m", "--max_results", type=int, default=10, help="最大擷取筆數 (預設: 10)")
    parser.add_argument("-f", "--format", type=str, choices=["json", "csv", "both"], default="json", help="輸出檔案格式 (json, csv, both. 預設: json)")
    parser.add_argument("-o", "--output_dir", type=str, default="results", help="儲存結果的目錄 (預設: results)")
    parser.add_argument("--full", action="store_true", help="啟用全文擷取模式 (警告：執行時間會顯著增加)") 

    args = parser.parse_args()

    console_logger("--- 啟動情報擷取工具 (CLI 模式) ---")
    
    output = asyncio.run(search_and_extract_judgments(
        keyword=args.keyword,
        max_results=args.max_results,
        output_format=args.format,
        output_dir=args.output_dir,
        fetch_full_text=args.full,
        logger=console_logger,
        history=None 
    ))
    
    if output.get("status") == "success":
         console_logger(f"--- 擷取完成。共獲取 {output.get('count', 0)} 筆資料 ---")
    else:
         console_logger(f"--- 擷取失敗 ---")
