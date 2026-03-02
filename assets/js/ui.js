// ============================================================================
// UI CONTROLS, MODALS & NAVIGATION (assets/js/ui.js)
// ============================================================================

// --- NAVIGATION ---
function showSection(id, btn) {
    // 1. Guard against unsaved changes
    if(isSettingsDirty && !confirm("You have unsaved changes in Settings! Discard them and leave?")) return;
    else if (isSettingsDirty) discardSettings();

    // 2. 5-Minute Admin Lock for Settings
    if(id === 'settings' && Date.now() > adminSessionExpiry) {
        return verifyPin(() => showSection(id, btn));
    }

    // 3. Switch Tabs
    document.querySelectorAll('.section').forEach(e => e.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    
    if(btn) {
        document.querySelectorAll('.nav-item').forEach(e => e.classList.remove('active'));
        btn.classList.add('active');
    }
    
    // 4. Contextual Refresh
    if(id === 'dashboard') renderDashboard();
    if(id === 'reports') renderSalesReports();
    if(id === 'ledger') renderLedgerAccountsList();
    if(id === 'settings') loadSettingsToUI();
    if(id === 'analytics') renderAnalytics(); 
}

// --- SECURITY PIN LOGIC ---
function verifyPin(callback) {
    if(!systemConfig.securityPin || Date.now() < adminSessionExpiry) return callback();
    
    window.pendingSecureAction = callback;
    document.getElementById('securityPinInput').value = '';
    document.getElementById('pinModal').style.display = 'flex';
    document.getElementById('securityPinInput').focus();
}

function submitPin() {
    const entered = document.getElementById('securityPinInput').value;
    const actual = systemConfig.securityPin || '0000';
    
    if(entered === actual) {
        document.getElementById('pinModal').style.display = 'none';
        adminSessionExpiry = Date.now() + (5 * 60 * 1000); // Unlock for 5 mins
        AudioEngine.playSuccess();
        if(window.pendingSecureAction) window.pendingSecureAction();
        window.pendingSecureAction = null;
    } else {
        showToast("Incorrect PIN", 'error');
        AudioEngine.playError();
        document.getElementById('securityPinInput').value = '';
        document.getElementById('securityPinInput').classList.add('input-error');
        setTimeout(() => document.getElementById('securityPinInput').classList.remove('input-error'), 500);
    }
}

function closePinModal() { 
    document.getElementById('pinModal').style.display = 'none'; 
    window.pendingSecureAction = null; 
}

// --- TOASTS & OVERLAYS ---
function showToast(msg, type='info') {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div'); 
    t.className = `toast ${type}`;
    t.innerHTML = `<i class="fas fa-${type==='success'?'check-circle':type==='error'?'exclamation-circle':'info-circle'}"></i> <span>${msg}</span>`;
    c.appendChild(t); 
    setTimeout(() => { 
        t.style.animation = 'slideOut 0.3s forwards'; 
        setTimeout(() => t.remove(), 300); 
    }, 3000);
}

function showLoading(show, txt="Processing...") { 
    const o = document.getElementById('loadingOverlay');
    const t = document.getElementById('loadingText');
    if(show) { 
        if(t) t.innerText = txt; 
        o.style.display = 'flex'; 
    } else {
        o.style.display = 'none';
    }
}

// --- UTILS ---
function toggleSidebar() { 
    document.getElementById('sidebar').classList.toggle('open'); 
}

function toggleFullScreen() { 
    if (!document.fullscreenElement) document.documentElement.requestFullscreen(); 
    else if (document.exitFullscreen) document.exitFullscreen(); 
}

function handleSearchNav(e, context) {
    const containerId = context === 'pos' ? 'customerResults' : 'ledgerCustResults';
    const container = document.getElementById(containerId);
    if(!container) return;
    
    const items = container.querySelectorAll('.search-item');
    let activeIndex = Array.from(items).findIndex(i => i.classList.contains('selected'));
    
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (activeIndex < items.length - 1) {
            if (activeIndex >= 0) items[activeIndex].classList.remove('selected');
            items[activeIndex + 1].classList.add('selected');
            items[activeIndex + 1].scrollIntoView({ block: 'nearest' });
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (activeIndex > 0) {
            items[activeIndex].classList.remove('selected');
            items[activeIndex - 1].classList.add('selected');
            items[activeIndex - 1].scrollIntoView({ block: 'nearest' });
        }
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeIndex >= 0) items[activeIndex].click();
    }
}