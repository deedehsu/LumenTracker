
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    saveApiKeys: (data) => ipcRenderer.invoke('save-api-keys', data),
    getApiKeys: (masterPassword) => ipcRenderer.invoke('get-api-keys', masterPassword),
    isApiKeysConfigured: () => ipcRenderer.invoke('is-api-keys-configured'),
    testApiKey: (data) => ipcRenderer.invoke('test-api-key', data),
    // 未來可以添加更多需要從渲染進程調用主進程的功能
});
