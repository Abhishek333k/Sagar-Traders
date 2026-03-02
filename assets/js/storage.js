// --- LOCAL STORAGE & REPAIR ---
function repairData(manual = false) {
    let salesFixed = 0, ledgerFixed = 0, removedEmpty = 0;
    
    if(salesHistory) {
        salesHistory = salesHistory.filter(s => s && typeof s === 'object').map(s => { 
            if (!s.id || typeof s.id !== 'string') { s.id = generateUUID(); salesFixed++; }
            if (!s.paymentMode) s.paymentMode = 'Cash'; 
            if (!s.cashier) s.cashier = 'Admin'; // Backwards compatibility
            return s; 
        });
    } else salesHistory = [];

    if(ledgerDB) {
        const initialLen = ledgerDB.length;
        ledgerDB = ledgerDB.filter(l => l && typeof l === 'object' && l.phone); 
        removedEmpty = initialLen - ledgerDB.length;
        
        ledgerDB = ledgerDB.map(l => { 
            if (!l.id || l.id === 'undefined') { l.id = generateUUID(); ledgerFixed++; }
            if (!l.timestamp) l.timestamp = Date.now(); 
            if (!l.cashier) l.cashier = 'Admin'; // Backwards compatibility
            return l; 
        });
    } else ledgerDB = [];

    if(manual) showToast(`DB Check: Fixed ${salesFixed} sales, ${ledgerFixed} ledger, Removed ${removedEmpty} invalid.`, 'success');
    else saveData();
}

function regenerateAllIds() {
    verifyPin(() => {
        if(!confirm("Regenerate all IDs?")) return;
        let count = 0;
        if(ledgerDB) ledgerDB.forEach(l => { l.id = generateUUID(); count++; });
        if(salesHistory) salesHistory.forEach(s => { s.id = generateUUID(); count++; });
        saveData(); showToast(`Fixed ${count} IDs. Reloading...`, 'success'); setTimeout(() => location.reload(), 1500);
    });
}

function restoreData() {
    const file = document.getElementById('restoreFile').files[0]; 
    if(!file) return;
    
    showLoading(true, "Restoring System Data...");
    const r = new FileReader(); 
    r.onload = e => { 
        try {
            const d = JSON.parse(e.target.result); 
            if(d.products) productDB = d.products;
            if(d.customers) customerDB = d.customers;
            if(d.sales) salesHistory = d.sales;
            if(d.ledger) ledgerDB = d.ledger;
            if(d.held) heldCarts = d.held; 
            if(d.config) systemConfig = { ...systemConfig, ...d.config }; 
            
            saveData(); showLoading(false); alert("✅ Restore Complete! System will reload."); location.reload();
        } catch(err) {
            showLoading(false); showToast("Corrupt Backup File", "error"); console.error(err);
        }
    }; 
    r.readAsText(file);
}