// ui_logic/welcome_logic.js

const btnNextToUserSetup = document.getElementById('btnNextToUserSetup');
if (btnNextToUserSetup) {
    btnNextToUserSetup.addEventListener('click', () => {
        // Assumes a global loadScreen function is available from renderer.js
        if (typeof loadScreen === 'function') {
            loadScreen('user_setup', () => {
                const inputName = document.getElementById('inputName'); // Corrected to inputName as per HTML
                if (inputName) inputName.focus();
            });
        } else {
            console.error('loadScreen function not found in welcome_logic.js');
        }
    });
}