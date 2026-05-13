// ui_logic/case_workspace_logic.js

const api = window.electronAPI; // Assuming electronAPI is globally available

document.addEventListener('DOMContentLoaded', () => {
    // --- 自動格式化時間 (輸入 4 碼轉 HH:MM) ---
    const timeInput = document.getElementById('wsTxTime');
    if (timeInput) {
        timeInput.addEventListener('blur', function(e) {
            let val = e.target.value.replace(/[^0-9]/g, '');
            if (val.length === 4) {
                const hh = val.substring(0, 2);
                const mm = val.substring(2, 4);
                if (parseInt(hh) <= 23 && parseInt(mm) <= 59) {
                    e.target.value = `${hh}:${mm}`;
                }
            }
        });
    }

    const wsBtnAddWallet = document.getElementById('wsBtnAddWallet');
    if (wsBtnAddWallet) {
        wsBtnAddWallet.addEventListener('click', () => {
            const addr = document.getElementById('wsWalletAddr')?.value.trim();
            const note = document.getElementById('wsWalletNote')?.value.trim();
            if (!addr) { alert("請輸入錢包地址！"); return; }
            
            // 稽核重複地址
            if (window.caseWallets.some(w => w.address.toLowerCase() === addr.toLowerCase())) {
                alert("此錢包地址已存在清單中，請勿重複新增！");
                return;
            }
            
            window.caseWallets.push({ address: addr, note: note });
            window.renderWalletTable();
            const wsWalletAddr = document.getElementById('wsWalletAddr');
            if (wsWalletAddr) wsWalletAddr.value = '';
            const wsWalletNote = document.getElementById('wsWalletNote');
            if (wsWalletNote) wsWalletNote.value = '';
        });
    }

    window.renderWalletTable = function renderWalletTable() {
        const tbody = document.getElementById('wsWalletTableBody');
        if(!tbody) return;
        tbody.innerHTML = '';
        if(window.caseWallets.length === 0) {
            tbody.innerHTML = '<tr id="wsWalletEmptyRow"><td colspan="3" style="text-align: center; color: #999; padding: 15px;">尚無錢包紀錄</td></tr>';
            return;
        }
        window.caseWallets.forEach((w, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="border: 1px solid #ddd; padding: 8px; font-family: monospace;">${w.address}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${w.note}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">
                    <button onclick="window.removeWallet(${index})" style="background:none; border:none; color:#dc3545; cursor:pointer; font-weight:bold;">刪除</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
    window.removeWallet = function(index) { window.caseWallets.splice(index, 1); window.renderWalletTable(); };

    const wsBtnAddTx = document.getElementById('wsBtnAddTx');
    if (wsBtnAddTx) {
        wsBtnAddTx.addEventListener('click', async () => {
            const date = document.getElementById('wsTxDate')?.value;
            const time = document.getElementById('wsTxTime')?.value;
            const from = document.getElementById('wsTxFrom')?.value.trim();
            const to = document.getElementById('wsTxTo')?.value.trim();
            const twdStr = document.getElementById('wsTxTwd')?.value;
            const cryptoStr = document.getElementById('wsTxCrypto')?.value;
            const coin = document.getElementById('wsTxCoin')?.value.trim() || 'USDT';

            if (!date || !twdStr || !cryptoStr) {
                alert("請至少填寫日期、臺幣金額與數量！");
                return;
            }

            const twd = parseFloat(twdStr);
            const crypto = parseFloat(cryptoStr);
            const txRate = (crypto > 0) ? (twd / crypto).toFixed(2) : "0.00";
            
            const newTxIndex = window.caseTransactions.length;
            window.caseTransactions.push({
                date, time, from, to, twd, crypto, coin, txRate, dailyRate: "計算中..."
            });
            window.renderTxTable();
            
            // 清空所有輸入框以利連續輸入
            const wsTxDate = document.getElementById('wsTxDate');
            if (wsTxDate) wsTxDate.value = '';
            const wsTxTime = document.getElementById('wsTxTime');
            if (wsTxTime) wsTxTime.value = '';
            const wsTxFrom = document.getElementById('wsTxFrom');
            if (wsTxFrom) wsTxFrom.value = '';
            const wsTxTo = document.getElementById('wsTxTo');
            if (wsTxTo) wsTxTo.value = '';
            const wsTxTwd = document.getElementById('wsTxTwd');
            if (wsTxTwd) wsTxTwd.value = '';
            const wsTxCrypto = document.getElementById('wsTxCrypto');
            if (wsTxCrypto) wsTxCrypto.value = '';

            try {
                // Ensure we use the correct global API object
                const electronApiObj = window.electronAPI || api;
                if (electronApiObj && electronApiObj.getHistoricalRate) {
                    const rateRes = await electronApiObj.getHistoricalRate(date, coin);
                    if (rateRes && rateRes.success) {
                        window.caseTransactions[newTxIndex].dailyRate = rateRes.rate;
                    } else {
                        window.caseTransactions[newTxIndex].dailyRate = "無資料";
                    }
                } else {
                    // Fallback or simulated rate if API is not available (for development/testing)
                    const month = parseInt(date.split('-')[1], 10);
                    window.caseTransactions[newTxIndex].dailyRate = (31.0 + (month * 0.1)).toFixed(2);
                }
                window.renderTxTable(); 
            } catch (e) {
                console.error("Rate fetch error:", e);
                window.caseTransactions[newTxIndex].dailyRate = "錯誤";
                window.renderTxTable();
            }
        });
    }

    window.renderTxTable = function renderTxTable() {
        const tbody = document.getElementById('wsTxTableBody');
        if(!tbody) return;
        tbody.innerHTML = '';
        if(window.caseTransactions.length === 0) {
            tbody.innerHTML = '<tr id="wsTxEmptyRow"><td colspan="8" style="text-align: center; color: #999; padding: 15px;">尚無交易紀錄</td></tr>';
            return;
        }
        window.caseTransactions.forEach((tx, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="border: 1px solid #ddd; padding: 8px;">${tx.date} ${tx.time}</td>
                <td style="border: 1px solid #ddd; padding: 8px; font-family: monospace;">${tx.from ? tx.from.substring(0,12)+'...' : ''}</td>
                <td style="border: 1px solid #ddd; padding: 8px; font-family: monospace;">${tx.to ? tx.to.substring(0,12)+'...' : ''}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${tx.twd.toLocaleString()}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${tx.crypto} ${tx.coin}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right; color: #007bff; font-weight: bold;">${tx.txRate}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right; color: #28a745;">${tx.dailyRate}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">
                    <button onclick="window.removeTx(${index})" style="background:none; border:none; color:#dc3545; cursor:pointer; font-weight:bold;">刪除</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
    window.removeTx = function(index) { window.caseTransactions.splice(index, 1); window.renderTxTable(); };

    const btnSaveCaseToFile = document.getElementById('btnSaveCaseToFile');
    if (btnSaveCaseToFile) {
        btnSaveCaseToFile.addEventListener('click', async () => {
            const btn = document.getElementById('btnSaveCaseToFile');
            if (btn) {
                btn.disabled = true;
                btn.textContent = "儲存中...";
            }
            
            try {
                // Try to extract case name from headerCaseInfo (format: Case: xxx | Investigator Unit: ...)
                let cName = "未命名案件";
                const headerText = document.getElementById('headerCaseInfo')?.textContent || "";
                if(headerText.includes("案件: ")) {
                    cName = headerText.split("案件: ")[1].split(" |")[0];
                }

                const data = {
                    caseId: window.currentActiveCaseId, // If old case loaded, overwrite. If not, backend will generate new ID
                    caseName: cName,
                    headerCaseInfo: headerText,
                    headerTimeInfo: document.getElementById('headerTimeInfo')?.textContent || "未知時間",
                    wsInvestigatorInfo: document.getElementById('wsInvestigatorInfo')?.textContent || "未知調查員",
                    caseSummary: document.getElementById('wsCaseSummary')?.value || "",
                    caseWallets: window.caseWallets || [],
                    caseTransactions: window.caseTransactions || [],
                    version: "1.1"
                };
                
                const apiObj = window.electronAPI || api;
                const res = await apiObj.saveCaseInternal(data);
                
                if(res && res.success) {
                    window.currentActiveCaseId = res.caseId; // Update current ID to the saved ID
                    alert("✅ 案件已成功更新並儲存至系統資料庫！");
                } else if (res && res.message) {
                    alert("儲存失敗: " + res.message);
                }
            } catch(e) {
                console.error(e);
                alert("發生內部錯誤: " + e.message);
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = "💾 存入資料庫";
                }
            }
        });
    }

    const btnBackToHub = document.getElementById('btnBackToHub');
    if (btnBackToHub) {
        btnBackToHub.addEventListener('click', () => {
            if (typeof loadScreen === 'function') {
                loadScreen('case_hub', () => {
                    const displayHubUserName = document.getElementById('displayHubUserName');
                    if (displayHubUserName && window.currentUserProfile) {
                        displayHubUserName.textContent = `${window.currentUserProfile.unit} - ${window.currentUserProfile.title} ${window.currentUserProfile.name}`;
                    }
                });
            } else {
                console.error('loadScreen function not found in case_workspace_logic.js');
            }
        });
    }

    // When the Case Workspace is loaded, if there's a current case summary, populate it.
    // And re-render tables if data exists.
    if (window.caseSummary && document.getElementById('wsCaseSummary')) {
        document.getElementById('wsCaseSummary').value = window.caseSummary;
    }
    if (typeof window.renderWalletTable === 'function') {
        window.renderWalletTable();
    }
    if (typeof window.renderTxTable === 'function') {
        window.renderTxTable();
    }

    // Set header info if available from global state
    if (window.caseHeaderInfo && document.getElementById('headerCaseInfo')) {
        document.getElementById('headerCaseInfo').textContent = window.caseHeaderInfo;
    }
    if (window.caseTimeInfo && document.getElementById('headerTimeInfo')) {
        document.getElementById('headerTimeInfo').textContent = window.caseTimeInfo;
    }
    if (window.investigatorInfo && document.getElementById('wsInvestigatorInfo')) {
        document.getElementById('wsInvestigatorInfo').textContent = window.investigatorInfo;
    }
});