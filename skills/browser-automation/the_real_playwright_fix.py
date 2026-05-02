import os
import re

files_to_patch = [
    "tw_judgment_extractor.py",
    "tw_judgment_scraper.py",
    "tw_judgment_searcher.py",
    "deep_scout.py",
    "fetch_html.py",
    "fetch_result_html.py"
]

new_launch = """        
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
                        
            browser = await p.chromium.launch(**launch_args)"""

for file_path in files_to_patch:
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # We need to make sure 'import sys' is available if we use sys.frozen
        if "import sys" not in content:
            content = "import sys\n" + content
            
        content = re.sub(r'browser\s*=\s*await\s+p\.chromium\.launch\([^)]*\)', new_launch, content)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Patched {file_path}")
