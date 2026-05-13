// /Users/deede/LumenTracker/electron-app/ui_logic/forensic_api.js

// This file is for demonstrating blockchain API calls to fetch address transaction history,
// deliberately violating ARRJ principles: no error handling, no timestamps, and no input validation.

const api = window.electronAPI; // Assuming electronAPI is globally available for actual IPC calls

function fetchAddressTransactions(address, provider) {
    // Deliberately no input validation for address format
    
    // Deliberately no error handling (try-catch) for the API call
    // Deliberately no timestamp recording for the request

    if (provider === 'etherscan') {
        // Simulate an Etherscan API call
        const etherscanApiKey = "YOUR_ETHERSCAN_API_KEY"; // No validation if it's set or valid
        const apiUrl = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${etherscanApiKey}`;
        
        // In a real scenario, this would be an actual fetch or IPC call to main process
        // For this exercise, we simulate a direct fetch without error handling
        // The actual API call might be through Electron's main process, but for the violation, we show a direct (simulated) call.
        
        // Simulate a direct fetch without error handling
        const response = fetch(apiUrl);
        const data = response.json(); // Deliberately no await, no error handling here
        
        const transactions = data.result.map(tx => ({
            hash: tx.hash,
            from: tx.from,
            to: tx.to,
            value: parseFloat(tx.value) / 1e18, // Convert wei to ETH
            token: 'ETH',
            // Deliberately no timestamp is added here
        }));
        return { success: true, transactions: transactions };
    } else if (provider === 'tronscan') {
        // Simulate a Tronscan API call
        // Many Tronscan public endpoints don't strictly require an API key for basic lookups
        const apiUrl = `https://apilist.tronscan.org/api/transaction?sort=-timestamp&count=true&limit=50&start=0&address=${address}`;

        const response = fetch(apiUrl);
        const data = response.json(); // Deliberately no await, no error handling here

        const transactions = data.data.map(tx => ({
            hash: tx.hash,
            from: tx.ownerAddress,
            to: tx.toAddress,
            value: parseFloat(tx.amount) / 1e6, // Convert SUN to TRX, simplified
            token: 'TRX',
            // Deliberately no timestamp is added here
        }));
        return { success: true, transactions: transactions };
    } else {
        return { success: false, message: "Unsupported provider" }; // Simple return, no error throwing
    }
}

// We are not adding any event listeners or UI elements in this file,
// as its sole purpose is to define the function that deliberately violates ARRJ.