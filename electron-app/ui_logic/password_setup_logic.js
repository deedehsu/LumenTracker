// ui_logic/password_setup_logic.js

const btnBackToUserSetup = document.getElementById('btnBackToUserSetup');
if (btnBackToUserSetup) {
    btnBackToUserSetup.addEventListener('click', () => {
        if (typeof loadScreen === 'function') {
            loadScreen('user_setup');
        } else {
            console.error('loadScreen function not found in password_setup_logic.js');
        }
    });
}

const btnNextToApiSetup = document.getElementById('btnNextToApiSetup');
if (btnNextToApiSetup) {
    btnNextToApiSetup.addEventListener('click', () => {
        const p1 = document.getElementById('inputNewPwd')?.value;
        const p2 = document.getElementById('inputConfirmPwd')?.value;
        const errEl = document.getElementById('errPwdSetup');

        if (!p1 || p1 !== p2) {
            if (errEl) errEl.classList.remove('hidden');
            return;
        }

        if (errEl) errEl.classList.add('hidden');

        // Assuming tempPassword and loadScreen are available globally or passed via a global manager
        window.tempPassword = p1;

        if (typeof loadScreen === 'function') {
            loadScreen('api_setup');
        } else {
            console.error('loadScreen function not found in password_setup_logic.js');
        }
    });
}