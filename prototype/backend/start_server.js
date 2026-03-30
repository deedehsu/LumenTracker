const { exec } = require('child_process');
const path = require('path');

const serverPath = path.join(__dirname, 'server.js');
console.log(`正在啟動本地伺服器: ${serverPath}`);

const child = exec(`node ${serverPath}`);

child.stdout.on('data', (data) => {
    console.log(`伺服器訊息: ${data}`);
});

child.stderr.on('data', (data) => {
    console.error(`伺服器錯誤: ${data}`);
});

child.on('close', (code) => {
    console.log(`伺服器已關閉，退出碼 ${code}`);
});

// 保持這個啟動腳本運行，以免伺服器被砍掉
setInterval(() => {}, 1000);