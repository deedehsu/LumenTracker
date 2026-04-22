
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');

let store;

// --- 加密與解密模組 ---
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;
const DIGEST = 'sha256';

function deriveKey(password, salt) {
    return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST);
}

function encrypt(text, masterPassword) {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = deriveKey(masterPassword, salt);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    return salt.toString('hex') + ':' + iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text, masterPassword) {
    const textParts = text.split(':');
    if (textParts.length !== 3) throw new Error('Invalid encrypted data format');
    
    const salt = Buffer.from(textParts[0], 'hex');
    const iv = Buffer.from(textParts[1], 'hex');
    const encryptedText = Buffer.from(textParts[2], 'hex');
    
    const key = deriveKey(masterPassword, salt);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString();
}

// --- API 測試模組 ---

async function testEtherscanApiKey(apiKey) {
    if (!apiKey || apiKey.length < 20) return { success: false, message: 'API Key 格式不正確或過短。' };
    try {
        const response = await axios.get('https://api.etherscan.io/v2/api', {
            params: {
                chainid: 1, module: 'account', action: 'balance',
                address: '0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae',
                tag: 'latest', apikey: apiKey
            }
        });
        if (response.data?.status === '1' && response.data?.message === 'OK') {
            return { success: true, message: 'Etherscan API Key 連線測試成功！' };
        } else if (response.data?.status === '0') {
            return { success: false, message: `測試失敗: ${response.data.result}` };
        }
        return { success: false, message: '收到未預期的 Etherscan API 響應格式。' };
    } catch (error) {
        return { success: false, message: `連線測試失敗: ${error.message}` };
    }
}

async function testTronscanApiKey(apiKey) {
    if (!apiKey || apiKey.length < 20) return { success: false, message: 'API Key 格式不正確或過短。' };
    try {
        const response = await axios.get('https://apilist.tronscanapi.com/api/accountv2', {
            params: { address: 'TE2RzoSV3wFK99w6J9UnnZ4vLfXYoxvRwP' }, // Tether USDT Contract Address as test target
            headers: { 'TRON-PRO-API-KEY': apiKey }
        });
        
        // Tronscan API successful response check (basic heuristic)
        if (response.data && response.data.address) {
             return { success: true, message: 'Tronscan API Key 連線測試成功！' };
        }
        return { success: false, message: '收到未預期的 Tronscan API 響應格式。' };
    } catch (error) {
        // Tronscan usually returns 401/403 for invalid keys
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            return { success: false, message: '測試失敗: 無效的 Tronscan API Key 或權限不足。' };
        }
        return { success: false, message: `連線測試失敗: ${error.message}` };
    }
}


async function fetchTronscanTransactions(apiKey, address) {
    const TRONSCAN_API_URL = 'https://apilist.tronscanapi.com/api/transaction';
    try {
        const response = await axios.get(TRONSCAN_API_URL, {
            params: {
                sort: '-timestamp',
                count: true,
                limit: 50,
                start: 0,
                address: address
            },
            headers: { 'TRON-PRO-API-KEY': apiKey }
        });

        if (response.data && response.data.data) {
            return { success: true, transactions: response.data.data, provider: 'tronscan' };
        }
        return { success: false, message: '收到未預期的 Tronscan API 響應格式。' };

    } catch (error) {
        console.error('Error fetching Tronscan transactions:', error.message);
        return { success: false, message: `查詢失敗 (網路或伺服器錯誤): ${error.message}` };
    }
}

// --- API 查詢模組 (核心分析功能) ---

async function fetchEtherscanTransactions(apiKey, address) {
    const ETHERSCAN_API_URL = 'https://api.etherscan.io/v2/api';
    try {
        const response = await axios.get(ETHERSCAN_API_URL, {
            params: {
                chainid: 1, // 預設 Ethereum Mainnet
                module: 'account',
                action: 'txlist',
                address: address,
                startblock: 0,
                endblock: 99999999,
                page: 1,
                offset: 50, // 預設抓取最新的 50 筆
                sort: 'desc',
                apikey: apiKey
            }
        });

        if (response.data?.status === '1' && response.data?.message === 'OK') {
            // Etherscan 回傳的交易列表在 result 陣列中
            return { success: true, transactions: response.data.result };
        } else if (response.data?.status === '0') {
            return { success: false, message: `查詢失敗: ${response.data.result}` };
        }
        return { success: false, message: '收到未預期的 Etherscan API 響應格式。' };

    } catch (error) {
        console.error('Error fetching Etherscan transactions:', error.message);
        return { success: false, message: `查詢失敗 (網路或伺服器錯誤): ${error.message}` };
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
      webSecurity: false 
    },
  });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  // mainWindow.webContents.openDevTools(); // 關閉強制開啟，解決 Windows 焦點問題
}

app.whenReady().then(async () => {
  try {
      const { default: Store } = await import('electron-store');
      store = new Store();
      console.log('electron-store initialized successfully.');

      // --- IPC 處理器 ---

      ipcMain.handle('save-api-keys', async (event, { apiKeys, masterPassword }) => {
          try {
              if (!store) throw new Error('Store is not initialized.');
              // apiKeys 預期是一個物件，例如 { etherscan: 'key1', tronscan: 'key2' }
              const dataString = JSON.stringify(apiKeys);
              const encryptedData = encrypt(dataString, masterPassword);
              store.set('encryptedApiKeys', encryptedData);
              store.set('apiKeysConfigured', true);
              return { success: true };
          } catch (error) {
              console.error('Failed to save API Keys:', error);
              return { success: false, message: error.message };
          }
      });

      ipcMain.handle('get-api-keys', async (event, masterPassword) => {
          try {
              if (!store) throw new Error('Store is not initialized.');
              const encryptedData = store.get('encryptedApiKeys');
              if (!encryptedData) return { success: false, message: 'No API Keys configured.' };
              
              const decryptedString = decrypt(encryptedData, masterPassword);
              const apiKeys = JSON.parse(decryptedString);
              return { success: true, apiKeys };
          } catch (error) {
              console.error('Failed to retrieve API Keys:', error);
              return { success: false, message: 'Failed to decrypt API Keys. Incorrect password or corrupted data.' };
          }
      });

      ipcMain.handle('is-api-keys-configured', async () => {
          if (!store) return false;
          return store.get('apiKeysConfigured', false);
      });

      ipcMain.handle('test-api-key', async (event, { provider, apiKey }) => {
          if (provider === 'etherscan') return testEtherscanApiKey(apiKey);
          if (provider === 'tronscan') return testTronscanApiKey(apiKey);
          return { success: false, message: `Unsupported provider: ${provider}` };
      });

      ipcMain.handle('fetch-transactions', async (event, { provider, address, apiKeys }) => {
          // apiKeys 是從前端解密後傳過來的 { etherscan: '...', tronscan: '...' }
          if (provider === 'etherscan') {
              if (!apiKeys || !apiKeys.etherscan) return { success: false, message: '未配置 Etherscan API Key。' };
              return fetchEtherscanTransactions(apiKeys.etherscan, address);
          }
          
          if (provider === 'tronscan') {
              if (!apiKeys || !apiKeys.tronscan) return { success: false, message: '未配置 Tronscan API Key。' };
              return fetchTronscanTransactions(apiKeys.tronscan, address);
          }
          
          return { success: false, message: `尚未支援 ${provider} 的查詢。` };
      });

      createWindow();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
      });

  } catch (error) {
      console.error('Failed to initialize application:', error);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
