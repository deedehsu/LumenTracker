const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// API: 向幣安免費公開端點查詢歷史價格 (無須金鑰)
app.get('/api/history/price', async (req, res) => {
    const { symbol, date } = req.query; // symbol: 'USDT', date: '2026-03-24'
    
    if (!symbol || !date) {
        return res.status(400).json({ error: 'Missing symbol or date' });
    }

    try {
        // 為了取得法幣對價，幣安常用的是 BTCUSDT, ETHUSDT 等交易對
        // 若使用者查詢的是 USDT，我們回傳 1 (或者抓取 USDT/TWD 匯率，但幣安目前主推 USDT，所以這裡示範查詢 BTC 和 ETH 對 USDT)
        // 注意：實務上，法官看的匯率通常是「美金對台幣 (銀行匯率)」加上「虛擬幣對美金 (CMC/Binance)」。
        // 為了 MVP 簡化，我們假設調查員在介面上輸入的幣種是 BTC 或 ETH。
        
        let binanceSymbol = `${symbol.toUpperCase()}USDT`;
        
        // 若是查詢 USDT，直接回傳固定值或另外打匯率 API (此處為防呆教學用)
        if (symbol.toUpperCase() === 'USDT') {
            return res.json({ 
                symbol: 'USDT', 
                average: 31.5, // 模擬美金台幣匯率
                source: 'system-mock' 
            });
        }

        const targetDate = new Date(`${date}T00:00:00Z`);
        const startTime = targetDate.getTime();
        const endTime = startTime + 86400000 - 1; // 該日最後一毫秒

        // 呼叫幣安 API (interval=1d 日線)
        const response = await axios.get(`https://api.binance.com/api/v3/klines`, {
            params: {
                symbol: binanceSymbol,
                interval: '1d',
                startTime: startTime,
                endTime: endTime
            }
        });

        if (response.data && response.data.length > 0) {
            const kline = response.data[0];
            const high = parseFloat(kline[2]);
            const low = parseFloat(kline[3]);
            const average = (high + low) / 2;
            
            res.json({
                symbol,
                date,
                high,
                low,
                average,
                source: 'binance'
            });
        } else {
            res.status(404).json({ error: '無該日期的交易資料' });
        }
    } catch (error) {
        console.error("API Error:", error.message);
        res.status(500).json({ error: '無法連接報價伺服器' });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`本地證據保全伺服器運行於 http://localhost:${PORT}`);
});