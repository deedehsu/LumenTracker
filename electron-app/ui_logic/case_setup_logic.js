// ui_logic/case_setup_logic.js

document.addEventListener('DOMContentLoaded', () => {
    const btnStartCase = document.getElementById('startCaseButton');
    if (btnStartCase) {
        btnStartCase.addEventListener('click', () => {
            try {
                const unit = document.getElementById('investigatorUnit')?.value.trim() || '';
                const name = document.getElementById('investigatorName')?.value.trim() || '';
                const caseName = document.getElementById('caseId')?.value.trim() || '';
                const target = document.getElementById('initialTarget')?.value.trim() || '';
                const caseSetupError = document.getElementById('caseSetupError');

                if (!unit || !name || !caseName) {
                    if(caseSetupError) caseSetupError.classList.remove('hidden');
                    return;
                }
                
                if(caseSetupError) caseSetupError.classList.add('hidden');

                const now = new Date();
                const timeString = `${now.getFullYear()}/${(now.getMonth()+1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

                // Assuming currentActiveCaseId, caseWallets, caseTransactions, currentUserProfile are global/managed by renderer.js
                // These will be properly managed by a UI manager or shared state later.
                window.currentActiveCaseId = null; // For new case
                window.caseWallets = [];
                window.caseTransactions = [];

                // Update headers in the next screen (Case Workspace)
                window.caseHeaderInfo = `案件: ${caseName} | 調查單位: ${unit} | 調查員: ${name}`;
                window.caseTimeInfo = `立案時間: ${timeString}`;
                window.investigatorInfo = `調查員: ${unit} | ${name}`;

                if (typeof loadScreen === 'function') {
                    loadScreen('case_workspace', () => {
                        const hci = document.getElementById('headerCaseInfo');
                        if(hci) hci.textContent = window.caseHeaderInfo;
                        
                        const hti = document.getElementById('headerTimeInfo');
                        if(hti) hti.textContent = window.caseTimeInfo;
                        
                        const wsii = document.getElementById('wsInvestigatorInfo');
                        if(wsii) wsii.textContent = window.investigatorInfo;
                        
                        if (target) {
                            const wsWalletAddr = document.getElementById('wsWalletAddr');
                            if(wsWalletAddr) wsWalletAddr.value = target;
                        }
                    });
                } else {
                    console.error('loadScreen function not found in case_setup_logic.js');
                }
            } catch (err) {
                alert("建立案件失敗: " + err.message);
                console.error(err);
            }
        });
    }
});