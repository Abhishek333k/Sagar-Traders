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
                    html5QrcodeScanner.clear();
                    initCamera(devices[0].id); 
                }).catch(err => initCamera(devices[0].id));
            } else {
                const backCam = devices.find(d => d.label.toLowerCase().includes('back')) || devices[devices.length - 1];
                initCamera(backCam.id);
            }
        } else {
            document.getElementById('camStatus').innerText = "No cameras found.";
        }
    }).catch(err => {
        document.getElementById('camStatus').innerText = "Camera Permission Denied.";
    });
}

function initCamera(cameraId) {
    html5QrcodeScanner = new Html5Qrcode("reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    html5QrcodeScanner.start(
        cameraId, config,
        (decodedText) => {
            AudioEngine.playBeep();
            document.getElementById('skuInput').value = decodedText;
            fetchProductBySku(decodedText);
            stopScanner(true);
        },
        (errorMessage) => { /* Ignore standard scanning frame errors */ }
    ).then(() => {
        document.getElementById('camStatus').innerText = "Scanning... Align Code";
    }).catch(err => {
        document.getElementById('camStatus').innerText = "Start Failed: " + err;
    });
}

function stopScanner(hide) { 
    if(html5QrcodeScanner) {
        try {
            html5QrcodeScanner.stop().then(() => {
                html5QrcodeScanner.clear();
                html5QrcodeScanner = null; 
            }).catch(err => {
                html5QrcodeScanner = null;
            });
        } catch(e) { html5QrcodeScanner = null; }
    }
    if(hide) document.getElementById('scanOverlay').style.display='none'; 
}

function onCameraChange(cameraId) {
    if(html5QrcodeScanner) {
        html5QrcodeScanner.stop().then(() => {
            html5QrcodeScanner.clear();
            initCamera(cameraId);
        });
    } else {
        initCamera(cameraId);
    }
}