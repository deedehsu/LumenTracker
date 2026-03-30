const https = require('https');

async function testBinanceKline() {
    // 測試幣安公開 API：取得 BTC/USDT 在 2026-03-24 的日 K 線資料 (不需 API Key)
    const symbol = 'BTCUSDT';
    const interval = '1d';
    // 將 2026-03-24 轉換為 Unix 毫秒時間戳
    const startTime = new Date('2026-03-24T00:00:00Z').getTime();
    const endTime = new Date('2026-03-24T23:59:59Z').getTime();

    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&startTime=${startTime}&endTime=${endTime}`;

    return new Promise((resolve) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        const kline = parsed[0];
                        const open = parseFloat(kline[1]);
                        const high = parseFloat(kline[2]);
                        const low = parseFloat(kline[3]);
                        const close = parseFloat(kline[4]);
                        const average = (high + low) / 2;
                        
                        resolve(`狀態碼: ${res.statusCode} (✅ 成功)
    日期: 2026-03-24
    最高價: ${high} USDT
    最低價: ${low} USDT
    計算平均: ${average} USDT`);
                    } else {
                        resolve(`狀態碼: ${res.statusCode} (❌ 未取得資料)`);
                    }
                } catch(e) {
                    resolve(`狀態碼: ${res.statusCode} (❌ 解析錯誤)`);
                }
            });
        }).on('error', (e) => resolve(`錯誤: ${e.message}`));
    });
}

testBinanceKline().then(console.log);