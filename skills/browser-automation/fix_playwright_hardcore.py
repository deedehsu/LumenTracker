import os
import re

files_to_patch = ["tw_judgment_scraper.py", "tw_judgment_searcher.py"]

for file_path in files_to_patch:
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Modify the launch command
        new_launch = """        
        launch_args = {"headless": True}
        # If running as PyInstaller EXE, we must provide the exact path to the global browser
        if getattr(sys, 'frozen', False):
            import glob
            local_app_data = os.environ.get('LOCALAPPDATA', '')
            if local_app_data:
                # Find the latest chromium_headless_shell in ms-playwright
                search_pattern = os.path.join(local_app_data, "ms-playwright", "chromium_headless_shell-*", "chrome-headless-shell-win64", "chrome-headless-shell.exe")
                found_browsers = glob.glob(search_pattern)
                if not found_browsers:
                    # Fallback to normal chromium
                    search_pattern = os.path.join(local_app_data, "ms-playwright", "chromium-*", "chrome-win", "chrome.exe")
                    found_browsers = glob.glob(search_pattern)
                
                if found_browsers:
                    # Use the first one found
                    launch_args["executable_path"] = found_browsers[0]
                    
        browser = p.chromium.launch(**launch_args)"""
        
        # Replace existing simple launch: browser = p.chromium.launch(headless=True)
        content = re.sub(r'browser = p\.chromium\.launch\([^)]*\)', new_launch, content)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Hardcore patched {file_path}")
