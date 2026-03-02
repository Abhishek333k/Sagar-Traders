// ============================================================================
// CAMERA & BARCODE SCANNER (assets/js/scanner.js)
// ============================================================================

function startScanner() { 
    document.getElementById('scanOverlay').style.display = 'flex'; 
    document.getElementById('camStatus').innerText = "Starting Camera...";
    
    Html5Qrcode.getCameras().then(devices => {
        if (devices && devices.length) {
            const sel = document.getElementById('cameraSelect');
            sel.innerHTML = devices.map(d => `<option value="${d.id}">${d.label}</option>`).join('');
            
            if(html5QrcodeScanner) {
                html5QrcodeScanner.stop().then(() => {
                    html5QrcodeScanner.clear(); initCamera(devices[0].id); 
                }).catch(err => initCamera(devices[0].id));
            } else {
                const backCam = devices.find(d => d.label.toLowerCase().includes('back')) || devices[devices.length - 1];
                initCamera(backCam.id);
            }
        } else { document.getElementById('camStatus').innerText = "No cameras found."; }
    }).catch(err => { document.getElementById('camStatus').innerText = "Camera Permission Denied."; });
}

function initCamera(cameraId) {
    html5QrcodeScanner = new Html5Qrcode("reader");
    html5QrcodeScanner.start(cameraId, { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => { AudioEngine.playBeep(); document.getElementById('skuInput').value = decodedText; fetchProductBySku(decodedText); stopScanner(true); },
        (errorMessage) => { }
    ).then(() => { document.getElementById('camStatus').innerText = "Scanning... Align Code"; }).catch(err => { document.getElementById('camStatus').innerText = "Start Failed: " + err; });
}

function stopScanner(hide) { 
    if(html5QrcodeScanner) {
        try { html5QrcodeScanner.stop().then(() => { html5QrcodeScanner.clear(); html5QrcodeScanner = null; }).catch(err => { html5QrcodeScanner = null; }); } 
        catch(e) { html5QrcodeScanner = null; }
    }
    if(hide) document.getElementById('scanOverlay').style.display='none'; 
}

function onCameraChange(cameraId) {
    if(html5QrcodeScanner) { html5QrcodeScanner.stop().then(() => { html5QrcodeScanner.clear(); initCamera(cameraId); }); } 
    else { initCamera(cameraId); }
}

// --- GLOBAL KEYBOARD SHORTCUTS ---
function setupBarcodeListener() {
    document.addEventListener('keydown', (e) => {
        // Tab Switching
        if (e.altKey && e.key >= '1' && e.key <= '8') {
            e.preventDefault(); 
            const sectionIds = ['dashboard', 'pos', 'analytics', 'reports', 'ledger', 'customers', 'database', 'settings'];
            const index = parseInt(e.key) - 1; 
            const navItems = document.querySelectorAll('.sidebar > .nav-item'); 
            if(sectionIds[index] && navItems[index]) showSection(sectionIds[index], navItems[index]); 
            return;
        }

        // Shortcuts
        if (e.altKey && e.key.toLowerCase() === 's') { e.preventDefault(); document.getElementById('skuInput').focus(); }
        if (e.altKey && e.key.toLowerCase() === 'p') { e.preventDefault(); initiateCheckout(); }
        if (e.altKey && e.key.toLowerCase() === 'h') { e.preventDefault(); holdCart(); }
        
        // Modals
        if (e.key === "Escape") { document.querySelectorAll('.overlay-modal').forEach(m => m.style.display = 'none'); }
        
        // Hardware Barcode Scanner Buffer
        if (e.target.tagName === 'INPUT' && e.target.id !== 'skuInput') return;
        if(e.key.length === 1) { 
            barcodeBuffer += e.key; 
            clearTimeout(barcodeTimer); 
            barcodeTimer = setTimeout(() => { barcodeBuffer = ""; }, 100); 
        } 
        else if (e.key === "Enter") { 
            if(barcodeBuffer.length > 3) { 
                document.getElementById('skuInput').value = barcodeBuffer; 
                fetchProductBySku(barcodeBuffer); 
                barcodeBuffer = ""; 
            } 
        }
    });
}