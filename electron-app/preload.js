const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    checkSystemStatus: () => ipcRenderer.invoke('check-system-status'),
    setupSystem: (data) => ipcRenderer.invoke('setup-system', data),
    loginSystem: (password) => ipcRenderer.invoke('login-system', password),
    testApiKey: (data) => ipcRenderer.invoke('test-api-key', data),
    fetchTransactions: (data) => ipcRenderer.invoke('fetch-transactions', data),
    analyzeWallet: (data) => ipcRenderer.invoke('analyze-wallet', data)
});