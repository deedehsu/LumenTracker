let currentLumenApiKeys = null;
const api = window.electronAPI;

// State variables - these are global and managed by the main renderer process
let tempUserProfile = {};
let tempPassword = '';
let currentUserProfile = {};
let currentActiveCaseId = null;

// Ensure globals are set for UI logic files to access
window.currentLumenApiKeys = currentLumenApiKeys;
window.tempUserProfile = tempUserProfile;
window.tempPassword = tempPassword;
window.currentUserProfile = currentUserProfile;
window.currentActiveCaseId = currentActiveCaseId;

// Additional global state for Case Workspace (UI 6)
window.caseWallets = window.caseWallets || [];
window.caseTransactions = window.caseTransactions || [];
window.caseHeaderInfo = window.caseHeaderInfo || '';
window.caseTimeInfo = window.caseTimeInfo || '';
window.investigatorInfo = window.investigatorInfo || '';
window.caseSummary = window.caseSummary || '';

// Cytoscape instance placeholder - will be managed by analysis_dashboard_logic.js
let cy; 
window.cy = cy; // Expose globally if needed by specific elements or other modules

const uiScreensPath = './ui_screens/';
const uiLogicPath = './ui_logic/';

/**
 * Loads a UI screen by fetching its HTML and dynamically loading its associated JavaScript logic.
 * @param {string} screenName The base name of the screen (e.g., 'welcome', 'login').
 * @param {function} [callback] Optional callback function to execute after the screen and its logic are loaded.
 */
async function loadScreen(screenName, callback) {
    try {
        console.log(`[loadScreen] Attempting to load screen: ${screenName}`);
        // Remove any existing UI-specific script to prevent multiple bindings or memory leaks
        const oldLogicScript = document.getElementById('ui-logic-script');
        if (oldLogicScript) {
            oldLogicScript.remove();
            console.log('[loadScreen] Removed old UI logic script.');
        }

        // Fetch HTML content for the screen
        const response = await fetch(`${uiScreensPath}${screenName}.html`);
        if (!response.ok) {
            throw new Error(`Failed to load screen ${screenName}: ${response.statusText}`);
        }
        const html = await response.text();
        const mainContentArea = document.getElementById('main-content-area');
        if (mainContentArea) {
            mainContentArea.innerHTML = html;
            console.log(`[loadScreen] HTML loaded for screen: ${screenName}.`);

            // After content is loaded, find the root element (the first child) and show it
            const loadedScreenRoot = mainContentArea.firstElementChild;
            if (loadedScreenRoot) {
                loadedScreenRoot.classList.remove('hidden');
                // Force display to block to override !important if present
                loadedScreenRoot.style.display = 'block';
                console.log(`[loadScreen] Loaded screen root element found. Class 'hidden' removed, display set to 'block'.`);
            } else {
                console.warn(`[loadScreen] No first element child found for screen ${screenName}.`);
            }

            // Load UI-specific logic script
            const logicScript = document.createElement('script');
            logicScript.id = 'ui-logic-script';
            logicScript.src = `${uiLogicPath}${screenName}_logic.js`;
            logicScript.onload = () => {
                console.log(`[loadScreen] UI logic script loaded for screen: ${screenName}.`);
                // After logic is loaded, ensure global states are accessible within the new context
                window.currentLumenApiKeys = currentLumenApiKeys;
                window.tempUserProfile = tempUserProfile;
                window.tempPassword = tempPassword;
                window.currentUserProfile = currentUserProfile;
                window.currentActiveCaseId = currentActiveCaseId;
                
                // Call the provided callback if any
                if (callback && typeof callback === 'function') {
                    callback();
                }
            };
            logicScript.onerror = (e) => {
                console.error(`[loadScreen] Failed to load logic for ${screenName}:`, e);
                alert(`載入 ${screenName} 的邏輯失敗。請檢查控制台。`);
                if (callback && typeof callback === 'function') {
                    callback(); // Still call callback even if logic fails to load
                }
            };
            document.body.appendChild(logicScript);
        }
        // Hide any global error messages when switching screens
        document.querySelectorAll('.error-message').forEach(el => el.classList.add('hidden'));

    } catch (error) {
        console.error(`[loadScreen] Error loading screen ${screenName}:`, error);
        alert(`無法載入畫面：${screenName}.html。錯誤：${error.message}`);
    }
}

// Expose loadScreen globally for other UI logic files to use
window.loadScreen = loadScreen; 

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('[DOMContentLoaded] Checking system status...');
        const status = await api.checkSystemStatus();
        console.log('[DOMContentLoaded] System status:', status);

        if (status.success && status.systemConfigured) {
            console.log('[DOMContentLoaded] System configured. Loading login screen.');
            // Not first run -> Go to Login
            currentUserProfile = status.userProfile;
            window.currentUserProfile = currentUserProfile; // Update global
            loadScreen('login', () => {
                const displayLoginUserName = document.getElementById('displayLoginUserName');
                if (displayLoginUserName) {
                    displayLoginUserName.textContent = `${currentUserProfile.name} (帳號: ${currentUserProfile.phone})`;
                }
                const inputLoginPwd = document.getElementById('inputLoginPwd');
                if (inputLoginPwd) {
                    inputLoginPwd.focus();
                }
            });
        } else {
            console.log('[DOMContentLoaded] System not configured. Loading welcome screen.');
            // First run -> Go to Welcome
            loadScreen('welcome');
        }
    } catch(e) {
        console.error('[DOMContentLoaded] Init error:', e);
        alert(`應用程式初始化失敗：${e.message}。載入歡迎畫面。`);
        loadScreen('welcome');
    }
});
