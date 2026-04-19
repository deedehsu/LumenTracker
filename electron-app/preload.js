
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    saveApiKey: (data) => ipcRenderer.invoke('save-api-key', data),
    getApiKey: (masterPassword) => ipcRenderer.invoke('get-api-key', masterPassword),
    isApiKeyConfigured: () => ipcRenderer.invoke('is-api-key-configured'),
    testApiKey: (apiKey) => ipcRenderer.invoke('test-api-key', apiKey),
    // 未來可以添加更多需要從渲染進程調用主進程的功能
});
