// ============================================================================
// DASHBOARD & ANALYTICS ENGINE (assets/js/dashboard.js)
// ============================================================================

function renderDashboard() {
    const today = new Date().toISOString().split('T')[0];
    const todayTotal = salesHistory
        .filter(s => s.date.startsWith(today) && s.status !== 'VOID') // IGNORE VOID
        .reduce((acc, curr) => acc + curr.amt, 0);
        
    document.getElementById('dashTodaySales').innerText = "₹" + todayTotal.toLocaleString('en-IN');

    let totalDues = 0;
    const custIds = [...new Set(ledgerDB.map(l => l.phone))];
    custIds.forEach(phone => {
        const txs = ledgerDB.filter(l => l.phone === phone);
        let bal = 0;
        txs.forEach(t => { if(t.type === 'DEBIT') bal += t.amount; else bal -= t.amount; });
        if(bal > 0) totalDues += bal;
    });
    document.getElementById('dashTotalDues').innerText = "₹" + totalDues.toLocaleString('en-IN');
    
    const lowItems = Object.entries(productDB).filter(([k,v]) => (v.stock || 0) < 5).length;
    document.getElementById('dashLowStock').innerText = lowItems;
    
    const stockWidget = document.getElementById('widgetLowStock');
    if(stockWidget) {
        stockWidget.style.display = (systemConfig.enableLowStock !== false) ? 'block' : 'none';
    }
}

let salesChart = null;
let categoryChart = null;
let paymentChart = null;

function renderAnalytics() {
    let totalRevenue = 0;
    let totalCost = 0;
    salesHistory.forEach(s => {
        if(s.status === 'VOID') return;
        totalRevenue += s.amt;
        if(s.cost) totalCost += s.cost;
    });
    
    const profit = totalRevenue - totalCost;
    document.getElementById('analyticsProfit').innerText = "₹" + profit.toLocaleString('en-IN');
    
    const last30Days = {};
    const modes = {};
    
    const today = new Date();
    for(let i=29; i>=0; i--) {
        const d = new Date(); d.setDate(today.getDate() - i);
        last30Days[d.toISOString().split('T')[0]] = 0;
    }
    
    salesHistory.forEach(s => {
        if(s.status === 'VOID') return;
        const d = s.date.split('T')[0];
        if(last30Days[d] !== undefined) last30Days[d] += s.amt;
        const mode = s.paymentMode || 'Cash';
        modes[mode] = (modes[mode] || 0) + s.amt;
    });

    const ctxSales = document.getElementById('salesChart');
    if(ctxSales) {
        if(salesChart) salesChart.destroy();
        salesChart = new Chart(ctxSales.getContext('2d'), {
            type: 'line',
            data: { labels: Object.keys(last30Days).map(d => d.slice(5)), datasets: [{ label: 'Sales (₹)', data: Object.values(last30Days), borderColor: '#2563eb', tension: 0.3, fill: true, backgroundColor: 'rgba(37, 99, 235, 0.1)' }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    const ctxPay = document.getElementById('paymentChart');
    if(ctxPay) {
        if(paymentChart) paymentChart.destroy();
        paymentChart = new Chart(ctxPay.getContext('2d'), {
            type: 'doughnut',
            data: { labels: Object.keys(modes), datasets: [{ data: Object.values(modes), backgroundColor: ['#22c55e', '#3b82f6', '#f97316', '#a855f7', '#ef4444'] }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
    
    const ctxCat = document.getElementById('categoryChart');
    if(ctxCat) {
        if(categoryChart) categoryChart.destroy();
        categoryChart = new Chart(ctxCat.getContext('2d'), {
            type: 'bar',
            data: { labels: ['All Sales'], datasets: [{ label: 'Total Volume', data: [totalRevenue], backgroundColor: '#64748b' }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
}