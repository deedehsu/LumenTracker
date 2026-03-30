require('dotenv').config({ path: '/Users/deede/.openclaw/workspace/.env' });
const https = require('https');

const apiKey = process.env.CMC_API_KEY;
// 測試取得 USDT 昨天的歷史價格 (使用 quotes/historical)
const req = https.get('https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/historical?symbol=USDT&time_start=2026-03-24&count=1', {
    headers: { 'X-CMC_PRO_API_KEY': apiKey }
}, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log(`狀態碼: ${res.statusCode}`);
        console.log(data);
    });
});
req.on('error', (e) => console.error(e));