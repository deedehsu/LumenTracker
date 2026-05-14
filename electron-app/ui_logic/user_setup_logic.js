// ui_logic/user_setup_logic.js

document.addEventListener('DOMContentLoaded', () => {
    console.log('[user_setup_logic.js] DOMContentLoaded - UI 2 loaded.');

    const btnBackToWelcome = document.getElementById('btnBackToWelcome');
    if (btnBackToWelcome) {
        btnBackToWelcome.addEventListener('click', () => {
            console.log('[user_setup_logic.js] Back to Welcome button clicked.');
            if (typeof loadScreen === 'function') {
                loadScreen('welcome');
            } else {
                console.error('loadScreen function not found in user_setup_logic.js');
            }
        });
    }

    const btnNextToPwdSetup = document.getElementById('btnNextToPwdSetup');
    if (btnNextToPwdSetup) {
        btnNextToPwdSetup.addEventListener('click', () => {
            console.log('[user_setup_logic.js] Next to Password Setup button clicked.');
            const unit = document.getElementById('inputUnit')?.value.trim();
            const title = document.getElementById('inputTitle')?.value.trim();
            const name = document.getElementById('inputName')?.value.trim();
            const phone = document.getElementById('inputPhone')?.value.trim();
            const email = document.getElementById('inputEmail')?.value.trim();
            const errEl = document.getElementById('errUserSetup');

            console.log(`[user_setup_logic.js] Input values: Unit='${unit}', Title='${title}', Name='${name}', Phone='${phone}', Email='${email}'`);

            if (!unit || !title || !name || !phone) {
                if (errEl) {
                    errEl.classList.remove('hidden');
                    alert('請填寫所有必填欄位！'); // Force alert for debugging
                }
                console.warn('[user_setup_logic.js] Validation failed: Missing required fields.');
                return;
            }
            
            if (errEl) errEl.classList.add('hidden');

            // Assuming tempUserProfile and loadScreen are available globally or passed via a global manager
            window.tempUserProfile = { unit, title, name, phone, email };
            console.log('[user_setup_logic.js] User profile temporarily stored:', window.tempUserProfile);
            
            if (typeof loadScreen === 'function') {
                console.log('[user_setup_logic.js] Calling loadScreen for password_setup...');
                loadScreen('password_setup', () => {
                    console.log('[user_setup_logic.js] password_setup screen loaded callback executed.');
                    const displaySetupUserName = document.getElementById('displaySetupUserName');
                    if (displaySetupUserName) {
                        displaySetupUserName.textContent = `${title} ${name} (帳號: ${phone})`;
                    }
                    const inputNewPwd = document.getElementById('inputNewPwd');
                    if (inputNewPwd) inputNewPwd.focus();
                });
            } else {
                console.error('loadScreen function not found in user_setup_logic.js');
                alert('內部錯誤：loadScreen 功能缺失。一種可能情況為 electron-app/renderer.js 載入失敗。');
            }
        });
    }
});
