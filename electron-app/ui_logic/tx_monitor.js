// /Users/deede/LumenTracker/electron-app/ui_logic/tx_monitor.js

// This file provides transaction monitoring functionality with ARRJ compliance (Error Handling and ISO Timestamps).

const api = window.electronAPI; // Assuming electronAPI is globally available

document.addEventListener('DOMContentLoaded', () => {
    const startMonitorButton = document.getElementById('btnStartTxMonitor');
    const monitorOutput = document.getElementById('txMonitorOutput');

    if (startMonitorButton) {
        startMonitorButton.addEventListener('click', async () => {
            if (monitorOutput) {
                monitorOutput.innerHTML = '<p>開始監控交易...</p>';
            }

            try {
                const walletAddress = document.getElementById('monitorWalletAddress')?.value.trim();

                if (!walletAddress) {
                    if (monitorOutput) {
                        monitorOutput.innerHTML += '<p style="color: red;">錯誤：請輸入要監控的錢包地址。</p>';
                    }
                    return;
                }

                if (monitorOutput) {
                    monitorOutput.innerHTML += `<p>監控地址: ${walletAddress}</p>`;
                }

                // Simulate fetching transactions (replace with actual API call later)
                const simulatedTransactions = [
                    { from: "0xabc...123", to: walletAddress, value: "100 USDT", timestamp: new Date().toISOString() },
                    { from: "0xdef...456", to: walletAddress, value: "0.5 ETH", timestamp: new Date(Date.now() - 60000).toISOString() }, // 1 minute ago
                    { from: walletAddress, to: "0xghi...789", value: "50 USDT", timestamp: new Date(Date.now() - 120000).toISOString() } // 2 minutes ago
                ];

                // Display simulated transactions with ISO timestamp
                simulatedTransactions.forEach(tx => {
                    if (monitorOutput) {
                        monitorOutput.innerHTML += `
                            <div style="border-bottom: 1px dashed #ccc; padding: 5px 0;">
                                <strong>時間:</strong> ${tx.timestamp}<br>
                                <strong>From:</strong> ${tx.from} | <strong>To:</strong> ${tx.to} | <strong>Value:</strong> ${tx.value}
                            </div>
                        `;
                    }
                });

                if (monitorOutput) {
                    monitorOutput.innerHTML += '<p style="color: green;">監控完成：所有交易已載入並包含時間戳記。</p>';
                }

            } catch (error) {
                console.error("交易監控錯誤:", error);
                if (monitorOutput) {
                    monitorOutput.innerHTML += `<p style="color: red;">監控過程中發生錯誤：${error.message}</p>`;
                }
            }
        });
    }
});