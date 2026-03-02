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
let reservedStock = {}; // [v6.2] Temporary Local Stock Reservation

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

// System Defaults
let systemConfig = {
    themeColor: 'blue', 
    customColor: '', 
    darkMode: false, 
    defaultGst: 0,
    printFooter: '', 
    logoUrl: '', 
    printFormat: 'A4', 
    invoiceTemplate: '',
    securityPin: '0000', 
    lastBackup: 0, 
    cloudUrl: '', 
    productSyncUrl: '',
    enableBackupWarn: true, 
    enableLowStock: true,
    interestRate: 1.5, 
    gracePeriod: 30
};

// --- SYSTEM BOOT SEQUENCE ---
function initializeSystem() {
    // 1. Set UI Dates
    document.getElementById('dashDate').innerText = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    ['invDate','ledgerTxDate','reportFromDate','reportToDate'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.valueAsDate = new Date();
    });
    
    // 2. Load Local Data & Run Maintenance
    loadLocalStorage(); 
    autoCleanupCarts(); // [v6.2] Deletes 7-day old parked carts
    repairData(); 
    loadSettingsState(); 
    
    // 3. Render User Interface
    updateHeldBadge();
    renderItems(); 
    renderSalesReports(); 
    renderDashboard(); 
    renderCustomerTable(); 
    renderProductTable(); 
    populateFilters(); 
    
    // 4. Attach Listeners & Themes
    setupBarcodeListener(); 
    applySystemConfig();

    // 5. Pull Fresh Data from Firebase
    syncFromFirestore(); 
}

// --- HELD CARTS AUTO-CLEANUP ---
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

// --- AUDIT FIX: PREVENT ABNORMAL EXIT DATA LEAKS ---
window.onbeforeunload = function(e) {
    // Check for unsaved Settings
    if (isSettingsDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved settings! Are you sure you want to leave?';
        return e.returnValue;
    }
    
    // Check for active items in the cart (prevents locking stock forever)
    if (invoiceItems.length > 0) {
        e.preventDefault();
        e.returnValue = 'You have items in your active cart. Closing will lose them!';
        return e.returnValue;
    }
};