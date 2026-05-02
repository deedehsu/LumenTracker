# Windows 封裝指南

因為我們目前是在 Mac (macOS) 環境下操作，Python 預設無法「跨平台」直接編譯出 Windows 的 `.exe` 執行檔（編譯出的二進位碼不互通）。

但是，只要您將這些原始碼複製到一台 **Windows 電腦**上，封裝成獨立 `.exe` 的過程非常簡單！

## 在 Windows 電腦上的封裝步驟：

1. **準備環境**：
   在 Windows 電腦上安裝 Python，並確保這台電腦有我們專案的 `skills/browser-automation` 資料夾。

2. **安裝所需套件**：
   打開 Windows 的「命令提示字元 (cmd)」或 PowerShell，輸入以下指令安裝套件：
   ```cmd
   pip install requests beautifulsoup4 markdownify pyinstaller playwright
   playwright install
   ```

3. **執行打包指令 (重要：必須包含 Playwright 瀏覽器)**：
   在命令提示字元中，切換到該資料夾（例如 `cd C:\LumenTracker\skills\browser-automation`）。
   因為工具使用了 Playwright 進行自動化爬蟲，我們必須在打包時把內建的 Chromium 瀏覽器一併打包進去。
   請執行以下指令：
   ```cmd
   pyinstaller --onefile --windowed --name LumenGatherer --add-data "%LOCALAPPDATA%\ms-playwright\chromium-1105\chrome-win\*;playwright\driver\package\.local-browsers\chromium-1105\chrome-win" gui_extractor.py
   ```
   *(註：上面的 `chromium-1105` 號碼可能會因 Playwright 版本不同而變，請先去 `%LOCALAPPDATA%\ms-playwright` 資料夾看一下實際的名稱)*

4. **取得您的獨立程式**：
   打包完成後，您會在資料夾裡面看到一個名為 **`dist`** 的新目錄。
   點進去，裡面的 **`LumenGatherer.exe`** 就是我們的心血結晶！
   您可以把這個檔案丟到隨身碟，帶到警局或地檢署的任何一台 Windows 電腦上，**隨插即用，完全不需要再安裝任何 Python 環境！**
