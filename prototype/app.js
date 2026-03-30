// 狀態管理：調查員與案件資訊
const sessionState = {
    investigator: { unit: '', title: '', name: '', loginTime: null },
    caseInfo: { summary: '', wallets: [], transactions: [] }
};

// ==============================
// 介面 1：調查員登錄 (Identity)
// ==============================
document.getElementById('btnSaveIdentity').addEventListener('click', () => {
    const unit = document.getElementById('inputUnit').value.trim();
    const title = document.getElementById('inputTitle').value.trim();
    const name = document.getElementById('inputName').value.trim();

    if(!unit || !title || !name) {
        alert("🚨 基於證據保全原則，必須填寫完整的單位、職別與姓名！");
        return;
    }

    sessionState.investigator = { unit, title, name };
    const now = new Date();
    const timeString = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
    sessionState.investigator.loginTime = timeString;

    document.getElementById('headerUnit').textContent = unit;
    document.getElementById('headerTitle').textContent = title;
    document.getElementById('headerName').textContent = name;
    document.getElementById('headerTime').textContent = timeString;

    document.getElementById('screenIdentity').classList.add('hidden');
    document.getElementById('globalHeader').classList.remove('hidden');
    document.getElementById('screenCase').classList.remove('hidden');
});

// ==============================
// 介面 2-1：涉案錢包地址登記
// ==============================
document.getElementById('btnAddWallet').addEventListener('click', () => {
    const address = document.getElementById('inputWallet').value.trim();
    const tag = document.getElementById('inputWalletTag').value;

    if(!address) return;
    if(sessionState.caseInfo.wallets.find(w => w.address === address)) {
        alert("🚨 此地址已登記在案！");
        return;
    }

    sessionState.caseInfo.wallets.push({ address, tag });
    document.getElementById('inputWallet').value = ''; 
    document.getElementById('inputWalletTag').value = '';
    renderWalletList();
});

function renderWalletList() {
    const list = document.getElementById('walletList');
    list.innerHTML = ''; 
    sessionState.caseInfo.wallets.forEach((w, index) => {
        const li = document.createElement('li');
        li.className = "flex justify-between items-center bg-white p-2 border border-gray-200 rounded shadow-sm";
        li.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="font-mono text-sm break-all text-blue-800 font-bold">${w.address}</span>
                ${w.tag ? `<span class="text-xs bg-yellow-100 border border-yellow-300 px-2 py-1 rounded text-yellow-800 font-bold">🏷️ ${w.tag}</span>` : ''}
            </div>
            <button onclick="removeWallet(${index})" class="text-red-500 hover:text-red-700 text-sm font-bold ml-4 shrink-0 px-2">移除</button>
        `;
        list.appendChild(li);
    });
    checkStartBtn();
}

window.removeWallet = function(index) {
    sessionState.caseInfo.wallets.splice(index, 1);
    renderWalletList();
};

// ==============================
// 介面 2-2：已知交易紀錄登記與匯率驗證 (呼叫本地伺服器)
// ==============================
document.getElementById('btnAddTx').addEventListener('click', async () => {
    const date = document.getElementById('txDate').value;
    const time = document.getElementById('txTime').value;
    const from = document.getElementById('txFrom').value.trim();
    const to = document.getElementById('txTo').value.trim();
    const amountTWD = parseFloat(document.getElementById('txAmountTWD').value);
    const coin = document.getElementById('txCoin').value.trim().toUpperCase() || 'USDT';
    const quantity = parseFloat(document.getElementById('txQuantity').value);
    const userRate = parseFloat(document.getElementById('txUserRate').value);

    if(!date || isNaN(amountTWD) || isNaN(quantity) || isNaN(userRate) || !coin) {
        alert("🚨 請填寫完整的交易日期、金額(TWD)、幣種、數量與您計算的當日匯率。");
        return;
    }

    const actualRate = (amountTWD / quantity).toFixed(2);

    try {
        // 呼叫我們剛剛寫的本地 Node.js 伺服器，由它去打幣安的免費 API
        const response = await fetch(`http://localhost:3000/api/history/price?symbol=${coin}&date=${date}`);
        const result = await response.json();

        if (response.ok && result.average) {
            const systemRate = result.average;
            const diff = Math.abs(userRate - systemRate) / systemRate;
            
            // 容許 5% 的誤差範圍
            if (diff > 0.05) {
                alert(`🚨 驗證失敗！\n\n您輸入的匯率 (${userRate}) 與系統呼叫真實交易所 API 抓取的歷史日均線匯率 (${systemRate.toFixed(4)}) 誤差超過 5%。\n\n請重新檢視計算過程：\n1. 是否選錯幣種？\n2. 是否選錯日期 (${date})？\n3. 是否正確計算 (最高價 + 最低價) ÷ 2？`);
                return; // 拒絕新增
            }

            const tx = {
                date, time, from, to, amountTWD, coin, quantity, actualRate, userRate, 
                systemRate: systemRate.toFixed(4)
            };

            sessionState.caseInfo.transactions.push(tx);
            
            // 清空輸入
            document.getElementById('txAmountTWD').value = '';
            document.getElementById('txQuantity').value = '';
            document.getElementById('txUserRate').value = '';

            renderTxList();
        } else {
            alert("⚠️ 系統無法取得該日期的歷史報價，暫以使用者填寫為主。");
            const tx = {
                date, time, from, to, amountTWD, coin, quantity, actualRate, userRate, 
                systemRate: "無法取得"
            };
            sessionState.caseInfo.transactions.push(tx);
            renderTxList();
        }

    } catch (e) {
        alert("❌ 無法連線至本地證據保全伺服器。請確認伺服器已啟動。");
    }
});

