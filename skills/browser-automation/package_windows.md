# Windows 封裝指南

因為我們目前是在 Mac (macOS) 環境下操作，Python 預設無法「跨平台」直接編譯出 Windows 的 `.exe` 執行檔（編譯出的二進位碼不互通）。

但是，只要您將這些原始碼複製到一台 **Windows 電腦**上，封裝成獨立 `.exe` 的過程非常簡單！

## 在 Windows 電腦上的封裝步驟：

1. **準備環境**：
   在 Windows 電腦上安裝 Python，並確保這台電腦有我們專案的 `skills/browser-automation` 資料夾。

2. **安裝所需套件**：
   打開 Windows 的「命令提示字元 (cmd)」或 PowerShell，輸入以下指令安裝套件：
   ```cmd
   pip install requests beautifulsoup4 markdownify pyinstaller
   ```

3. **執行打包指令**：
   在命令提示字元中，切換到該資料夾（例如 `cd C:\LumenTracker\skills\browser-automation`），然後執行這行魔法指令：
   ```cmd
   pyinstaller --onefile --windowed --icon=app.ico --name LumenGatherer gui_extractor.py
   ```
   *   `--onefile`：把所有依賴套件打包成單一個乾淨的 `.exe` 檔。
   *   `--windowed`：執行時不要跳出黑色的駭客終端機視窗，只顯示我們漂亮的 GUI。
   *   `--name`：設定軟體名稱為 LumenGatherer。

4. **取得您的獨立程式**：
   打包完成後，您會在資料夾裡面看到一個名為 **`dist`** 的新目錄。
   點進去，裡面的 **`LumenGatherer.exe`** 就是我們的心血結晶！
   您可以把這個檔案丟到隨身碟，帶到警局或地檢署的任何一台 Windows 電腦上，**隨插即用，完全不需要再安裝任何 Python 環境！**
