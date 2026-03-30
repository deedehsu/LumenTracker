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
    const note = document.getElementById('inputWalletNote').value.trim();

    if(!address) return;
    if(sessionState.caseInfo.wallets.find(w => w.address === address)) {
        alert("🚨 此地址已登記在案！");
        return;
    }

    sessionState.caseInfo.wallets.push({ address, tag, note });
    document.getElementById('inputWallet').value = ''; 
    document.getElementById('inputWalletTag').value = '';
    document.getElementById('inputWalletNote').value = '';
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
                ${w.note ? `<span class="text-xs text-gray-500 ml-2">📝 ${w.note}</span>` : ''}
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
// 介面 2-2：已知交易紀錄登記與匯率驗證
// ==============================

// 自動計算實際交易匯率
function calculateActualRate() {
    const amt = parseFloat(document.getElementById('txAmountTWD').value);
    const qty = parseFloat(document.getElementById('txQuantity').value);
    const actualInput = document.getElementById('txActualRate');
    
    if(!isNaN(amt) && !isNaN(qty) && qty !== 0) {
        actualInput.value = (amt / qty).toFixed(4);
    } else {
        actualInput.value = '';
    }
}
document.getElementById('txAmountTWD').addEventListener('input', calculateActualRate);
document.getElementById('txQuantity').addEventListener('input', calculateActualRate);

// 教學浮窗邏輯
document.getElementById('btnCloseMentor').addEventListener('click', () => {
    document.getElementById('mentorPopup').classList.add('hidden');
    document.getElementById('txUserRate').focus();
});
document.getElementById('btnUnderstand').addEventListener('click', () => {
    document.getElementById('mentorPopup').classList.add('hidden');
    document.getElementById('txUserRate').focus();
});

document.getElementById('btnAddTx').addEventListener('click', () => {
    const date = document.getElementById('txDate').value;
    const time = document.getElementById('txTime').value;
    const from = document.getElementById('txFrom').value.trim();
    const to = document.getElementById('txTo').value.trim();
    const amountTWD = parseFloat(document.getElementById('txAmountTWD').value);
    const coin = document.getElementById('txCoin').value.trim().toUpperCase() || 'USDT';
    const quantity = parseFloat(document.getElementById('txQuantity').value);
    
    const userRateInput = document.getElementById('txUserRate').value.trim();
    
    // 如果沒有填寫當日匯率，直接跳出導師教學浮窗
    if(!userRateInput) {
        document.getElementById('mentorPopup').classList.remove('hidden');
        return;
    }
    
    const userRate = parseFloat(userRateInput);

    if(!date || isNaN(amountTWD) || isNaN(quantity) || isNaN(userRate) || !coin) {
        alert("🚨 請填寫完整的交易日期、金額(TWD)、幣種、數量與您計算的當日匯率。");
        return;
    }

    const actualRate = (amountTWD / quantity).toFixed(4);

    // 系統模擬驗證邏輯 (純靜態測試版)
    let systemRate = 31.50; 
    if(coin === 'BTC') systemRate = 2000000;
    if(coin === 'ETH') systemRate = 100000;
    if(coin === 'TRX') systemRate = 3.5;

    const diff = Math.abs(userRate - systemRate) / systemRate;
    
    if (diff > 0.05) {
        alert(`🚨 驗證失敗！\n\n您輸入的匯率 (${userRate}) 與系統模擬的合理市價 (${systemRate}) 誤差超過 5%。\n\n(此為純靜態測試版，請輸入接近 ${systemRate} 的數字以通過防呆測試)`);
        return; // 拒絕新增
    }

    const tx = {
        date, time, from, to, amountTWD, coin, quantity, actualRate, userRate, 
        systemRate: systemRate.toFixed(2)
    };

    sessionState.caseInfo.transactions.push(tx);
    
    // 清空輸入
    document.getElementById('txAmountTWD').value = '';
    document.getElementById('txQuantity').value = '';
    document.getElementById('txUserRate').value = '';
    document.getElementById('txActualRate').value = '';

    renderTxList();
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
            <td class="p-2 bg-blue-50 font-bold text-blue-700">${tx.actualRate}</td>
            <td class="p-2 bg-red-50"><span class="text-green-600 font-bold" title="系統模擬底層查核通過">✅ ${tx.userRate}</span></td>
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
          "總計交易紀錄: " + sessionState.caseInfo.transactions.length + " 筆 (皆已通過模擬驗證)\n\n" +
          "下一步將進入【初勘室】進行各地址分析 (功能待整合)。");
});