// ui_logic/login_logic.js

const api = window.electronAPI; // Assuming electronAPI is globally available

document.addEventListener('DOMContentLoaded', () => {
    const btnLogin = document.getElementById('btnLogin');
    if (btnLogin) {
        btnLogin.addEventListener('click', async () => {
            const pwd = document.getElementById('inputLoginPwd')?.value;
            const errEl = document.getElementById('errLogin');
            if(!pwd) return;

            const btn = document.getElementById('btnLogin');
            if (btn) {
                btn.disabled = true;
                btn.textContent = "解鎖中...";
            }

            try {
                const res = await api.loginSystem(pwd);
                if (res.success) {
                    // Update global state variables
                    window.currentUserProfile = res.userProfile;
                    window.currentLumenApiKeys = res.apiKeys || null;
                    
                    if (typeof loadScreen === 'function') {
                        loadScreen('case_hub', () => {
                            const displayHubUserName = document.getElementById('displayHubUserName');
                            if (displayHubUserName) {
                                displayHubUserName.textContent = `${window.currentUserProfile.unit} - ${window.currentUserProfile.title} ${window.currentUserProfile.name}`;
                            }
                        });
                    } else {
                        console.error('loadScreen function not found in login_logic.js');
                    }
                    
                    const inputLoginPwd = document.getElementById('inputLoginPwd');
                    if (inputLoginPwd) inputLoginPwd.value = '';
                } else {
                    if (errEl) {
                        errEl.textContent = res.message;
                        errEl.classList.remove('hidden');
                    }
                    const inputLoginPwd = document.getElementById('inputLoginPwd');
                    if (inputLoginPwd) {
                        inputLoginPwd.value = '';
                        inputLoginPwd.focus();
                    }
                }
            } catch(e) {
                console.error(e);
                if (errEl) {
                    errEl.textContent = "內部錯誤。";
                    errEl.classList.remove('hidden');
                }
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = "解鎖並進入系統";
                }
            }
        });
    }

    const inputLoginPwd = document.getElementById('inputLoginPwd');
    if (inputLoginPwd) {
        inputLoginPwd.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const btnLogin = document.getElementById('btnLogin');
                if (btnLogin) btnLogin.click();
            }
        });
    }
});