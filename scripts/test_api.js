require('dotenv').config({ path: '/Users/deede/.openclaw/workspace/.env' });
const https = require('https');

async function testCMC() {
    const apiKey = process.env.CMC_API_KEY;
    if (!apiKey) return "未設定";
    
    return new Promise((resolve) => {
        const req = https.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/map?limit=1', {
            headers: { 'X-CMC_PRO_API_KEY': apiKey }
        }, (res) => {
            if (res.statusCode === 200 || res.statusCode === 401 || res.statusCode === 403) {
                resolve(`狀態碼: ${res.statusCode} (${res.statusCode === 200 ? '✅ 成功' : '❌ 失敗'})`);
            } else {
                resolve(`狀態碼: ${res.statusCode}`);
            }
        });
        req.on('error', (e) => resolve(`錯誤: ${e.message}`));
    });
}

async function testTronscan() {
    const apiKey = process.env.TRONSCAN_API_KEY;
    if (!apiKey) return "未設定";
    
    return new Promise((resolve) => {
        // 隨機測試一個波場創世地址或大戶地址
        const req = https.get('https://apilist.tronscanapi.com/api/accountv2?address=TXLAQ63Xg1NDAD9x1AebB4xQdJjE2wS2L3', {
            headers: { 'TRON-PRO-API-KEY': apiKey }
        }, (res) => {
            if (res.statusCode === 200) {
                resolve(`狀態碼: ${res.statusCode} (✅ 成功)`);
            } else {
                resolve(`狀態碼: ${res.statusCode} (❌ 失敗)`);
            }
        });
        req.on('error', (e) => resolve(`錯誤: ${e.message}`));
    });
}

async function testEtherscan() {
    const apiKey = process.env.ETHERSCAN_API_KEY;
    if (!apiKey) return "未設定";
    
    return new Promise((resolve) => {
        // 查詢 0x0 地址的餘額
        const req = https.get(`https://api.etherscan.io/api?module=account&action=balance&address=0x0000000000000000000000000000000000000000&tag=latest&apikey=${apiKey}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.status === "1" || parsed.message === "OK") {
                        resolve(`狀態碼: ${res.statusCode} (✅ 成功)`);
                    } else {
                        resolve(`狀態碼: ${res.statusCode} (❌ 失敗: ${parsed.result || parsed.message})`);
                    }
                } catch(e) {
                    resolve(`狀態碼: ${res.statusCode}`);
                }
            });
        });
        req.on('error', (e) => resolve(`錯誤: ${e.message}`));
    });
}

async function runTests() {
    console.log("開始測試 API 連線...");
    console.log("-----------------------");
    
    const cmcResult = await testCMC();
    console.log(`[1] CoinMarketCap (CMC) API: ${cmcResult}`);
    
    const tronResult = await testTronscan();
    console.log(`[2] Tronscan API: ${tronResult}`);
    
    const etherResult = await testEtherscan();
    console.log(`[3] Etherscan API: ${etherResult}`);
    
    console.log("-----------------------");
}

runTests();