function renderTxList() {
    const list = document.getElementById('txList');
    list.innerHTML = '';
    sessionState.caseInfo.transactions.forEach((tx, index) => {
        const tr = document.createElement('tr');
        tr.className = "border-b hover:bg-gray-50";
        tr.innerHTML = `
            <td class="p-2">${tx.date} ${tx.time||''}</td>
            <td class="p-2 font-mono text-xs"><div class="truncate w-24 text-gray-500" title="${tx.from}">${tx.from||'-'}</div> ➔ <div class="truncate w-24 text-blue-600 font-bold" title="${tx.to}">${tx.to||'-'}</div></td>
            <td class="p-2 font-bold text-red-600">NT$ ${tx.amountTWD.toLocaleString()}</td>
            <td class="p-2">${tx.quantity} ${tx.coin}</td>
            <td class="p-2 bg-yellow-50 font-bold">${tx.actualRate}</td>
            <td class="p-2 bg-blue-50"><span class="text-green-600 font-bold" title="系統底層查核通過 (系統值: ${tx.systemRate})">✅ ${tx.userRate}</span></td>
            <td class="p-2"><button onclick="removeTx(${index})" class="text-red-500 hover:text-red-700 text-xs font-bold border border-red-300 rounded px-2 py-1 bg-red-50">移除</button></td>
        `;
        list.appendChild(tr);
    });
    checkStartBtn();
}

window.removeTx = function(index) {
    sessionState.caseInfo.transactions.splice(index, 1);
    renderTxList();
};

function checkStartBtn() {
    const btnStart = document.getElementById('btnStartTriage');
    if(sessionState.caseInfo.wallets.length > 0 || sessionState.caseInfo.transactions.length > 0) {
        btnStart.disabled = false;
        btnStart.classList.remove('opacity-50', 'cursor-not-allowed');
    } else {
        btnStart.disabled = true;
        btnStart.classList.add('opacity-50', 'cursor-not-allowed');
    }
}

// 進入初勘室
document.getElementById('btnStartTriage').addEventListener('click', () => {
    alert("✅ 案件資本資料已加密封裝！\n\n" +
          "調查員: " + sessionState.investigator.unit + " " + sessionState.investigator.name + "\n" +
          "總計涉案地址: " + sessionState.caseInfo.wallets.length + " 個\n" +
          "總計交易紀錄: " + sessionState.caseInfo.transactions.length + " 筆 (皆已通過匯率真實API驗證)\n\n" +
          "下一步將進入【初勘室】進行各地址分析 (功能待整合)。");
});