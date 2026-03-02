// ============================================================================
// GLOBAL STATE & BOOT SEQUENCE (assets/js/main.js)
// ============================================================================

// --- GLOBAL STATE VARIABLES ---
let productDB = {};
let customerDB = [];
let invoiceItems = [];
let salesHistory = [];
let ledgerDB = []; 
let heldCarts = [];
let reservedStock = {}; 

let activeUpiId = null;
let activeBankId = null;
let searchTimeout = null;
let barcodeBuffer = "";
let barcodeTimer = null;
let editingItemIndex = null;
let returnMode = false;
let currentPreviewSale = null;
let isSettingsDirty = false;
let adminSessionExpiry = 0; 
let html5QrcodeScanner = null;

// ============================================================================
// HARDWIRED SYSTEM DEFAULTS (Extracted from 2026-03-02 Backup)
// ============================================================================

let upiProfiles = [
    { id: 'sagar_main_upi', name: 'Sagar Traders (Default)', upiId: '9347008871@ptsbi', upiName: 'Sagar Traders' },
    { id: 'e19a5f57-7198-4742-a1a6-4b91a37762f9', name: 'Avinash Ramesh SBI', upiId: '6304094177@ptsbi', upiName: 'Sagar Traders' }
];

let bankProfiles = [
    { id: 'sagar_main_bank', name: 'Sagar Traders (Main)', accName: 'Sagar Traders', accNo: '25410210000205', bankName: 'UCO BANK', ifsc: 'UCBA0002541', branch: 'Mangalagiri' }
];

let systemConfig = {
    themeColor: 'blue', 
    customColor: '', 
    darkMode: false, 
    defaultGst: 0,
    printFooter: 'Thank you for your business!', 
    logoUrl: '', 
    printFormat: 'A4', 
    invoiceTemplate: '',
    securityPin: '0000', 
    lastBackup: 0, 
    
    // --> PASTE YOUR GOOGLE SCRIPT URLS HERE <--
    cloudUrl: 'https://script.google.com/macros/s/AKfycbz5mq1dk1W3qwo6cDhK59PVnWe82UWIaP_kI_f3XXX-M5k-SG7bVYo1ZbdJB2xodNLZTA/exec', 
    productSyncUrl: 'https://script.google.com/macros/s/AKfycby9FjfW6dsTOLYOwm9KF7GR3Ff3aKDlEXZSWfV2lIgWQoVzDpvsP_h4uE_G5DTcF9VL/exec', 
    
    enableBackupWarn: true, 
    enableLowStock: true,
    interestRate: 1.5, 
    gracePeriod: 30
};

// ============================================================================
// SYSTEM BOOT SEQUENCE
// ============================================================================

function initializeSystem() {
    // 1. Set UI Dates
    document.getElementById('dashDate').innerText = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    ['invDate','ledgerTxDate','reportFromDate','reportToDate'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.valueAsDate = new Date();
    });
    
    // 2. Load Local Data & Run Maintenance
    loadLocalStorage(); 
    autoCleanupCarts(); 
    if(typeof repairData === 'function') repairData(); 
    if(typeof loadSettingsState === 'function') loadSettingsState(); 
    
    // 3. Render User Interface
    if(typeof updateHeldBadge === 'function') updateHeldBadge();
    if(typeof renderItems === 'function') renderItems(); 
    if(typeof renderSalesReports === 'function') renderSalesReports(); 
    if(typeof renderDashboard === 'function') renderDashboard(); 
    if(typeof renderCustomerTable === 'function') renderCustomerTable(); 
    if(typeof renderProductTable === 'function') renderProductTable(); 
    if(typeof populateFilters === 'function') populateFilters(); 
    
    // 4. Attach Listeners & Themes
    if(typeof setupBarcodeListener === 'function') setupBarcodeListener(); 
    if(typeof applySystemConfig === 'function') applySystemConfig();

    // 5. Pull Fresh Data from Firebase
    if(typeof syncFromFirestore === 'function') syncFromFirestore(); 
}

function loadLocalStorage() {
    // Merge Saved Settings with Hardwired Defaults
    const sc = localStorage.getItem('sagar_sys_config'); 
    if(sc) systemConfig = {...systemConfig, ...JSON.parse(sc)};

    // Load DBs
    const db = localStorage.getItem('sagar_product_db'); if(db) { productDB=JSON.parse(db); const dc=document.getElementById('dbCount'); if(dc) dc.innerText=Object.keys(productDB).length; }
    const cu = localStorage.getItem('sagar_customers'); if(cu) customerDB=JSON.parse(cu);
    const hc = localStorage.getItem('sagar_held_carts'); if(hc) heldCarts=JSON.parse(hc);
    const le = localStorage.getItem('sagar_ledger'); if(le) ledgerDB=JSON.parse(le);
    const sa = localStorage.getItem('sagar_sales_history'); if(sa) salesHistory=JSON.parse(sa);

    // Load Payment Profiles (Fallback to Hardwired if empty)
    const upiSaved = localStorage.getItem('sagar_upi_profiles');
    if(upiSaved) upiProfiles = JSON.parse(upiSaved).profiles;
    
    const bankSaved = localStorage.getItem('sagar_bank_profiles');
    if(bankSaved) bankProfiles = JSON.parse(bankSaved).profiles;
}

function saveData() {
    localStorage.setItem('sagar_customers', JSON.stringify(customerDB)); 
    localStorage.setItem('sagar_sales_history', JSON.stringify(salesHistory));
    localStorage.setItem('sagar_product_db', JSON.stringify(productDB)); 
    localStorage.setItem('sagar_held_carts', JSON.stringify(heldCarts));
    localStorage.setItem('sagar_ledger', JSON.stringify(ledgerDB)); 
    localStorage.setItem('sagar_sys_config', JSON.stringify(systemConfig));
    localStorage.setItem('sagar_upi_profiles', JSON.stringify({profiles: upiProfiles}));
    localStorage.setItem('sagar_bank_profiles', JSON.stringify({profiles: bankProfiles}));
}

// --- HELD CARTS AUTO-CLEANUP ---
function autoCleanupCarts() {
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const initialCount = heldCarts.length;
    
    heldCarts = heldCarts.filter(c => (now - c.id) < sevenDaysMs);
    if (heldCarts.length < initialCount) saveData();
}

// --- AUDIT FIX: PREVENT ABNORMAL EXIT DATA LEAKS ---
window.onbeforeunload = function(e) {
    if (isSettingsDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved settings! Are you sure you want to leave?';
        return e.returnValue;
    }
    if (invoiceItems.length > 0) {
        e.preventDefault();
        e.returnValue = 'You have items in your active cart. Closing will lose them!';
        return e.returnValue;
    }
};