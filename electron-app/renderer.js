let currentLumenApiKeys = null;
        const api = window.electronAPI;

        
        // State variables
        let tempUserProfile = {};
        let tempPassword = '';
        let currentUserProfile = {};

        let currentActiveCaseId = null;
        
        // Ensure globals are set
        window.caseWallets = window.caseWallets || [];
        window.caseTransactions = window.caseTransactions || [];
        window.currentActiveCaseId = window.currentActiveCaseId || null;


                                let cy; // Cytoscape instance


        // Helper: Hide all screens
        function hideAllScreens() {
            const screens = ['screenWelcome', 'screenUserSetup', 'screenPasswordSetup', 'screenApiSetup', 'screenLogin', 'screenCaseHub', 'screenCaseWorkspace', 'screenAnalysisDashboard', 'mainDashboard'];
            screens.forEach(id => {
                const el = document.getElementById(id);
                if(el) el.classList.add('hidden');
            });
            // Clear errors
            document.querySelectorAll('.error-message').forEach(el => el.classList.add('hidden'));
        }

        function showScreen(id) {
            hideAllScreens();
            document.getElementById(id).classList.remove('hidden');
        }

        // --- Initialization ---
        document.addEventListener('DOMContentLoaded', async () => {
            try {
                const status = await api.checkSystemStatus();
                if (status.isConfigured) {
                    // Not first run -> Go to Login
                    currentUserProfile = status.userProfile;
                    document.getElementById('displayLoginUserName').textContent = `${currentUserProfile.name} (帳號: ${currentUserProfile.phone})`;
                    showScreen('screenLogin');
                    document.getElementById('inputLoginPwd').focus();
                } else {
                    // First run -> Go to Welcome
                    showScreen('screenWelcome');
                }
            } catch(e) {
                console.error('Init error:', e);
                showScreen('screenWelcome');
            }
        });

        // --- UI 1 to UI 2 ---
        document.getElementById('btnNextToUserSetup').addEventListener('click', () => {
            showScreen('screenUserSetup');
            document.getElementById('inputUserName').focus();
        });

        // --- UI 2 to UI 3 (Setup) ---
        document.getElementById('btnBackToWelcome').addEventListener('click', () => showScreen('screenWelcome'));
        document.getElementById('btnNextToPwdSetup').addEventListener('click', () => {
            const unit = document.getElementById('inputUnit').value.trim();
            const title = document.getElementById('inputTitle').value.trim();
            const name = document.getElementById('inputName').value.trim();
            const phone = document.getElementById('inputPhone').value.trim();
            const email = document.getElementById('inputEmail').value.trim();
            const errEl = document.getElementById('errUserSetup');

            if (!unit || !title || !name || !phone) {
                errEl.classList.remove('hidden');
                return;
            }
            
            errEl.classList.add('hidden');
            tempUserProfile = { unit, title, name, phone, email };
            
            document.getElementById('displaySetupUserName').textContent = `${title} ${name} (帳號: ${phone})`;
            showScreen('screenPasswordSetup');
            document.getElementById('inputNewPwd').focus();
        });

        // --- UI 3 to UI 4 ---
        document.getElementById('btnBackToUserSetup').addEventListener('click', () => showScreen('screenUserSetup'));
        document.getElementById('btnNextToApiSetup').addEventListener('click', () => {
            const p1 = document.getElementById('inputNewPwd').value;
            const p2 = document.getElementById('inputConfirmPwd').value;
            if (!p1 || p1 !== p2) {
                document.getElementById('errPwdSetup').classList.remove('hidden');
                return;
            }
            tempPassword = p1;
            showScreen('screenApiSetup');
        });

        // --- API Testing Logic ---
        document.getElementById('btnTestEtherscan').addEventListener('click', async () => {
            const key = document.getElementById('inputEtherscanKey').value.trim();
            const resEl = document.getElementById('resEtherscan');
            resEl.textContent = '測試中...';
            resEl.className = 'test-result';
            const res = await api.testApiKey({ provider: 'etherscan', apiKey: key });
            resEl.textContent = res.message;
            resEl.className = res.success ? 'test-result success-message' : 'test-result error-message';
        });

        document.getElementById('btnTestTronscan').addEventListener('click', async () => {
            const key = document.getElementById('inputTronscanKey').value.trim();
            const resEl = document.getElementById('resTronscan');
            resEl.textContent = '測試中...';
            resEl.className = 'test-result';
            const res = await api.testApiKey({ provider: 'tronscan', apiKey: key });
            resEl.textContent = res.message;
            resEl.className = res.success ? 'test-result success-message' : 'test-result error-message';
        });

        // --- UI 4 to UI 5 (Finish Setup) ---
        document.getElementById('btnBackToPwdSetup').addEventListener('click', () => showScreen('screenPasswordSetup'));
        document.getElementById('btnFinishSetup').addEventListener('click', async () => {
            const eKey = document.getElementById('inputEtherscanKey').value.trim();
            const tKey = document.getElementById('inputTronscanKey').value.trim();
            const errEl = document.getElementById('errApiSetup');
            
            if (!eKey && !tKey) {
                errEl.textContent = "請至少輸入一個 API Key 才能繼續。";
                errEl.classList.remove('hidden');
                return;
            }

            const apiKeys = {};
            if (eKey) apiKeys.etherscan = eKey;
            if (tKey) apiKeys.tronscan = tKey;

            const btn = document.getElementById('btnFinishSetup');
            btn.disabled = true;
            btn.textContent = "加密設定中...";

            try {
                const res = await api.setupSystem({
                    userProfile: tempUserProfile,
                    masterPassword: tempPassword,
                    apiKeys: apiKeys
                });

                if (res.success) {
                    currentUserProfile = tempUserProfile;
                    currentLumenApiKeys = apiKeys;
                    // Setup done, move to UI 5 (Case Hub)
                    document.getElementById('displayHubUserName').textContent = `${currentUserProfile.unit} - ${currentUserProfile.title} ${currentUserProfile.name}`;
                    showScreen('screenCaseHub');
                    
                    // Clear memory
                    tempPassword = '';
                    document.getElementById('inputNewPwd').value = '';
                    document.getElementById('inputConfirmPwd').value = '';
                } else {
                    errEl.textContent = `儲存失敗: ${res.message}`;
                    errEl.classList.remove('hidden');
                }
            } catch(e) {
                errEl.textContent = "內部錯誤，無法儲存。";
                errEl.classList.remove('hidden');
            } finally {
                btn.disabled = false;
                btn.textContent = "完成設定並加密儲存";
            }
        });

        // --- UI 3 (Login) to UI 5 ---
        document.getElementById('btnLogin').addEventListener('click', async () => {
            const pwd = document.getElementById('inputLoginPwd').value;
            const errEl = document.getElementById('errLogin');
            if(!pwd) return;

            const btn = document.getElementById('btnLogin');
            btn.disabled = true;
            btn.textContent = "解鎖中...";

            try {
                const res = await api.loginSystem(pwd);
                if (res.success) {
                    currentUserProfile = res.userProfile;
                    currentLumenApiKeys = res.apiKeys || null;
                    document.getElementById('displayHubUserName').textContent = `${currentUserProfile.unit} - ${currentUserProfile.title} ${currentUserProfile.name}`;
                    document.getElementById('inputLoginPwd').value = '';
                    showScreen('screenCaseHub');
                } else {
                    errEl.textContent = res.message;
                    errEl.classList.remove('hidden');
                    document.getElementById('inputLoginPwd').value = '';
                    document.getElementById('inputLoginPwd').focus();
                }
            } catch(e) {
                errEl.textContent = "內部錯誤。";
                errEl.classList.remove('hidden');
            } finally {
                btn.disabled = false;
                btn.textContent = "解鎖並進入系統";
            }
        });

        document.getElementById('inputLoginPwd').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') document.getElementById('btnLogin').click();
        });

        // --- UI 5: Case Hub Actions (Placeholders for UI 6) ---
                document.getElementById('btnCreateCase')?.addEventListener('click', () => {
            try {
                currentActiveCaseId = null; // Reset for new case
                
                const summaryEl = document.getElementById('wsCaseSummary');
                if (summaryEl) summaryEl.value = '';
                
                const addrEl = document.getElementById('wsWalletAddr');
                if (addrEl) addrEl.value = '';
                
                const noteEl = document.getElementById('wsWalletNote');
                if (noteEl) noteEl.value = '';
                
                const txDateEl = document.getElementById('wsTxDate');
                if (txDateEl) txDateEl.value = '';

                caseWallets = [];
                caseTransactions = [];
                
                if(typeof renderWalletTable === 'function') renderWalletTable();
                if(typeof renderTxTable === 'function') renderTxTable();
                
                // Set defaults for UI 5 Setup screen
                const unitEl = document.getElementById('investigatorUnit');
                if(unitEl) unitEl.value = currentUserProfile.unit || '';
                
                const nameEl = document.getElementById('investigatorName');
                if(nameEl) nameEl.value = `${currentUserProfile.title || ''} ${currentUserProfile.name || ''}`.trim();
                
                const caseIdEl = document.getElementById('caseId');
                if(caseIdEl) caseIdEl.value = '';
                
                const initialTargetEl = document.getElementById('initialTarget');
                if(initialTargetEl) initialTargetEl.value = '';
                
                showScreen('screenCaseSetup'); // Go to Case Setup first!
                if(caseIdEl) setTimeout(() => caseIdEl.focus(), 100);
            } catch (e) {
                alert("切換畫面時發生錯誤: " + e.message);
                console.error(e);
            }
        });

        document.getElementById('btnImportEdit')?.addEventListener('click', () => {
            alert(`[開發中]
即將開啟檔案選擇器，導入既有案件並進入編輯模式 (UI 6)...`);
        });



        document.getElementById('btnOpenCaseDB')?.addEventListener('click', async () => {
            const modal = document.getElementById('modalCaseList');
            if(!modal) return;
            modal.classList.remove('hidden');
            const container = document.getElementById('caseListContainer');
            container.innerHTML = '<div style="text-align: center; color: #888;">載入中...</div>';
            
            try {
                const apiObj = window.electronAPI || api;
                const res = await apiObj.getAllCases();
                if (res && res.success) {
                    container.innerHTML = '';
                    if (res.cases.length === 0) {
                        container.innerHTML = '<div style="text-align: center; color: #888; padding: 20px;">系統內尚無案件資料。</div>';
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
                        
                        card.addEventListener('click', () => loadCaseFromDB(c.caseId));
                        container.appendChild(card);
                    });
                } else {
                    container.innerHTML = `<div style="color: red;">讀取失敗: ${res.message}</div>`;
                }
            } catch(e) {
                container.innerHTML = `<div style="color: red;">發生錯誤: ${e.message}</div>`;
            }
        });

        document.getElementById('btnCloseModal')?.addEventListener('click', () => {
            document.getElementById('modalCaseList')?.classList.add('hidden');
        });

        async function loadCaseFromDB(caseId) {
            try {
                const apiObj = window.electronAPI || api;
                const res = await apiObj.loadCaseInternal(caseId);
                if(res && res.success) {
                    const d = res.data;
                    currentActiveCaseId = d.caseId; 
                    
                    if (d.headerCaseInfo && document.getElementById('headerCaseInfo')) document.getElementById('headerCaseInfo').textContent = d.headerCaseInfo;
                    if (d.headerTimeInfo && document.getElementById('headerTimeInfo')) document.getElementById('headerTimeInfo').textContent = d.headerTimeInfo;
                    if (d.wsInvestigatorInfo && document.getElementById('wsInvestigatorInfo')) document.getElementById('wsInvestigatorInfo').textContent = d.wsInvestigatorInfo;
                    if (d.caseSummary && document.getElementById('wsCaseSummary')) document.getElementById('wsCaseSummary').value = d.caseSummary;
                    
                    window.caseWallets = d.caseWallets || [];
                    window.caseTransactions = d.caseTransactions || [];
                    
                    if (typeof renderWalletTable === 'function') {
                        renderWalletTable();
                    } else if (typeof window.renderWalletTable === 'function') {
                        window.renderWalletTable();
                    }
                    
                    if (typeof renderTxTable === 'function') {
                        renderTxTable();
                    } else if (typeof window.renderTxTable === 'function') {
                        window.renderTxTable();
                    }
                    
                    document.getElementById('modalCaseList').classList.add('hidden');
                    showScreen('screenCaseWorkspace');
                } else {
                    alert("載入失敗: " + res.message);
                }
            } catch(e) {
                alert("發生內部錯誤: " + e.message);
            }
        }

        // --- UI 6: Case Workspace Add Logic ---

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


                        
        document.getElementById('wsBtnAddWallet')?.addEventListener('click', () => {
            const addr = document.getElementById('wsWalletAddr').value.trim();
            const note = document.getElementById('wsWalletNote').value.trim();
            if (!addr) { alert("請輸入錢包地址！"); return; }
            
            // 稽核重複地址
            if (caseWallets.some(w => w.address.toLowerCase() === addr.toLowerCase())) {
                alert("此錢包地址已存在清單中，請勿重複新增！");
                return;
            }
            
            caseWallets.push({ address: addr, note: note });
            renderWalletTable();
            document.getElementById('wsWalletAddr').value = '';
            document.getElementById('wsWalletNote').value = '';
        });

        window.renderWalletTable = function renderWalletTable() {
            const tbody = document.getElementById('wsWalletTableBody');
            if(!tbody) return;
            tbody.innerHTML = '';
            if(caseWallets.length === 0) {
                tbody.innerHTML = '<tr id="wsWalletEmptyRow"><td colspan="3" style="text-align: center; color: #999; padding: 15px;">尚無錢包紀錄</td></tr>';
                return;
            }
            caseWallets.forEach((w, index) => {
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
        window.removeWallet = function(index) { caseWallets.splice(index, 1); renderWalletTable(); };

        document.getElementById('wsBtnAddTx')?.addEventListener('click', async () => {
            const date = document.getElementById('wsTxDate').value;
            const time = document.getElementById('wsTxTime').value;
            const from = document.getElementById('wsTxFrom').value.trim();
            const to = document.getElementById('wsTxTo').value.trim();
            const twdStr = document.getElementById('wsTxTwd').value;
            const cryptoStr = document.getElementById('wsTxCrypto').value;
            const coin = document.getElementById('wsTxCoin').value.trim() || 'USDT';

            if (!date || !twdStr || !cryptoStr) {
                alert("請至少填寫日期、臺幣金額與數量！");
                return;
            }

            const twd = parseFloat(twdStr);
            const crypto = parseFloat(cryptoStr);
            const txRate = (crypto > 0) ? (twd / crypto).toFixed(2) : "0.00";
            
            const newTxIndex = caseTransactions.length;
            caseTransactions.push({
                date, time, from, to, twd, crypto, coin, txRate, dailyRate: "計算中..."
            });
            renderTxTable();
            
            // 清空所有輸入框以利連續輸入
            document.getElementById('wsTxDate').value = '';
            document.getElementById('wsTxTime').value = '';
            document.getElementById('wsTxFrom').value = '';
            document.getElementById('wsTxTo').value = '';
            document.getElementById('wsTxTwd').value = '';
            document.getElementById('wsTxCrypto').value = '';

            try {
                // Ensure we use the correct global API object
                const electronApiObj = window.electronAPI || api;
                if (electronApiObj && electronApiObj.getHistoricalRate) {
                    const rateRes = await electronApiObj.getHistoricalRate(date, coin);
                    if (rateRes && rateRes.success) {
                        caseTransactions[newTxIndex].dailyRate = rateRes.rate;
                    } else {
                        caseTransactions[newTxIndex].dailyRate = "無資料";
                    }
                } else {
                    const month = parseInt(date.split('-')[1], 10);
                    caseTransactions[newTxIndex].dailyRate = (31.0 + (month * 0.1)).toFixed(2);
                }
                renderTxTable(); 
            } catch (e) {
                console.error("Rate fetch error:", e);
                caseTransactions[newTxIndex].dailyRate = "錯誤";
                renderTxTable();
            }
        });

        window.renderTxTable = function renderTxTable() {
            const tbody = document.getElementById('wsTxTableBody');
            if(!tbody) return;
            tbody.innerHTML = '';
            if(caseTransactions.length === 0) {
                tbody.innerHTML = '<tr id="wsTxEmptyRow"><td colspan="8" style="text-align: center; color: #999; padding: 15px;">尚無交易紀錄</td></tr>';
                return;
            }
            caseTransactions.forEach((tx, index) => {
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
        window.removeTx = function(index) { caseTransactions.splice(index, 1); renderTxTable(); };




document.getElementById('btnSaveCase')?.addEventListener('click', () => {
            try {
                if (caseWallets.length === 0 && caseTransactions.length === 0) {
                    if(!confirm("您尚未輸入任何錢包或交易紀錄，確定要直接進入畫布嗎？")) return;
                }
                
                hideAllScreens();
                document.getElementById('screenAnalysisDashboard').classList.remove('hidden');
                
                const caseInfoEl = document.getElementById('ui7CaseInfo');
                const headerInfoEl = document.getElementById('headerCaseInfo');
                if(caseInfoEl && headerInfoEl) {
                    caseInfoEl.textContent = headerInfoEl.textContent;
                }
                
                if(typeof initGraph === 'function') {
                    initGraph();
                } else {
                    console.error("initGraph function is missing!");
                }
                
                if(typeof populateReconciliation === 'function') {
                    populateReconciliation();
                } else {
                    console.error("populateReconciliation function is missing!");
                }
            } catch (err) {
                alert("切換畫面時發生嚴重錯誤: " + err.message);
                console.error(err);
            }
        });

        document.getElementById('btnBackToUi6')?.addEventListener('click', () => {
            showScreen('screenCaseWorkspace');
        });

        
        // --- UI 7: Tabs Logic (Green Box) ---
        document.getElementById('tabApiTxs')?.addEventListener('click', function() {
            this.style.color = '#fff';
            this.style.backgroundColor = '#27ae60';
            
            const tabVictim = document.getElementById('tabVictimTxs');
            tabVictim.style.color = '#666';
            tabVictim.style.backgroundColor = '#e9ecef';
            
            document.getElementById('contentApiTxs').style.display = 'block';
            document.getElementById('contentVictimTxs').style.display = 'none';
        });

        document.getElementById('tabVictimTxs')?.addEventListener('click', function() {
            this.style.color = '#fff';
            this.style.backgroundColor = '#27ae60';
            
            const tabApi = document.getElementById('tabApiTxs');
            tabApi.style.color = '#666';
            tabApi.style.backgroundColor = '#e9ecef';
            
            document.getElementById('contentApiTxs').style.display = 'none';
            document.getElementById('contentVictimTxs').style.display = 'block';
        });

        // 畫布點擊節點邏輯更新
        // cy.on('tap') is defined inside initGraph. We need to update it.

        // --- UI 7: Cytoscape Graph Logic ---
        

        function initGraph() {
            if (cy) {
                cy.destroy();
            }
            
            const cyContainer = document.getElementById('cy');
            const cyPlaceholder = document.getElementById('cyPlaceholder');
            if(!cyContainer) return;
            if(cyPlaceholder) cyPlaceholder.style.display = 'none';

            if(typeof cytoscape !== 'function') {
                console.error("Cytoscape is not loaded! Check script tags.");
                return;
            }

            cy = cytoscape({
                container: cyContainer,
                elements: [ 
                    { data: { id: 'victim', label: '被害人 (報案中心)' } }
                ],
                style: [
                    {
                        selector: 'node',
                        style: {
                            'background-color': '#007bff',
                            'label': 'data(label)',
                            'color': '#333',
                            'font-size': '12px',
                            'text-valign': 'bottom',
                            'text-margin-y': '5px',
                            'width': '40px',
                            'height': '40px'
                        }
                    },
                    {
                        selector: 'node[id="victim"]',
                        style: {
                            'background-color': '#28a745',
                            'shape': 'star',
                            'width': '50px',
                            'height': '50px'
                        }
                    },
                    {
                        selector: 'edge',
                        style: {
                            'width': 2,
                            'line-color': '#ccc',
                            'target-arrow-color': '#ccc',
                            'target-arrow-shape': 'triangle',
                            'curve-style': 'bezier',
                            'label': 'data(amount)',
                            'font-size': '10px',
                            'text-rotation': 'autorotate',
                            'text-margin-y': '-10px'
                        }
                    }
                ],
                layout: {
                    name: 'breadthfirst',
                    directed: true,
                    padding: 10
                }
            });

            if (caseWallets && caseWallets.length > 0) {
                const firstSuspect = caseWallets[0].address;
                cy.add([
                    { group: 'nodes', data: { id: firstSuspect, label: firstSuspect.substring(0,10)+'...' } },
                    { group: 'edges', data: { id: 'e1', source: 'victim', target: firstSuspect, amount: '匯款' } }
                ]);
                cy.layout({ name: 'breadthfirst', directed: true }).run();
            }
            
            // 畫布互動綁定：點擊節點
                        // 畫布互動綁定：點擊節點
            cy.on('tap', 'node', async function(evt){
                var node = evt.target;
                
                document.getElementById('tabApiTxs')?.click();
                
                const panelNodeProfile = document.getElementById('panelNodeProfile');
                if (panelNodeProfile) panelNodeProfile.style.display = 'block';
                
                if(node.id() === 'victim') {
                    if(document.getElementById('panelNodeAddress')) document.getElementById('panelNodeAddress').textContent = "報案中心 / 被害人";
                    if(document.getElementById('panelNodeAct')) document.getElementById('panelNodeAct').textContent = "N/A";
                    if(document.getElementById('panelNodeGas')) document.getElementById('panelNodeGas').textContent = "N/A";
                    if(document.getElementById('panelNodeApprove')) document.getElementById('panelNodeApprove').textContent = "N/A";
                    if(document.getElementById('panelNodeTxs')) document.getElementById('panelNodeTxs').innerHTML = "<div style='text-align:center; padding: 20px; color: #888;'>此為系統虛擬節點。<br>請點擊下方畫布中的真實錢包地址，進行 API 資料調閱。</div>";
                    return;
                }

                const address = node.id();
                if(document.getElementById('panelNodeAddress')) document.getElementById('panelNodeAddress').textContent = address;
                if(document.getElementById('panelNodeAct')) document.getElementById('panelNodeAct').textContent = "掃描中...";
                if(document.getElementById('panelNodeGas')) document.getElementById('panelNodeGas').textContent = "掃描中...";
                if(document.getElementById('panelNodeApprove')) document.getElementById('panelNodeApprove').textContent = "掃描中...";
                if(document.getElementById('panelNodeTxs')) document.getElementById('panelNodeTxs').innerHTML = "<div style='text-align:center; padding: 20px; color: #888;'>正在向區塊鏈節點調閱歷史交易紀錄...<br>⏳</div>";

                try {
                    const apiObj = window.electronAPI || window.api;
                    if (!currentLumenApiKeys || !currentLumenApiKeys.etherscan) {
                        throw new Error("請先在設定中綁定 Etherscan API Key。");
                    }
                    
                    const result = await apiObj.analyzeWallet({
                        provider: 'etherscan',
                        address: address,
                        apiKeys: currentLumenApiKeys
                    });

                    if (result.success && result.profile) {
                        const p = result.profile;
                        if(document.getElementById('panelNodeAct')) document.getElementById('panelNodeAct').textContent = p.activation_time;
                        if(document.getElementById('panelNodeGas')) document.getElementById('panelNodeGas').textContent = p.top_gas_source;
                        
                        const approveEl = document.getElementById('panelNodeApprove');
                        if(approveEl) {
                            approveEl.textContent = p.approvals_count;
                            if (p.approvals_count > 0) {
                                approveEl.style.color = '#dc3545';
                                approveEl.style.fontWeight = 'bold';
                            } else {
                                approveEl.style.color = '#333';
                                approveEl.style.fontWeight = 'normal';
                            }
                        }

                        // 渲染真實交易清單 (供勾選)
                        // 我們這裡先利用剛剛獲取的分析結果，呼叫 fetchTransactions 獲取詳細清單
                        const txResult = await apiObj.fetchTransactions({
                            provider: 'etherscan',
                            address: address,
                            apiKeys: currentLumenApiKeys
                        });

                        if (txResult.success && txResult.transactions) {
                            let txHtml = '<div style="margin-bottom: 10px; font-weight: bold; color: #28a745;">總計發現 ' + txResult.transactions.length + ' 筆最新交易</div>';
                            
                            txResult.transactions.forEach(tx => {
                                const date = new Date(tx.timeStamp * 1000);
                                const timeStr = `${date.getFullYear()}/${(date.getMonth()+1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                                const val = (parseFloat(tx.value) / 1e18).toFixed(4);
                                const isOut = tx.from.toLowerCase() === address.toLowerCase();
                                const directionIcon = isOut ? '📤 出金' : '📥 入金';
                                const color = isOut ? '#dc3545' : '#28a745';
                                const counterpart = isOut ? tx.to : tx.from;
                                
                                txHtml += `
                                <div style="border: 1px solid #eee; padding: 8px; margin-bottom: 5px; border-radius: 4px; display: flex; flex-direction: column; background-color: #fff;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                                        <span style="font-weight: bold; color: ${color};">${directionIcon} ${val} ETH</span>
                                        <button class="button" style="padding: 3px 8px; font-size: 0.8em; background-color: #007bff;" onclick="window.addToGraph('${counterpart}', '${val} ETH', ${isOut})">➕ 加入畫布</button>
                                    </div>
                                    <div style="font-family: monospace; font-size: 0.9em; color: #555;">對手: ${counterpart.substring(0,16)}...</div>
                                    <div style="font-size: 0.8em; color: #888;">📅 ${timeStr}</div>
                                </div>`;
                            });
                            
                            document.getElementById('panelNodeTxs').innerHTML = txHtml;
                        } else {
                            document.getElementById('panelNodeTxs').innerHTML = "<div style='color: red;'>獲取交易明細失敗: " + txResult.message + "</div>";
                        }

                    } else {
                        throw new Error(result.message);
                    }
                } catch(e) {
                    console.error(e);
                    if(document.getElementById('panelNodeTxs')) {
                        document.getElementById('panelNodeTxs').innerHTML = `<div style='text-align:center; padding: 20px; color: red;'>連線失敗。<br>${e.message}</div>`;
                    }
                }
            });

            // 全域函數：讓動態產生的按鈕可以呼叫，將新節點加入畫布
            window.addToGraph = function(targetAddr, amount, isOut) {
                if(!cy) return;
                const sourceNode = document.getElementById('panelNodeAddress').textContent;
                
                // 檢查節點是否已存在
                if(cy.getElementById(targetAddr).length === 0) {
                    cy.add({ group: 'nodes', data: { id: targetAddr, label: targetAddr.substring(0,10)+'...' } });
                }
                
                // 決定連線方向
                const edgeId = 'e_' + Date.now();
                let edgeData;
                if(isOut) {
                    edgeData = { id: edgeId, source: sourceNode, target: targetAddr, amount: amount };
                } else {
                    edgeData = { id: edgeId, source: targetAddr, target: sourceNode, amount: amount };
                }
                
                cy.add({ group: 'edges', data: edgeData });
                
                // 重新排版
                cy.layout({ name: 'breadthfirst', directed: true, padding: 10 }).run();
            };

        }

        

        function populateReconciliation() {
            const container = document.getElementById('reconciliationList');
            if (!container) return;
            container.innerHTML = '';

            if (caseTransactions.length === 0) {
                container.innerHTML = '<div style="text-align: center; color: #aaa; font-size: 0.9em; padding: 20px;">尚無被害人交易紀錄</div>';
                return;
            }

            caseTransactions.forEach((tx, i) => {
                const card = document.createElement('div');
                card.style.cssText = 'border: 1px solid #eee; border-radius: 4px; background: #fff; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.05);';
                card.innerHTML = `
                    <div style="display: flex;">
                        <div style="flex: 1; padding: 10px; border-bottom: 1px dashed #eee;">
                            <div style="font-size: 0.8em; color: #888; margin-bottom: 5px; font-weight: bold; display:flex; justify-content: space-between;"><span>報案陳述 (UI 6)</span> <span style="color:#d32f2f;">💰 ${tx.crypto} ${tx.coin}</span></div>
                            <div style="font-size: 0.85em; margin-bottom: 3px;">📅 ${tx.date} ${tx.time}</div>
                            <div style="font-size: 0.8em; font-family: monospace; color: #555; word-break: break-all;">To: ${tx.to}</div>
                        </div>
                        <div style="flex: 1; padding: 10px; background-color: #f8f9fa;">
                            <div style="font-size: 0.8em; color: #888; margin-bottom: 5px; font-weight: bold;">鏈上真實 (API 比對)</div>
                            <div style="font-size: 0.85em; color: #aaa; font-style: italic; display: flex; align-items: center; justify-content: center; height: 30px;">⏳ 尚未在畫布中發現相符交易</div>
                        </div>
                    </div>
                    <div style="padding: 5px 10px; background-color: #f1f3f5; border-top: 1px solid #eee; text-align: center; font-size: 0.8em; color: #666;">
                        狀態: 🟡 等待探索加入畫布
                    </div>
                `;
                container.appendChild(card);
            });
        }



        // UI 6 -> 系統內部案件庫存檔
        document.getElementById('btnSaveCaseToFile')?.addEventListener('click', async () => {
            const btn = document.getElementById('btnSaveCaseToFile');
            btn.disabled = true;
            btn.textContent = "儲存中...";
            
            try {
                // 嘗試從 headerCaseInfo 提取案名 (格式為：案件: xxx | 調查單位: ...)
                let cName = "未命名案件";
                const headerText = document.getElementById('headerCaseInfo')?.textContent || "";
                if(headerText.includes("案件: ")) {
                    cName = headerText.split("案件: ")[1].split(" |")[0];
                }

                const data = {
                    caseId: currentActiveCaseId, // 若有載入舊案，則覆寫。若無，後端會自動生成新 ID
                    caseName: cName,
                    headerCaseInfo: headerText,
                    headerTimeInfo: document.getElementById('headerTimeInfo')?.textContent || "未知時間",
                    wsInvestigatorInfo: document.getElementById('wsInvestigatorInfo')?.textContent || "未知調查員",
                    caseSummary: document.getElementById('wsCaseSummary')?.value || "",
                    caseWallets: caseWallets || [],
                    caseTransactions: caseTransactions || [],
                    version: "1.1"
                };
                
                const apiObj = window.electronAPI || api;
                const res = await apiObj.saveCaseInternal(data);
                
                if(res && res.success) {
                    currentActiveCaseId = res.caseId; // 更新目前為已儲存的 ID
                    alert("✅ 案件已成功更新並儲存至系統資料庫！");
                } else if (res && res.message) {
                    alert("儲存失敗: " + res.message);
                }
            } catch(e) {
                console.error(e);
                alert("發生內部錯誤: " + e.message);
            } finally {
                btn.disabled = false;
                btn.textContent = "💾 存入資料庫";
            }
        });


        // --- 案件登錄邏輯 (建立證據鏈) ---
        const btnStartCase = document.getElementById('startCaseButton');
        if (btnStartCase) {
            btnStartCase.addEventListener('click', () => {
                try {
                    const unit = document.getElementById('investigatorUnit')?.value.trim() || '';
                    const name = document.getElementById('investigatorName')?.value.trim() || '';
                    const caseName = document.getElementById('caseId')?.value.trim() || '';
                    const target = document.getElementById('initialTarget')?.value.trim() || '';
                    const caseSetupError = document.getElementById('caseSetupError');

                    if (!unit || !name || !caseName) {
                        if(caseSetupError) caseSetupError.classList.remove('hidden');
                        return;
                    }
                    
                    if(caseSetupError) caseSetupError.classList.add('hidden');

                    const now = new Date();
                    const timeString = `${now.getFullYear()}/${(now.getMonth()+1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

                    const hci = document.getElementById('headerCaseInfo');
                    if(hci) hci.textContent = `案件: ${caseName} | 調查單位: ${unit} | 調查員: ${name}`;
                    
                    const hti = document.getElementById('headerTimeInfo');
                    if(hti) hti.textContent = `立案時間: ${timeString}`;
                    
                    const wsii = document.getElementById('wsInvestigatorInfo');
                    if(wsii) wsii.textContent = `調查員: ${unit} | ${name}`;

                    // **絕對強制** 隱藏紅畫面並顯示 UI 6
                    document.getElementById('screenCaseSetup').classList.add('hidden');
                    document.getElementById('screenCaseWorkspace').classList.remove('hidden');

                    if (target) {
                        const wsWalletAddr = document.getElementById('wsWalletAddr');
                        if(wsWalletAddr) wsWalletAddr.value = target;
                    }
                } catch (err) {
                    alert("建立案件失敗: " + err.message);
                    console.error(err);
                }
            });
        }