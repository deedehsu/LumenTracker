
import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox
import asyncio
import threading
import json
import os
from datetime import datetime

# 導入我們核心的擷取邏輯
# 注意：為了讓 GUI 不卡死，我們需要修改 tw_judgment_extractor，使其能回傳即時進度
from tw_judgment_extractor import search_and_extract_judgments

# 定義一個簡單的本地歷史紀錄庫檔案
HISTORY_FILE = "results/download_history.json"

def load_history():
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except json.JSONDecodeError:
            return []
    return []

def save_history(history):
    os.makedirs("results", exist_ok=True)
    with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
        json.dump(history, f, ensure_ascii=False, indent=2)

class JudgmentExtractorGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Lumen Intelligence Gatherer - 裁判書自動擷取工具")
        self.root.geometry("700x600")
        self.root.configure(padx=20, pady=20)

        # 狀態變數
        self.is_running = False
        self.history = load_history()

        self.create_widgets()

    def create_widgets(self):
        # --- 輸入區塊 ---
        input_frame = ttk.LabelFrame(self.root, text="搜尋設定", padding=(10, 10))
        input_frame.pack(fill=tk.X, pady=(0, 10))

        # 關鍵字
        ttk.Label(input_frame, text="搜尋關鍵字:").grid(row=0, column=0, sticky=tk.W, pady=5)
        self.keyword_entry = ttk.Entry(input_frame, width=50)
        self.keyword_entry.grid(row=0, column=1, sticky=tk.W, padx=5, pady=5)
        self.keyword_entry.insert(0, "詐欺 虛擬貨幣") # 預設值

        # 最大筆數
        ttk.Label(input_frame, text="最大擷取筆數:").grid(row=1, column=0, sticky=tk.W, pady=5)
        self.max_results_var = tk.IntVar(value=10)
        self.max_results_spin = ttk.Spinbox(input_frame, from_=1, to=100, textvariable=self.max_results_var, width=10)
        self.max_results_spin.grid(row=1, column=1, sticky=tk.W, padx=5, pady=5)

        # 輸出格式 (已移除，固定為 both)
        # ttk.Label(input_frame, text="輸出格式:").grid(row=2, column=0, sticky=tk.W, pady=5)
        # self.format_var = tk.StringVar(value="both")
        # format_combo = ttk.Combobox(input_frame, textvariable=self.format_var, values=["json", "csv", "both"], width=10, state="readonly")
        # format_combo.grid(row=2, column=1, sticky=tk.W, padx=5, pady=5)

        # 選項 (Checkboxes)
        options_frame = ttk.Frame(input_frame)
        options_frame.grid(row=2, column=0, columnspan=2, sticky=tk.W, pady=(10, 0))

        self.full_text_var = tk.BooleanVar(value=False)
        ttk.Checkbutton(options_frame, text="深度擷取：自動抓取判決書全文 (執行較慢)", variable=self.full_text_var).pack(anchor=tk.W)

        self.skip_duplicate_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(options_frame, text="防重複：跳過已下載全文的案件 (節省時間)", variable=self.skip_duplicate_var).pack(anchor=tk.W)

        # --- 按鈕區塊 ---
        button_frame = ttk.Frame(self.root)
        button_frame.pack(fill=tk.X, pady=10)

        self.start_button = ttk.Button(button_frame, text="開始擷取", command=self.start_scraping)
        self.start_button.pack(side=tk.LEFT, padx=(0, 10))

        self.open_folder_button = ttk.Button(button_frame, text="打開結果資料夾", command=self.open_results_folder)
        self.open_folder_button.pack(side=tk.LEFT)

        # --- 日誌區塊 ---
        log_frame = ttk.LabelFrame(self.root, text="執行日誌", padding=(10, 10))
        log_frame.pack(fill=tk.BOTH, expand=True)

        self.log_text = scrolledtext.ScrolledText(log_frame, wrap=tk.WORD, height=15)
        self.log_text.pack(fill=tk.BOTH, expand=True)
        self.log_text.configure(state='disabled') # 唯讀

    def log(self, message):
        """將訊息寫入 GUI 的日誌文字方塊中"""
        timestamp = datetime.now().strftime('%H:%M:%S')
        formatted_message = f"[{timestamp}] {message}\n"
        
        self.log_text.configure(state='normal')
        self.log_text.insert(tk.END, formatted_message)
        self.log_text.see(tk.END) # 自動捲動到底部
        self.log_text.configure(state='disabled')
        
        # 也印到終端機，方便除錯
        print(formatted_message, end='')

    def set_gui_state(self, running):
        """控制 GUI 元素在執行中/停止時的狀態"""
        self.is_running = running
        state = 'disabled' if running else 'normal'
        
        self.keyword_entry.configure(state=state)
        self.max_results_spin.configure(state=state)
        # Combobox 和 Checkbutton 在 disabled 狀態下的行為可能因作業系統而異
        
        if running:
            self.start_button.configure(text="擷取中...", state='disabled')
        else:
            self.start_button.configure(text="開始擷取", state='normal')

    def open_results_folder(self):
        """打開 results 資料夾"""
        results_dir = os.path.abspath("results")
        os.makedirs(results_dir, exist_ok=True)
        try:
            if os.name == 'nt': # Windows
                os.startfile(results_dir)
            elif os.name == 'posix': # macOS
                import subprocess
                subprocess.call(['open', results_dir])
            else: # Linux
                import subprocess
                subprocess.call(['xdg-open', results_dir])
            self.log(f"已開啟資料夾: {results_dir}")
        except Exception as e:
            self.log(f"無法開啟資料夾: {e}")

    def start_scraping(self):
        """按鈕點擊事件：啟動背景執行緒來跑異步的爬蟲"""
        keyword = self.keyword_entry.get().strip()
        if not keyword:
            messagebox.showwarning("錯誤", "請輸入搜尋關鍵字！")
            return

        max_results = self.max_results_var.get()
        out_format = "both" # 固定輸出 JSON 和 CSV (精簡版)
        fetch_full = self.full_text_var.get()
        skip_duplicate = self.skip_duplicate_var.get()

        self.log(f"--- 準備啟動擷取任務 ---")
        self.log(f"關鍵字: '{keyword}', 筆數: {max_results}, 抓全文: {fetch_full}, 防重複: {skip_duplicate}")
        
        self.set_gui_state(True)
        
        # 由於 playwright 是 async 的，而 tkinter 是 sync 的，
        # 我們必須在一個新的 Thread 裡面建立一個新的 event loop 來跑 playwright，
        # 否則會阻塞(卡死)整個 GUI 介面。
        thread = threading.Thread(target=self.run_async_scraper_in_thread, args=(keyword, max_results, out_format, fetch_full, skip_duplicate))
        thread.start()

    def run_async_scraper_in_thread(self, keyword, max_results, out_format, fetch_full, skip_duplicate):
        """在獨立執行緒中建立並執行 async loop"""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            # 呼叫我們核心的 async 函數
            # 注意：我們需要修改 tw_judgment_extractor，讓它能接受 logger 回呼函數和 history 列表
            result = loop.run_until_complete(
                search_and_extract_judgments(
                    keyword=keyword, 
                    max_results=max_results, 
                    output_format=out_format, 
                    fetch_full_text=fetch_full,
                    logger=self.log,           # 傳遞 GUI 的 logger
                    history=self.history if skip_duplicate else None # 傳遞歷史紀錄
                )
            )
            
            if result.get("status") == "success":
                self.log(f"✅ 任務完成！共擷取 {result.get('count', 0)} 筆資料。")
                self.log(f"檔案已儲存於 results 資料夾中。")
                
                # 更新並儲存歷史紀錄 (只有在抓全文成功時才記錄)
                if fetch_full:
                    save_history(self.history)
                    self.log("本地歷史紀錄庫已更新。")
                    
            else:
                self.log(f"❌ 任務失敗: {result.get('message', '未知錯誤')}")
                
        except Exception as e:
            self.log(f"❌ 發生未預期的例外錯誤: {str(e)}")
        finally:
            loop.close()
            # 無論成功失敗，都必須透過 root.after 將 UI 狀態恢復的操作排回主執行緒
            self.root.after(0, self.set_gui_state, False)

if __name__ == "__main__":
    # 確保 results 資料夾存在
    os.makedirs("results", exist_ok=True)
    
    root = tk.Tk()
    app = JudgmentExtractorGUI(root)
    
    print("啟動 Lumen Intelligence Gatherer GUI...")
    root.mainloop()
