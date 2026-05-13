// ui_logic/user_setup_logic.js

document.addEventListener('DOMContentLoaded', () => {
    const btnBackToWelcome = document.getElementById('btnBackToWelcome');
    if (btnBackToWelcome) {
        btnBackToWelcome.addEventListener('click', () => {
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
            const unit = document.getElementById('inputUnit')?.value.trim();
            const title = document.getElementById('inputTitle')?.value.trim();
            const name = document.getElementById('inputName')?.value.trim();
            const phone = document.getElementById('inputPhone')?.value.trim();
            const email = document.getElementById('inputEmail')?.value.trim();
            const errEl = document.getElementById('errUserSetup');

            if (!unit || !title || !name || !phone) {
                if (errEl) errEl.classList.remove('hidden');
                return;
            }
            
            if (errEl) errEl.classList.add('hidden');

            // Assuming tempUserProfile and loadScreen are available globally or passed via a global manager
            window.tempUserProfile = { unit, title, name, phone, email };
            
            if (typeof loadScreen === 'function') {
                loadScreen('password_setup', () => {
                    const displaySetupUserName = document.getElementById('displaySetupUserName');
                    if (displaySetupUserName) {
                        displaySetupUserName.textContent = `${title} ${name} (帳號: ${phone})`;
                    }
                    const inputNewPwd = document.getElementById('inputNewPwd');
                    if (inputNewPwd) inputNewPwd.focus();
                });
            } else {
                console.error('loadScreen function not found in user_setup_logic.js');
            }
        });
    }
});