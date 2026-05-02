# 在 Windows 上修復 Playwright 打包錯誤

當您執行 `LumenGatherer.exe` 時如果看到以下錯誤：
`Executable doesn't exist at C:\Users\...\Temp\_MEI...\playwright\driver\package\.local-browsers\...`

這是因為 `PyInstaller` 在打包成單一檔案 (`--onefile`) 時，無法自動把 Playwright 體積龐大的隱藏版 Chromium 瀏覽器包進去。

## 最簡單的解法 (不重新打包)
如果您只是要在自己的 Windows 電腦上用這支 `.exe`：
1. 打開命令提示字元 (cmd)
2. 輸入：`pip install playwright`
3. 輸入：`playwright install`
等待下載完成後，再次點擊您的 `.exe` 檔，就可以正常運作了！

## 進階解法 (分享給其他沒有安裝 Python 的電腦)
為了讓 `.exe` 可以在任何一台乾淨的 Windows 電腦上執行（隨身碟隨插即用），我們需要修改爬蟲程式碼，讓它不用 Playwright 預設的路徑，而是去找我們手動附帶的瀏覽器。這牽涉到複雜的修改。

**最推薦的妥協方案：**
在警局或單位的電腦上，要求使用者先安裝 Node.js 或 Python，並執行一次 `playwright install` 即可一勞永逸。
