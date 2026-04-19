
const { app, BrowserWindow, ipcMain, contextBridge } = require('electron');
const path = require('path');
const Store = require('electron-store'); // 簡化引入方式，假設直接導出構造函數
const crypto = require('crypto');
const axios = require('axios');

// 移除 Debug: console.log(require('electron-store')) 等語句，因應用啟動過早崩潰

const store = new Store();

// 加密和解密函數
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // For AES, this is always 16

function encrypt(text, masterKey) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(masterKey, 'hex'), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text, masterKey) {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(masterKey, 'hex'), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

// Etherscan API Key 有效性測試函數
async function testEtherscanApiKey(apiKey) {
    const ETHERSCAN_API_URL = 'https://api.etherscan.io/api';
    try {
        const response = await axios.get(ETHERSCAN_API_URL, {
            params: {
                module: 'proxy',
                action: 'eth_blockNumber',
                apikey: apiKey
            }
        });

        if (response.data && response.data.error && response.data.error.message.includes('Invalid API Key')) {
            return { success: false, message: 'Invalid Etherscan API Key.' };
        }
        if (response.data && response.data.result) {
            return { success: true, message: 'Etherscan API Key is valid.' };
        }
        return { success: false, message: 'Unexpected Etherscan API response.' };

    } catch (error) {
        console.error('Error testing Etherscan API Key:', error.message);
        return { success: false, message: `Connection test failed: ${error.message}` };
    }
}

// IPC 主進程處理器
ipcMain.handle('save-api-key', async (event, { apiKey, masterPassword }) => {
    try {
        const masterKey = crypto.createHash('sha256').update(masterPassword).digest('hex');
        const encryptedApiKey = encrypt(apiKey, masterKey);
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
        const encryptedApiKey = store.get('encryptedApiKey');
        if (!encryptedApiKey) {
            return { success: false, message: 'No API Key configured.' };
        }
        const masterKey = crypto.createHash('sha256').update(masterPassword).digest('hex');
        const apiKey = decrypt(encryptedApiKey, masterKey);
        return { success: true, apiKey };
    } catch (error) {
        console.error('Failed to retrieve API Key:', error);
        return { success: false, message: 'Failed to decrypt API Key. Incorrect password or corrupted data.' };
    }
});

ipcMain.handle('is-api-key-configured', async () => {
    return store.get('apiKeyConfigured', false);
});

icpMain.handle('test-api-key', async (event, apiKey) => {
    return testEtherscanApiKey(apiKey);
});

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // 引入 preload 腳本
      nodeIntegration: false, // 禁用 Node.js 整合以提高安全性
      contextIsolation: true, // 啟用上下文隔離以提高安全性
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
