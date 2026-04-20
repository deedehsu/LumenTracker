
# LumenTracker 瀏覽器自動化技能

import json
import sys
import re
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

# 白名單 URL 列表
WHITELISTED_DOMAINS = [
    r"^https?://etherscan\.io/",
    r"^https?://tronscan\.org/",
    r"^https?://www\.judicial\.gov\.tw/",
    r"^https?://judgment\.judicial\.gov\.tw/",
]

def validate_url(url):
    """驗證 URL 是否有效並在白名單中。"""
    if not url or not isinstance(url, str):
        return False, "URL is required and must be a string."
    if not re.match(r"^https?://[^\s/$.?#].[^\s]*$", url):
        return False, "Invalid URL format."
    for pattern in WHITELISTED_DOMAINS:
        if re.match(pattern, url):
            return True, None
    return False, f"URL '{url}' is not whitelisted for automated access."

def validate_selector(selector):
    """驗證 CSS 選擇器是否為字串。"""
    if not selector or not isinstance(selector, str):
        return False, "Selector is required and must be a string."
    return True, None

def extract_tw_judgments(page, keyword, max_results=10):
    """
    專門用於從台灣司法院裁判書系統擷取結構化資料的函數。
    注意：這部分邏輯與特定網站結構高度耦合。
    """
    target_url = "https://judgment.judicial.gov.tw/FJUD/default.aspx"
    results = []

    try:
        # 1. 導航至首頁
        page.goto(target_url, timeout=60000)

        # 2. 定位輸入框並輸入關鍵字
        page.locator("#txtKW").fill(keyword)

        # 3. 點擊「送出查詢」按鈕並等待跳轉
        with page.expect_navigation(timeout=60000):
            page.locator("#btnSimpleQry").click()

        # 4. 等待 iframe 出現並切換焦點
        frame_element = page.wait_for_selector("iframe[name='iframe-data']", timeout=30000)
        frame = frame_element.content_frame()
        
        if not frame:
             return {"status": "error", "message": "找不到搜尋結果框架 (iframe)。"}

        # 5. 等待並擷取判決連結
        try:
            frame.wait_for_selector("a[href*='data.aspx']", timeout=15000)
            judgment_links = frame.locator("a[href*='data.aspx']").all()
            limit = min(len(judgment_links), max_results)
            
            for i in range(limit):
                link_element = judgment_links[i]
                title = link_element.inner_text().strip()
                href = link_element.get_attribute("href")
                full_url = f"https://judgment.judicial.gov.tw/FJUD/{href}"
                
                date_str = ""
                reason_str = ""
                
                try:
                    parent_row = link_element.locator("xpath=ancestor::tr").first
                    if parent_row:
                        row_text = parent_row.inner_text()
                        parts = [p.strip() for p in row_text.split('\t') if p.strip()]
                        if len(parts) >= 4:
                            date_str = parts[2]
                            reason_str = parts[3]
                except Exception:
                    pass # 忽略單筆額外資訊解析錯誤

                results.append({
                    "title": title,
                    "date": date_str,
                    "reason": reason_str,
                    "url": full_url
                })

        except PlaywrightTimeoutError:
            return {"status": "success", "data": [], "message": "查無結果"}

        return {
            "status": "success",
            "action": "search_judgments",
            "keyword": keyword,
            "count": len(results),
            "data": results
        }

    except Exception as e:
        return {"status": "error", "message": f"擷取判決書資料失敗: {str(e)}"}


def run_browser_automation(action, url=None, selector=None, input_data=None):
    """
    執行瀏覽器自動化任務的主入口。
    """
    # 對於非特定網站的通用操作，驗證 URL
    if action in ["fetch_text", "screenshot"]:
        is_valid_url, url_error = validate_url(url)
        if not is_valid_url:
            return json.dumps({"status": "error", "message": url_error}, ensure_ascii=False)
        
        is_valid_selector, selector_error = validate_selector(selector)
        if not is_valid_selector:
            return json.dumps({"status": "error", "message": selector_error}, ensure_ascii=False)

    # 針對特定的擷取任務，驗證關鍵字
    elif action == "search_judgments":
        if not input_data or 'keyword' not in input_data:
             return json.dumps({"status": "error", "message": "Action 'search_judgments' requires 'keyword' in input_data."}, ensure_ascii=False)

    result = {"status": "error", "message": "Unknown error during automation."}

    try:
        with sync_playwright() as p:
            # 啟動無頭瀏覽器，加入 User-Agent 避免被擋
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
            page = context.new_page()
            
            try:
                # 處理通用動作
                if action == "fetch_text":
                    page.goto(url, timeout=30000)
                    element = page.locator(selector)
                    text_content = element.inner_text()
                    result = {"status": "success", "action": action, "url": url, "selector": selector, "data": text_content}
                
                elif action == "screenshot":
                    page.goto(url, timeout=30000)
                    screenshot_path = f"screenshot_{page.title().replace(' ', '_')}.png"
                    page.screenshot(path=screenshot_path)
                    result = {"status": "success", "action": action, "url": url, "selector": selector, "image_path": screenshot_path, "message": "Screenshot simulated and saved."}

                # 處理特定網站擷取任務
                elif action == "search_judgments":
                    keyword = input_data['keyword']
                    max_res = input_data.get('max_results', 10)
                    # 呼叫專門的擷取邏輯，並直接將其結果作為返回的字典
                    extracted_data = extract_tw_judgments(page, keyword, max_res)
                    result = extracted_data

                else:
                    result = {"status": "error", "message": f"Unsupported action: {action}"}

            except PlaywrightTimeoutError:
                result = {"status": "error", "message": f"操作超時 (URL: {url if url else 'N/A'})."}
            except Exception as e:
                result = {"status": "error", "message": f"網頁互動失敗: {str(e)}"}
            finally:
                browser.close()

    except Exception as e:
        result = {"status": "error", "message": f"Playwright 啟動失敗: {str(e)}"}

    return json.dumps(result, ensure_ascii=False)


if __name__ == '__main__':
    if len(sys.argv) > 1:
        try:
            input_json = sys.argv[1]
            args = json.loads(input_json)
            output = run_browser_automation(**args)
            print(output)
        except Exception as e:
            print(json.dumps({"status": "error", "message": str(e)}, ensure_ascii=False))
    else:
        # 如果沒有輸入參數，則執行一個預設的自我測試 (搜尋詐欺 虛擬貨幣)
        print("沒有提供參數。執行預設測試：搜尋司法院裁判書系統...")
        test_args = {
            "action": "search_judgments",
            "input_data": {"keyword": "詐欺 虛擬貨幣", "max_results": 3}
        }
        output = run_browser_automation(**test_args)
        print(output)
