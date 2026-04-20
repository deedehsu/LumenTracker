
const { app, BrowserWindow, ipcMain } = require('electron'); // 移除 contextBridge
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');

let store; // 將 store 聲明為全局變量，但延遲初始化

// 加密和解密函數
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // For AES, this is always 16
const SALT_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits
const ITERATIONS = 100000;
const DIGEST = 'sha256';

// 使用 PBKDF2 進行更安全的金鑰衍生
function deriveKey(password, salt) {
    return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST);
}

function encrypt(text, masterPassword) {
    // 生成隨機鹽
    const salt = crypto.randomBytes(SALT_LENGTH);
    // 衍生加密金鑰
    const key = deriveKey(masterPassword, salt);
    // 生成隨機 IV
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    // 將 salt, iv, 和加密數據組合儲存，格式為: salt:iv:encryptedData
    return salt.toString('hex') + ':' + iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text, masterPassword) {
    const textParts = text.split(':');
    if (textParts.length !== 3) {
        throw new Error('Invalid encrypted data format');
    }
    
    const salt = Buffer.from(textParts[0], 'hex');
    const iv = Buffer.from(textParts[1], 'hex');
    const encryptedText = Buffer.from(textParts[2], 'hex');
    
    // 重新衍生相同的金鑰
    const key = deriveKey(masterPassword, salt);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString();
}

// Etherscan API Key 有效性測試函數 (強化版驗證 - 遷移至 V2)
async function testEtherscanApiKey(apiKey) {
    const ETHERSCAN_API_URL = 'https://api.etherscan.io/v2/api';
    
    // 基本格式驗證：Etherscan API Key 通常是 34 個字元的英數字
    if (!apiKey || apiKey.length < 20) {
        return { success: false, message: 'API Key 格式不正確或過短。' };
    }

    try {
        // 使用 account 模組的 balance action 進行測試，這通常需要更嚴格的 API 驗證
        const response = await axios.get(ETHERSCAN_API_URL, {
            params: {
                chainid: 1, // Etherscan V2 必須指定 chainid，1 代表 Ethereum Mainnet
                module: 'account',
                action: 'balance',
                address: '0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae', // 任意一個有效的以太坊地址
                tag: 'latest',
                apikey: apiKey
            }
        });

        // 嚴格檢查 Etherscan 的標準 JSON 響應格式
        if (response.data) {
            if (response.data.status === '1' && response.data.message === 'OK') {
                return { success: true, message: 'Etherscan API Key 連線測試成功！' };
            } else if (response.data.status === '0') {
                // Etherscan 明確回報錯誤 (例如 Invalid API Key)
                return { success: false, message: `測試失敗: ${response.data.result}` };
            }
        }
        
        return { success: false, message: '收到未預期的 Etherscan API 響應格式。' };

    } catch (error) {
        console.error('Error testing Etherscan API Key:', error.message);
        // 處理 HTTP 錯誤 (如 403 Forbidden, 網路斷線等)
        return { success: false, message: `連線測試失敗 (網路或伺服器錯誤): ${error.message}` };
    }
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      // 在開發階段允許 file:// 協議下的跨來源請求，解決 Windows 下 preload 無法載入的問題
      webSecurity: false 
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open the DevTools (強制開啟以利除錯)
  mainWindow.webContents.openDevTools();
}

app.whenReady().then(async () => {
  try {
      // 動態引入 electron-store 並初始化 store
      const { default: Store } = await import('electron-store');
      store = new Store();
      console.log('electron-store initialized successfully.');

      // 在 store 初始化後，註冊所有的 IPC 主進程處理器
      ipcMain.handle('save-api-key', async (event, { apiKey, masterPassword }) => {
          try {
              if (!store) throw new Error('Store is not initialized.');
              // 使用 PBKDF2 加密
              const encryptedApiKey = encrypt(apiKey, masterPassword);
              store.set('encryptedApiKey', encryptedApiKey);
              store.set('apiKeyConfigured', true);
              return { success: true };
          } catch (error) {
              console.error('Failed to save API Key:', error);
              return { success: false, message: error.message };
          }
      });

      ipcMain.handle('get-api-key', async (event, masterPassword) => {
          try {
              if (!store) throw new Error('Store is not initialized.');
              const encryptedApiKey = store.get('encryptedApiKey');
              if (!encryptedApiKey) {
                  return { success: false, message: 'No API Key configured.' };
              }
              // 使用 PBKDF2 解密
              const apiKey = decrypt(encryptedApiKey, masterPassword);
              return { success: true, apiKey };
          } catch (error) {
              console.error('Failed to retrieve API Key:', error);
              return { success: false, message: 'Failed to decrypt API Key. Incorrect password or corrupted data.' };
          }
      });

      ipcMain.handle('is-api-key-configured', async () => {
          if (!store) return false; // 防止在 store 初始化前被調用
          return store.get('apiKeyConfigured', false);
      });

      ipcMain.handle('test-api-key', async (event, apiKey) => {
          return testEtherscanApiKey(apiKey);
      });

      createWindow();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          createWindow();
        }
      });

  } catch (error) {
      console.error('Failed to initialize application:', error);
      // 在此處可以考慮優雅地退出應用或顯示一個致命錯誤視窗
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
