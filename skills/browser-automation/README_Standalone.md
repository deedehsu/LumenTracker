# Lumen Intelligence Gatherer - 獨立執行說明

為了讓您能更方便地使用這個「判決書/文獻萃取工具」，且不需每次都透過終端機輸入指令，我們提供了兩種將其封裝為「獨立應用程式 (Standalone App)」的方法。

## 方法 A：建立桌面捷徑 (最快速、最輕量)

在 Mac 上，您可以建立一個可點擊的應用程式腳本 (Automator App)：

1. 打開 Mac 內建的 **「自動機 (Automator)」** 應用程式。
2. 選擇新增一份 **「應用程式 (Application)」**。
3. 在左側搜尋列輸入「AppleScript」，然後雙擊 **「執行 AppleScript (Run AppleScript)」**。
4. 將裡面的程式碼替換為以下內容（請確認路徑符合您的電腦環境）：

```applescript
on run {input, parameters}
    tell application "Terminal"
        do script "cd ~/.openclaw/workspace/LumenTracker_repo/skills/browser-automation && python3 gui_extractor.py"
        activate
    end tell
    return input
end run
```

5. 點擊頂部選單的「檔案」>「儲存」，將其命名為 **`LumenGatherer`**，並存放在您的**桌面 (Desktop)** 或**應用程式 (Applications)** 資料夾。
6. 以後只需在桌面點擊兩下這個 `LumenGatherer` 圖示，工具就會自動啟動！

## 方法 B：使用 PyInstaller 打包成單一執行檔 (.exe / .app)

如果您希望將這個工具分享給其他**沒有安裝 Python 環境**的調查員同事，可以使用 `PyInstaller` 將其徹底封裝。

1. 打開終端機，確保已安裝 PyInstaller：
   `pip3 install pyinstaller`
2. 進入該工具目錄：
   `cd ~/.openclaw/workspace/LumenTracker_repo/skills/browser-automation`
3. 執行打包指令：
   `pyinstaller --onefile --windowed --name LumenGatherer gui_extractor.py`
4. 打包完成後，您會在 `dist/` 資料夾中找到一個名為 `LumenGatherer` 的獨立執行檔。您可以將它直接拖到桌面上使用。
