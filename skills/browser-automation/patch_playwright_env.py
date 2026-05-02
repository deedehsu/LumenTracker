import os
import glob

files_to_patch = ["gui_extractor.py", "tw_judgment_scraper.py", "tw_judgment_searcher.py"]

env_patch = """import os
import sys
# [PyInstaller Fix] Force Playwright to use the system-wide browser cache instead of the temporary _MEI folder
os.environ["PLAYWRIGHT_BROWSERS_PATH"] = "0"
"""

for file_path in files_to_patch:
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if "PLAYWRIGHT_BROWSERS_PATH" not in content:
            # Inject right after the first line (or top if no shebang)
            lines = content.split('\n')
            if lines[0].startswith('#!'):
                lines.insert(1, env_patch)
            else:
                lines.insert(0, env_patch)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write('\n'.join(lines))
            print(f"Patched {file_path}")
        else:
            print(f"Already patched {file_path}")
