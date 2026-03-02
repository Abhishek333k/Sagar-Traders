// ============================================================================
// DATA STORAGE, BACKUP & RECOVERY ENGINE (assets/js/storage.js)
// ============================================================================

function repairData(manual = false) {
    let salesFixed = 0, ledgerFixed = 0, removedEmpty = 0;
    
    if(salesHistory) {
        salesHistory = salesHistory.filter(s => s && typeof s === 'object').map(s => { 
            if (!s.id || typeof s.id !== 'string') { s.id = generateUUID(); salesFixed++; }
            if (!s.paymentMode) s.paymentMode = 'Cash'; 
            if (!s.cashier) s.cashier = 'Admin'; 
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
            if (!l.cashier) l.cashier = 'Admin'; 
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

function backupData(type) {
    systemConfig.lastBackup = Date.now(); 
    saveSystemSettings(); // Persist the new backup timestamp
    
    const data = { date: new Date().toISOString() };
    
    // Core Data
    if(type.match(/full|products/)) data.products = productDB;
    if(type.match(/full|customers/)) data.customers = customerDB;
    if(type.match(/full|sales/)) { data.sales = salesHistory; data.held = heldCarts; }
    if(type.match(/full|ledger/)) data.ledger = ledgerDB;

    // System Data
    if(type === 'full') { 
        data.upi = upiProfiles; 
        data.bank = bankProfiles; 
        data.config = systemConfig; 
    }

    const a = document.createElement('a'); 
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], {type:'application/json'}));
    a.download = `SagarPOS_${type}_${new Date().toISOString().slice(0,10)}.json`; 
    a.click();

    // Auto-push to cloud if URL exists
    if (type === 'full' && systemConfig.cloudUrl) {
        showLoading(true, "Uploading to Cloud...");
        fetch(systemConfig.cloudUrl, {
            method: 'POST', mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ action: "BACKUP", payload: data })
        }).then(() => {
            showLoading(false); showToast("☁️ Cloud Backup Secure!", "success"); AudioEngine.playSuccess();
        }).catch(err => {
            showLoading(false); showToast("Cloud Upload Failed", "error");
        });
    }
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
            if(d.upi) upiProfiles = d.upi;
            if(d.bank) bankProfiles = d.bank;

            saveData(); 
            showLoading(false);
            alert("✅ Restore Complete! System will reload."); 
            location.reload();
        } catch(err) {
            showLoading(false);
            showToast("Corrupt Backup File", "error");
            console.error(err);
        }
    }; 
    r.readAsText(file);
}

function syncFromCloud() {
    let rawUrl = systemConfig.cloudUrl;
    if (!rawUrl) {
        showToast("Please Set Cloud URL in Settings first", "error");
        return;
    }
    
    if(!confirm("⚠️ OVERWRITE WARNING:\nThis will replace ALL current data with the Cloud Backup.\n\nAre you sure?")) return;

    showLoading(true, "Downloading from Cloud...");
    rawUrl = rawUrl.trim();
    const separator = rawUrl.includes('?') ? '&' : '?';
    const finalUrl = `${rawUrl}${separator}action=RESTORE&_t=${Date.now()}`;

    fetch(finalUrl)
    .then(async response => {
        const text = await response.text(); 
        try { return JSON.parse(text); } catch (e) { throw new Error("Invalid format from server."); }
    })
    .then(data => {
        if(data.error) throw new Error(data.error);
        const d = data.payload || data; 
        if(!d.products && !d.customers) throw new Error("Backup file appears empty.");

        if(d.products) productDB = d.products;
        if(d.customers) customerDB = d.customers;
        if(d.sales) salesHistory = d.sales;
        if(d.ledger) ledgerDB = d.ledger;
        if(d.config) systemConfig = { ...systemConfig, ...d.config };
        if(d.upi) upiProfiles = d.upi;
        if(d.bank) bankProfiles = d.bank;

        saveData();
        showLoading(false);
        alert("✅ Restore Complete! The system will now reload.");
        location.reload();
    })
    .catch(err => {
        showLoading(false);
        alert("❌ Sync Failed: " + err.message);
    });
}

function factoryReset() {
    verifyPin(() => {
        if(!confirm("CRITICAL WARNING: Delete ALL data?")) return;
        if(prompt("Type 'DELETE EVERYTHING'") === 'DELETE EVERYTHING') { 
            localStorage.clear(); 
            location.reload(); 
        }
    });
}