// ui_logic/api_setup_logic.js

const api = window.electronAPI; // Assuming electronAPI is globally available

document.addEventListener('DOMContentLoaded', () => {
    const btnBackToPwdSetup = document.getElementById('btnBackToPwdSetup');
    if (btnBackToPwdSetup) {
        btnBackToPwdSetup.addEventListener('click', () => {
            if (typeof loadScreen === 'function') {
                loadScreen('password_setup');
            } else {
                console.error('loadScreen function not found in api_setup_logic.js');
            }
        });
    }

    // --- API Testing Logic ---
    const btnTestEtherscan = document.getElementById('btnTestEtherscan');
    if (btnTestEtherscan) {
        btnTestEtherscan.addEventListener('click', async () => {
            const key = document.getElementById('inputEtherscanKey')?.value.trim();
            const resEl = document.getElementById('resEtherscan');
            if (resEl) {
                resEl.textContent = '測試中...';
                resEl.className = 'test-result';
            }
            if (!api) { console.error("Electron API not available."); return; }
            const res = await api.testApiKey({ provider: 'etherscan', apiKey: key });
            if (resEl) {
                resEl.textContent = res.message;
                resEl.className = res.success ? 'test-result success-message' : 'test-result error-message';
            }
        });
    }

    const btnTestTronscan = document.getElementById('btnTestTronscan');
    if (btnTestTronscan) {
        btnTestTronscan.addEventListener('click', async () => {
            const key = document.getElementById('inputTronscanKey')?.value.trim();
            const resEl = document.getElementById('resTronscan');
            if (resEl) {
                resEl.textContent = '測試中...';
                resEl.className = 'test-result';
            }
            if (!api) { console.error("Electron API not available."); return; }
            const res = await api.testApiKey({ provider: 'tronscan', apiKey: key });
            if (resEl) {
                resEl.textContent = res.message;
                resEl.className = res.success ? 'test-result success-message' : 'test-result error-message';
            }
        });
    }

    // --- UI 4 to UI 5 (Finish Setup) ---
    const btnFinishSetup = document.getElementById('btnFinishSetup');
    if (btnFinishSetup) {
        btnFinishSetup.addEventListener('click', async () => {
            const eKey = document.getElementById('inputEtherscanKey')?.value.trim();
            const tKey = document.getElementById('inputTronscanKey')?.value.trim();
            const errEl = document.getElementById('errApiSetup');
            
            if (!eKey && !tKey) {
                if (errEl) {
                    errEl.textContent = "請至少輸入一個 API Key 才能繼續。";
                    errEl.classList.remove('hidden');
                }
                return;
            }

            const apiKeys = {};
            if (eKey) apiKeys.etherscan = eKey;
            if (tKey) apiKeys.tronscan = tKey;

            const btn = document.getElementById('btnFinishSetup');
            if (btn) {
                btn.disabled = true;
                btn.textContent = "加密設定中...";
            }

            try {
                // Assuming tempUserProfile, tempPassword are global variables managed by renderer.js
                const res = await api.setupSystem({
                    userProfile: window.tempUserProfile,
                    masterPassword: window.tempPassword,
                    apiKeys: apiKeys
                });

                if (res.success) {
                    window.currentUserProfile = window.tempUserProfile;
                    window.currentLumenApiKeys = apiKeys;
                    
                    // Setup done, move to UI 5 (Case Hub)
                    if (typeof loadScreen === 'function') {
                        loadScreen('case_hub', () => {
                            const displayHubUserName = document.getElementById('displayHubUserName');
                            if (displayHubUserName) {
                                displayHubUserName.textContent = `${window.currentUserProfile.unit} - ${window.currentUserProfile.title} ${window.currentUserProfile.name}`;
                            }
                        });
                    } else {
                        console.error('loadScreen function not found in api_setup_logic.js');
                    }
                    
                    // Clear memory
                    window.tempPassword = '';
                    const inputNewPwd = document.getElementById('inputNewPwd');
                    if (inputNewPwd) inputNewPwd.value = '';
                    const inputConfirmPwd = document.getElementById('inputConfirmPwd');
                    if (inputConfirmPwd) inputConfirmPwd.value = '';

                } else {
                    if (errEl) {
                        errEl.textContent = `儲存失敗: ${res.message}`;
                        errEl.classList.remove('hidden');
                    }
                }
            } catch(e) {
                console.error(e);
                if (errEl) {
                    errEl.textContent = "內部錯誤，無法儲存。";
                    errEl.classList.remove('hidden');
                }
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = "完成設定並加密儲存";
                }
            }
        });
    }
});