// ============================================================================
// FIRESTORE SYNC ADAPTERS (assets/js/sync.js)
// ============================================================================

// 1. Pull Initial Data on Boot
function syncFromFirestore() {
    if (!navigator.onLine) {
        showToast("Running Offline (Local Data Only)", "warning");
        return;
    }

    showToast("Syncing with Firebase...", "info");

    // Pull Customers
    db.collection('customers').get().then(snap => {
        let freshCusts = [];
        snap.forEach(doc => freshCusts.push(doc.data()));
        if(freshCusts.length > 0) { 
            customerDB = freshCusts; 
            if(typeof renderCustomerTable === 'function') renderCustomerTable(); 
        }
    }).catch(e => console.error("Firebase Cust Sync Error:", e));

    // Pull Ledger
    db.collection('ledger').get().then(snap => {
        let freshLedger = [];
        snap.forEach(doc => freshLedger.push(doc.data()));
        if(freshLedger.length > 0) { 
            ledgerDB = freshLedger; 
        }
    }).catch(e => console.error("Firebase Ledger Sync Error:", e));

    // Pull Sales (Limit to last 500 to keep browser memory light and fast)
    db.collection('sales').orderBy('timestamp', 'desc').limit(500).get().then(snap => {
        let freshSales = [];
        snap.forEach(doc => freshSales.push(doc.data()));
        if(freshSales.length > 0) { 
            salesHistory = freshSales; 
            if(typeof renderSalesReports === 'function') renderSalesReports(); 
            if(typeof renderDashboard === 'function') renderDashboard(); 
        }
    }).then(() => {
        saveData(); // Commit cloud truth to local storage
        showToast("System Online & Synced", "success");
        AudioEngine.playChime();
    }).catch(e => console.error("Firebase Sales Sync Error:", e));
}

// 2. Generic Database Push
function pushToFirebase(collection, docId, data) {
    if (navigator.onLine && auth.currentUser) {
        // Appends a server timestamp so we always know exactly when it was uploaded
        db.collection(collection).doc(docId.toString()).set({
            ...data, 
            serverTime: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(e => console.error(`Error pushing to ${collection}:`, e));
    }
}

// 3. Specific Push Logic (Used by your POS/Ledger/Customer logic)
function pushCustomerToCloud(custData) {
    if (!navigator.onLine || !auth.currentUser) return;
    
    // We use Phone number as Document ID to prevent duplicate customers
    db.collection('customers').doc(custData.phone).set(custData)
      .catch(e => console.error("Firebase Cust Error", e));
}

function pushLedgerToCloud(ledgerData) {
    if (!navigator.onLine || !auth.currentUser) return;
    
    db.collection('ledger').doc(ledgerData.id).set(ledgerData)
      .catch(e => console.error("Firebase Ledger Error", e));
}

function syncToCloud(saleData) {
    if (!navigator.onLine || !auth.currentUser) {
        showToast("Offline: Sale saved locally. Will sync later.", "warning");
        return; 
    }
    
    db.collection('sales').doc(saleData.id).set(saleData)
      .then(() => {
          console.log("Firebase: Sale Saved");
      })
      .catch(e => {
          console.error("Firebase Sale Error", e);
          showToast("Cloud Sync Failed", "error");
          AudioEngine.playError();
      });
}