
# LumenTracker 瀏覽器自動化技能

import json
import sys
import re
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

# TODO: 替換為使用者設定的白名單 URL 列表，初期先硬編碼用於測試
# 實際應用中，這個白名單會從 LumenTracker 的配置中動態載入
WHITELISTED_DOMAINS = [
    r"^https?://etherscan\.io/",
    r"^https?://tronscan\.org/",
    r"^https?://www\.judicial\.gov\.tw/",
    r"^https?://judgment\.judicial\.gov\.tw/",
    r"^https?://www\.judicial\.cy\.gov\.tw/",
]

def validate_url(url):
    """驗證 URL 是否有效並在白名單中。"""
    if not url or not isinstance(url, str):
        return False, "URL is required and must be a string."
    
    # 基本 URL 格式驗證
    if not re.match(r"^https?://[^\s/$.?#].[^\s]*$", url):
        return False, "Invalid URL format."

    # 白名單驗證
    for pattern in WHITELISTED_DOMAINS:
        if re.match(pattern, url):
            return True, None
    return False, f"URL '{url}' is not whitelisted for automated access."

def validate_selector(selector):
    """驗證 CSS 選擇器是否為字串。"""
    if not selector or not isinstance(selector, str):
        return False, "Selector is required and must be a string."
    # TODO: 更複雜的選擇器安全驗證，防止 XSS 或惡意選擇器
    return True, None


def run_browser_automation(action, url=None, selector=None, input_data=None):
    """
    執行瀏覽器自動化任務。
    :param action: 要執行的動作 (e.g., 'fetch_text', 'screenshot').
    :param url: 目標網頁 URL。
    :param selector: CSS 選擇器，用於定位網頁元素。
    :param input_data: 表單填寫數據 (字典格式)。
    :return: 任務執行結果。
    """
    # 1. 輸入驗證 (URL 和 Selector)
    is_valid_url, url_error = validate_url(url)
    if not is_valid_url:
        return json.dumps({"status": "error", "message": url_error}, ensure_ascii=False)
    
    if action == "fetch_text" or action == "screenshot": # 這些動作需要選擇器
        is_valid_selector, selector_error = validate_selector(selector)
        if not is_valid_selector:
            return json.dumps({"status": "error", "message": selector_error}, ensure_ascii=False)

    print(f"Executing browser automation action: {action}")
    print(f"URL: {url}, Selector: {selector}, Input Data: {input_data}")

    result = {"status": "error", "message": "Unknown error during automation."}

    try:
        with sync_playwright() as p:
            # 使用 Chromium 瀏覽器
            browser = p.chromium.launch(headless=True) # 使用無頭模式
            page = browser.new_page()
            
            try:
                page.goto(url, timeout=30000) # 30秒超時
                
                if action == "fetch_text":
                    try:
                        element = page.locator(selector)
                        text_content = element.inner_text()
                        result = {"status": "success", "action": action, "url": url, "selector": selector, "data": text_content}
                    except PlaywrightTimeoutError:
                        result = {"status": "error", "message": f"Timeout waiting for selector '{selector}' on URL '{url}'."}
                    except Exception as e:
                        result = {"status": "error", "message": f"Failed to fetch text: {str(e)}"}
                
                elif action == "screenshot":
                    # TODO: 實現截圖邏輯，保存到指定路徑並返回路徑
                    screenshot_path = f"screenshot_{page.title().replace(' ', '_')}.png"
                    page.screenshot(path=screenshot_path)
                    result = {"status": "success", "action": action, "url": url, "selector": selector, "image_path": screenshot_path, "message": "Screenshot simulated and saved."}

                # TODO: 擴展其他動作如 fill_form 等

                else:
                    result = {"status": "error", "message": f"Unsupported action: {action}"}

            except PlaywrightTimeoutError:
                result = {"status": "error", "message": f"Navigation to '{url}' timed out."}
            except Exception as e:
                result = {"status": "error", "message": f"Navigation or page interaction failed: {str(e)}"}
            finally:
                browser.close()

    except Exception as e:
        result = {"status": "error", "message": f"Playwright launch failed: {str(e)}"}

    return json.dumps(result, ensure_ascii=False)


if __name__ == '__main__':
    # 這是技能被調用時的入口點。預期通過命令行參數接收 JSON 格式的輸入。\n    if len(sys.argv) > 1:\n        try:\n            input_json = sys.argv[1]\n            args = json.loads(input_json)\n            output = run_browser_automation(**args)\n            print(output)\n        except Exception as e:\n            print(json.dumps({\"status\": \"error\", \"message\": str(e)}, ensure_ascii=False))\n    else:\n        print(json.dumps({\"status\": \"error\", \"message\": \"No input arguments provided\"}, ensure_ascii=False))\n