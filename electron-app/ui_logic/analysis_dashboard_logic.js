// ui_logic/analysis_dashboard_logic.js

const api = window.electronAPI; // Assuming electronAPI is globally available

let cy; // Cytoscape instance, kept local to this logic file

// Global functions that might be called from within the HTML or from other logic files
// These need to be explicitly exposed to `window` if they are to be called from the HTML directly
window.initGraph = function() {
    if (cy) {
        cy.destroy();
    }
    
    const cyContainer = document.getElementById('cy');
    const cyPlaceholder = document.getElementById('cyPlaceholder');
    if(!cyContainer) return;
    if(cyPlaceholder) cyPlaceholder.style.display = 'none';

    if(typeof cytoscape !== 'function') {
        console.error("Cytoscape is not loaded! Check script tags in index.html.");
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

    if (window.caseWallets && window.caseWallets.length > 0) {
        const firstSuspect = window.caseWallets[0].address;
        cy.add([
            { group: 'nodes', data: { id: firstSuspect, label: firstSuspect.substring(0,10)+'...' } },
            { group: 'edges', data: { id: 'e1', source: 'victim', target: firstSuspect, amount: '匯款' } }
        ]);
        cy.layout({ name: 'breadthfirst', directed: true }).run();
    }
    
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
            const apiObj = window.electronAPI || api;
            if (!window.currentLumenApiKeys || !window.currentLumenApiKeys.etherscan) {
                throw new Error("請先在設定中綁定 Etherscan API Key。");
            }
            
            const result = await apiObj.analyzeWallet({
                provider: 'etherscan',
                address: address,
                apiKeys: window.currentLumenApiKeys
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
                    apiKeys: window.currentLumenApiKeys
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

    // Global function: allows dynamically generated buttons to call it to add new nodes to the graph
    window.addToGraph = function(targetAddr, amount, isOut) {
        if(!cy) return;
        const sourceNode = document.getElementById('panelNodeAddress').textContent;
        
        // Check if node already exists
        if(cy.getElementById(targetAddr).length === 0) {
            cy.add({ group: 'nodes', data: { id: targetAddr, label: targetAddr.substring(0,10)+'...' } });
        }
        
        // Determine connection direction
        const edgeId = 'e_' + Date.now();
        let edgeData;
        if(isOut) {
            edgeData = { id: edgeId, source: sourceNode, target: targetAddr, amount: amount };
        } else {
            edgeData = { id: edgeId, source: targetAddr, target: sourceNode, amount: amount };
        }
        
        cy.add({ group: 'edges', data: edgeData });
        
        // Re-layout
        cy.layout({ name: 'breadthfirst', directed: true, padding: 10 }).run();
    };
};

window.populateReconciliation = function() {
    const container = document.getElementById('reconciliationList');
    if (!container) return;
    container.innerHTML = '';

    if (window.caseTransactions.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #aaa; font-size: 0.9em; padding: 20px;">尚無被害人交易紀錄</div>';
        return;
    }

    window.caseTransactions.forEach((tx, i) => {
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
};

document.addEventListener('DOMContentLoaded', () => {
    const btnSaveCase = document.getElementById('btnSaveCase');
    if (btnSaveCase) {
        btnSaveCase.addEventListener('click', () => {
            try {
                if (window.caseWallets.length === 0 && window.caseTransactions.length === 0) {
                    if(!confirm("您尚未輸入任何錢包或交易紀錄，確定要直接進入畫布嗎？")) return;
                }
                
                if (typeof loadScreen === 'function') {
                    loadScreen('analysis_dashboard', () => {
                        const caseInfoEl = document.getElementById('ui7CaseInfo');
                        if (caseInfoEl && window.caseHeaderInfo) {
                            caseInfoEl.textContent = window.caseHeaderInfo;
                        }
                        
                        if(typeof window.initGraph === 'function') {
                            window.initGraph();
                        } else {
                            console.error("initGraph function is missing from global scope!");
                        }
                        
                        if(typeof window.populateReconciliation === 'function') {
                            window.populateReconciliation();
                        } else {
                            console.error("populateReconciliation function is missing from global scope!");
                        }

                        // Activate the first tab on load
                        const tabApiTxs = document.getElementById('tabApiTxs');
                        if (tabApiTxs) tabApiTxs.click();
                    });
                } else {
                    console.error('loadScreen function not found in analysis_dashboard_logic.js');
                }
            } catch (err) {
                alert("切換畫面時發生嚴重錯誤: " + err.message);
                console.error(err);
            }
        });
    }

    const btnBackToUi6 = document.getElementById('btnBackToUi6');
    if (btnBackToUi6) {
        btnBackToUi6.addEventListener('click', () => {
            if (typeof loadScreen === 'function') {
                loadScreen('case_workspace', () => {
                    // Re-populate data in case_workspace if needed
                    if (window.caseSummary && document.getElementById('wsCaseSummary')) {
                        document.getElementById('wsCaseSummary').value = window.caseSummary;
                    }
                    if (window.caseHeaderInfo && document.getElementById('headerCaseInfo')) {
                        document.getElementById('headerCaseInfo').textContent = window.caseHeaderInfo;
                    }
                    if (window.caseTimeInfo && document.getElementById('headerTimeInfo')) {
                        document.getElementById('headerTimeInfo').textContent = window.caseTimeInfo;
                    }
                    if (window.investigatorInfo && document.getElementById('wsInvestigatorInfo')) {
                        document.getElementById('wsInvestigatorInfo').textContent = window.investigatorInfo;
                    }

                    if (typeof window.renderWalletTable === 'function') window.renderWalletTable();
                    if (typeof window.renderTxTable === 'function') window.renderTxTable();
                });
            } else {
                console.error('loadScreen function not found in analysis_dashboard_logic.js');
            }
        });
    }

    // --- UI 7: Tabs Logic (Green Box) ---
    const tabApiTxs = document.getElementById('tabApiTxs');
    if (tabApiTxs) {
        tabApiTxs.addEventListener('click', function() {
            this.style.color = '#fff';
            this.style.backgroundColor = '#27ae60';
            
            const tabVictim = document.getElementById('tabVictimTxs');
            if (tabVictim) {
                tabVictim.style.color = '#666';
                tabVictim.style.backgroundColor = '#e9ecef';
            }
            
            const contentApiTxs = document.getElementById('contentApiTxs');
            if (contentApiTxs) contentApiTxs.style.display = 'block';
            const contentVictimTxs = document.getElementById('contentVictimTxs');
            if (contentVictimTxs) contentVictimTxs.style.display = 'none';
        });
    }

    const tabVictimTxs = document.getElementById('tabVictimTxs');
    if (tabVictimTxs) {
        tabVictimTxs.addEventListener('click', function() {
            this.style.color = '#fff';
            this.style.backgroundColor = '#27ae60';
            
            const tabApi = document.getElementById('tabApiTxs');
            if (tabApi) {
                tabApi.style.color = '#666';
                tabApi.style.backgroundColor = '#e9ecef';
            }
            
            const contentApiTxs = document.getElementById('contentApiTxs');
            if (contentApiTxs) contentApiTxs.style.display = 'none';
            const contentVictimTxs = document.getElementById('contentVictimTxs');
            if (contentVictimTxs) contentVictimTxs.style.display = 'block';
        });
    }

    // Tool buttons logic
    const toolFitGraph = document.getElementById('toolFitGraph');
    if (toolFitGraph) {
        toolFitGraph.addEventListener('click', () => {
            if (cy) cy.fit();
        });
    }

    const toolLayoutGraph = document.getElementById('toolLayoutGraph');
    if (toolLayoutGraph) {
        toolLayoutGraph.addEventListener('click', () => {
            if (cy) cy.layout({ name: 'breadthfirst', directed: true, padding: 10 }).run();
        });
    }

    const filterDustTxs = document.getElementById('filterDustTxs');
    if (filterDustTxs) {
        filterDustTxs.addEventListener('change', (e) => {
            const checked = e.target.checked;
            // Logic to filter dust transactions on graph
            // This would interact with the 'cy' instance and potentially its elements data
            console.log("Filter dust transactions: ", checked);
            alert("[開發中] 隱藏微小交易功能：" + (checked ? "啟用" : "停用"));
        });
    }

    const toolExportPng = document.getElementById('toolExportPng');
    if (toolExportPng) {
        toolExportPng.addEventListener('click', async () => {
            if (cy) {
                const png = cy.png({
                    output: 'blob',
                    scale: 2, // Export at 2x resolution
                    full: true // Export the full graph, not just the viewport
                });
                const filename = `LumenTracker_Graph_${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
                const res = await api.saveFile(png, filename, 'image/png');
                if (res.success) {
                    alert("✅ 畫布快照已成功匯出！");
                } else {
                    alert("匯出失敗: " + res.message);
                }
            } else {
                alert("畫布尚未初始化，無法匯出。");
            }
        });
    }

    const toggleEvidencePanel = document.getElementById('toggleEvidencePanel');
    if (toggleEvidencePanel) {
        toggleEvidencePanel.addEventListener('click', () => {
            const panel = document.getElementById('evidencePanel');
            if (panel) {
                const isCollapsed = panel.style.width === '50px';
                panel.style.width = isCollapsed ? '400px' : '50px';
                toggleEvidencePanel.textContent = isCollapsed ? '▶' : '◀';
                const content = document.getElementById('evidencePanelContent');
                if (content) content.style.display = isCollapsed ? 'block' : 'none';
            }
        });
    }
});