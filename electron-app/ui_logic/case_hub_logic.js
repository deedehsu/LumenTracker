// ui_logic/case_hub_logic.js

const api = window.electronAPI; // Assuming electronAPI is globally available

document.addEventListener('DOMContentLoaded', () => {
    const btnCreateCase = document.getElementById('btnCreateCase');
    if (btnCreateCase) {
        btnCreateCase.addEventListener('click', () => {
            try {
                // Reset global state for new case
                window.currentActiveCaseId = null;
                window.caseWallets = [];
                window.caseTransactions = [];
                window.caseHeaderInfo = '';
                window.caseTimeInfo = '';
                window.investigatorInfo = '';
                
                // Set defaults for UI 5 Setup screen (which is actually case_setup.html)
                // This needs to be handled by the logic of case_setup.html after it loads.
                if (typeof loadScreen === 'function') {
                    loadScreen('case_setup', () => {
                        const unitEl = document.getElementById('investigatorUnit');
                        if(unitEl && window.currentUserProfile) unitEl.value = window.currentUserProfile.unit || '';
                        
                        const nameEl = document.getElementById('investigatorName');
                        if(nameEl && window.currentUserProfile) nameEl.value = `${window.currentUserProfile.title || ''} ${window.currentUserProfile.name || ''}`.trim();
                        
                        const caseIdEl = document.getElementById('caseId');
                        if(caseIdEl) caseIdEl.value = '';
                        
                        const initialTargetEl = document.getElementById('initialTarget');
                        if(initialTargetEl) initialTargetEl.value = '';

                        // Focus on caseId input after a short delay to ensure DOM is ready
                        if(caseIdEl) setTimeout(() => caseIdEl.focus(), 100);
                    });
                } else {
                    console.error('loadScreen function not found in case_hub_logic.js');
                }
            } catch (e) {
                alert("切換畫面時發生錯誤: " + e.message);
                console.error(e);
            }
        });
    }

    const btnImportEdit = document.getElementById('btnImportEdit');
    if (btnImportEdit) {
        btnImportEdit.addEventListener('click', () => {
            alert(`[開發中]
即將開啟檔案選擇器，導入既有案件並進入編輯模式 (UI 6)...`);
        });
    }

    const btnOpenCaseDB = document.getElementById('btnOpenCaseDB');
    if (btnOpenCaseDB) {
        btnOpenCaseDB.addEventListener('click', async () => {
            const modal = document.getElementById('modalCaseList');
            if(!modal) return;
            modal.classList.remove('hidden');
            const container = document.getElementById('caseListContainer');
            if (container) container.innerHTML = '<div style="text-align: center; color: #888;">載入中...</div>';
            
            try {
                const apiObj = window.electronAPI || api;
                const res = await apiObj.getAllCases();
                if (res && res.success) {
                    if (container) container.innerHTML = '';
                    if (res.cases.length === 0) {
                        if (container) container.innerHTML = '<div style="text-align: center; color: #888; padding: 20px;">系統內尚無案件資料。</div>';
                        return;
                    }
                    
                    res.cases.forEach(c => {
                        const card = document.createElement('div');
                        const dateStr = new Date(c.lastModified).toLocaleString();
                        card.style.cssText = 'padding: 15px; border: 1px solid #ccc; border-radius: 5px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; background: #fdfdfd; transition: background 0.2s; margin-bottom: 10px;';
                        card.innerHTML = `
                            <div>
                                <h4 style="margin: 0 0 5px 0; color: #2c3e50;">${c.caseName}</h4>
                                <div style="font-size: 0.85em; color: #666;">建立者: ${c.investigator} | 最後修改: ${dateStr}</div>
                                <div style="font-size: 0.85em; color: #888; margin-top: 5px;">內含: ${c.walletCount} 錢包, ${c.txCount} 交易</div>
                            </div>
                            <button class="button" style="background-color: #28a745; padding: 8px 15px; border:none; color:white; border-radius: 4px;">載入</button>
                        `;
                        
                        card.addEventListener('mouseenter', () => card.style.backgroundColor = '#f1f8ff');
                        card.addEventListener('mouseleave', () => card.style.backgroundColor = '#fdfdfd');
                        
                        // Use a lambda or bind to pass caseId correctly
                        card.querySelector('button')?.addEventListener('click', (e) => {
                            e.stopPropagation(); // Prevent card click from firing
                            loadCaseFromDB(c.caseId);
                        });
                        card.addEventListener('click', () => loadCaseFromDB(c.caseId)); // Also allow clicking the card itself
                        if (container) container.appendChild(card);
                    });
                } else {
                    if (container) container.innerHTML = `<div style="color: red;">讀取失敗: ${res.message}</div>`;
                }
            } catch(e) {
                console.error(e);
                if (container) container.innerHTML = `<div style="color: red;">發生錯誤: ${e.message}</div>`;
            }
        });
    }

    const btnCloseModal = document.getElementById('btnCloseModal');
    if (btnCloseModal) {
        btnCloseModal.addEventListener('click', () => {
            const modal = document.getElementById('modalCaseList');
            if (modal) modal.classList.add('hidden');
        });
    }

    async function loadCaseFromDB(caseId) {
        try {
            const apiObj = window.electronAPI || api;
            const res = await apiObj.loadCaseInternal(caseId);
            if(res && res.success) {
                const d = res.data;
                window.currentActiveCaseId = d.caseId; 
                
                // Store data globally or pass as part of loadScreen callback context
                window.caseHeaderInfo = d.headerCaseInfo;
                window.caseTimeInfo = d.headerTimeInfo;
                window.investigatorInfo = d.wsInvestigatorInfo;
                window.caseSummary = d.caseSummary;
                window.caseWallets = d.caseWallets || [];
                window.caseTransactions = d.caseTransactions || [];
                
                if (typeof loadScreen === 'function') {
                    loadScreen('case_workspace', () => {
                        const hci = document.getElementById('headerCaseInfo');
                        if(hci) hci.textContent = window.caseHeaderInfo;
                        
                        const hti = document.getElementById('headerTimeInfo');
                        if(hti) hti.textContent = window.caseTimeInfo;
                        
                        const wsii = document.getElementById('wsInvestigatorInfo');
                        if(wsii) wsii.textContent = window.investigatorInfo;
                        
                        const wsCaseSummary = document.getElementById('wsCaseSummary');
                        if(wsCaseSummary) wsCaseSummary.value = window.caseSummary;

                        // These render functions will need to be in case_workspace_logic.js
                        if (typeof window.renderWalletTable === 'function') {
                            window.renderWalletTable();
                        }
                        if (typeof window.renderTxTable === 'function') {
                            window.renderTxTable();
                        }
                        
                        const modal = document.getElementById('modalCaseList');
                        if (modal) modal.classList.add('hidden');
                    });
                } else {
                    console.error('loadScreen function not found in case_hub_logic.js');
                }

            } else {
                alert("載入失敗: " + res.message);
            }
        } catch(e) {
            alert("發生內部錯誤: " + e.message);
            console.error(e);
        }
    }

    // Expose loadCaseFromDB to the global scope for event listeners generated in this module
    window.loadCaseFromDB = loadCaseFromDB;
});