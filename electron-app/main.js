
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');
const crypto = require('crypto');

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

// IPC 主進程處理器
ipcMain.handle('save-api-key', async (event, { apiKey, masterPassword }) => {
    try {
        // 使用主密碼的 SHA256 哈希作為加密密鑰
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

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      // 注意: contextIsolation 通常建議為 true 以提高安全性，但為了簡化 nodeIntegration 示例，我們暫時設為 false。
      // 在生產環境中應詳細考慮預加載腳本 (preload script) 和 contextIsolation。
      nodeIntegration: true,
      contextIsolation: false,
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
