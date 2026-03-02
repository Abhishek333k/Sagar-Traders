// --- GLOBAL STATE VARIABLES ---
let productDB = {};
let customerDB = [];
let invoiceItems = [];
let salesHistory = [];
let ledgerDB = []; 
let heldCarts = [];
let reservedStock = {}; // [v6.2] Stock Reservation

let upiProfiles = [];
let bankProfiles = [];
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

let systemConfig = {
    themeColor: 'blue', customColor: '', darkMode: false, defaultGst: 0,
    printFooter: '', logoUrl: '', printFormat: 'A4', invoiceTemplate: '',
    securityPin: '0000', lastBackup: 0, cloudUrl: '', productSyncUrl: '',
    enableBackupWarn: true, enableLowStock: true,
    interestRate: 1.5, gracePeriod: 30
};

// --- SYSTEM BOOT SEQUENCE ---
function initializeSystem() {
    document.getElementById('dashDate').innerText = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    ['invDate','ledgerTxDate','reportFromDate','reportToDate'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.valueAsDate = new Date();
    });
    
    loadLocalStorage(); 
    autoCleanupCarts(); // [v6.2]
    repairData(); 
    loadSettingsState(); 
    updateHeldBadge();
    
    renderItems(); 
    renderSalesReports(); 
    renderDashboard(); 
    renderCustomerTable(); 
    renderProductTable(); 
    populateFilters(); 
    setupBarcodeListener(); 
    applySystemConfig();

    syncFromFirestore(); 
}

// [v6.2] HELD CARTS AUTO-CLEANUP (Deletes carts older than 7 days)
function autoCleanupCarts() {
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const initialCount = heldCarts.length;
    
    heldCarts = heldCarts.filter(c => (now - c.id) < sevenDaysMs);
    
    if (heldCarts.length < initialCount) {
        console.log(`Auto-cleaned ${initialCount - heldCarts.length} expired carts.`);
        saveData();
    }
}