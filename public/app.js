// WTF Cosmos JS - 前端应用脚本
// 全局状态
let blockchainStats = {};
let updateInterval = null;

// 初始化页面
document.addEventListener('DOMContentLoaded', function() {
    loadStats();
    loadLatestBlocks();
    setupTransferForm();
    
    // 每5秒更新一次状态
    updateInterval = setInterval(loadStats, 5000);
});

// 加载区块链统计信息
async function loadStats() {
    try {
        const response = await fetch('/api');
        const data = await response.json();
        
        blockchainStats = data.blockchain || {};
        
        document.getElementById('blockHeight').textContent = blockchainStats.height || 0;
        document.getElementById('pendingTx').textContent = blockchainStats.pendingTransactions || 0;
        document.getElementById('totalSupply').textContent = (blockchainStats.totalSupply || 0).toLocaleString();
        
        // 获取挖矿状态
        const miningResponse = await fetch('/api/mining/status');
        const miningData = await miningResponse.json();
        document.getElementById('miningStatus').textContent = miningData.isMining ? '挖矿中' : '空闲';
    } catch (error) {
        console.error('加载统计信息失败:', error);
    }
}

// 初始化区块链
async function initializeBlockchain() {
    showNotification('区块链已初始化', 'success');
    loadStats();
}

// 显示API文档
function showAPIDoc() {
    window.open('/api', '_blank');
}

// 创建钱包
async function createWallet() {
    try {
        const response = await fetch('/api/wallets', { method: 'POST' });
        const wallet = await response.json();
        
        const walletInfo = `
            地址: ${wallet.address}
            私钥: ${wallet.privateKey}
            公钥: ${wallet.publicKey}
            助记词: ${wallet.mnemonic}
        `;
        console.log(JSON.stringify(walletInfo))
        alert('新钱包创建成功!\n\n' + walletInfo + '\n\n请安全保存私钥！');
    } catch (error) {
        showNotification('创建钱包失败: ' + error.message, 'error');
    }
}

// 查询余额
async function checkBalance() {
    const address = document.getElementById('balanceAddress').value;
    if (!address) {
        showNotification('请输入地址', 'error');
        return;
    }

    try {
        const response = await fetch(`/api/wallets/${address}/balance`);
        const data = await response.json();
        
        document.getElementById('balanceResult').textContent = `余额: ${data.balance} WTF`;
    } catch (error) {
        document.getElementById('balanceResult').textContent = '查询失败';
        showNotification('查询余额失败: ' + error.message, 'error');
    }
}

// 设置转账表单
function setupTransferForm() {
    document.getElementById('transferForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const fromAddress = document.getElementById('fromAddress').value;
        const toAddress = document.getElementById('toAddress').value;
        const amount = parseFloat(document.getElementById('amount').value);
        const privateKey = document.getElementById('privateKey').value;
        
        if (!fromAddress || !toAddress || !amount || !privateKey) {
            showNotification('请填写所有字段', 'error');
            return;
        }
        
        try {
            const response = await fetch('/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fromAddress,
                    toAddress,
                    amount,
                    privateKey
                })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                showNotification('交易创建成功!', 'success');
                document.getElementById('transferForm').reset();
                loadStats();
            } else {
                showNotification('交易失败: ' + result.message, 'error');
            }
        } catch (error) {
            showNotification('交易失败: ' + error.message, 'error');
        }
    });
}

// 开始挖矿
async function startMining() {
    const minerAddress = document.getElementById('minerAddress').value;
    if (!minerAddress) {
        showNotification('请输入矿工地址', 'error');
        return;
    }

    try {
        const response = await fetch('/api/mining/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ minerAddress })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showNotification('开始挖矿', 'success');
            document.getElementById('miningInfo').innerHTML = `
                <p>矿工: ${minerAddress}</p>
                <p>状态: 挖矿中...</p>
            `;
        } else {
            showNotification('挖矿失败2: ' + result.message, 'error');
        }
    } catch (error) {
        showNotification('挖矿失败3: ' + error.message, 'error');
    }
}

// 停止挖矿
async function stopMining() {
    try {
        const response = await fetch('/api/mining/stop', { method: 'POST' });
        const result = await response.json();
        
        if (response.ok) {
            showNotification('停止挖矿', 'success');
            document.getElementById('miningInfo').innerHTML = '<p>状态: 空闲</p>';
        } else {
            showNotification('停止挖矿失败: ' + result.message, 'error');
        }
    } catch (error) {
        showNotification('停止挖矿失败: ' + error.message, 'error');
    }
}

// 加载最新区块
async function loadLatestBlocks() {
    try {
        const response = await fetch('/api/blockchain/blocks?limit=5');
        const data = await response.json();
        
        const blocksContainer = document.getElementById('latestBlocks');
        blocksContainer.innerHTML = '';
        
        data.blocks.forEach(block => {
            const blockElement = document.createElement('div');
            blockElement.className = 'p-3 bg-white bg-opacity-10 rounded border border-gray-300';
            blockElement.innerHTML = `
                <div class="flex justify-between items-center">
                    <span class="font-semibold">区块 #${block.index}</span>
                    <span class="text-sm text-gray-300">${new Date(block.timestamp).toLocaleString()}</span>
                </div>
                <div class="text-sm text-gray-300 mt-1">
                    哈希: ${block.hash.substring(0, 16)}...
                    | 交易数: ${block.transactions.length}
                </div>
            `;
            blocksContainer.appendChild(blockElement);
        });
    } catch (error) {
        console.error('加载区块失败:', error);
    }
}

// 显示通知
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notificationText');
    
    notificationText.textContent = message;
    
    // 设置颜色
    notification.className = 'fixed top-4 right-4 p-4 rounded-lg shadow-lg';
    if (type === 'success') {
        notification.classList.add('bg-green-600');
    } else if (type === 'error') {
        notification.classList.add('bg-red-600');
    } else {
        notification.classList.add('bg-blue-600');
    }
    
    notification.classList.remove('hidden');
    
    // 3秒后隐藏
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
}

// 将函数暴露到全局作用域，以便HTML中的onclick事件处理器可以访问
window.initializeBlockchain = initializeBlockchain;
window.showAPIDoc = showAPIDoc;
window.createWallet = createWallet;
window.checkBalance = checkBalance;
window.startMining = startMining;
window.stopMining = stopMining;
window.loadLatestBlocks = loadLatestBlocks;