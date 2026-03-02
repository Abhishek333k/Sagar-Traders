// ============================================================================
// SYSTEM CONFIGURATION & PROFILES (assets/js/config.js)
// ============================================================================

function loadSettingsState() {
    const s = JSON.parse(localStorage.getItem('sagar_settings') || '{}');
    if(s.invMode) document.getElementById('invMode').value = s.invMode; updateInvMode();
    activeBankId = s.activeBankId || (bankProfiles.length ? bankProfiles[0].id : null); 
    activeUpiId = s.activeUpiId || (upiProfiles.length ? upiProfiles[0].id : null);
    renderDropdowns(); renderItems();
}

function saveSettingsState() { localStorage.setItem('sagar_settings', JSON.stringify({ invMode: document.getElementById('invMode').value, activeUpiId, activeBankId })); }
function switchProfile(id) { activeUpiId = id; saveSettingsState(); renderItems(); }
function updateInvMode() { document.getElementById('gstBox').classList.toggle('hidden', document.getElementById('invMode').value !== 'Tax'); saveSettingsState(); renderItems(); }

// --- SETTINGS SAVING & THEMES ---
function markSettingsDirty() { isSettingsDirty=true; document.getElementById('settingsSaveBar').style.display='flex'; }
function discardSettings() { isSettingsDirty=false; document.getElementById('settingsSaveBar').style.display='none'; loadLocalStorage(); loadSettingsToUI(); applySystemConfig(); }

function saveSystemSettings() {
    systemConfig.defaultGst = parseFloat(document.getElementById('settingDefaultGst').value)||0;
    systemConfig.printFormat = document.getElementById('settingPrintFormat').value;
    systemConfig.securityPin = document.getElementById('settingPin').value;
    systemConfig.interestRate = parseFloat(document.getElementById('settingInterest').value)||1.5;
    systemConfig.gracePeriod = parseInt(document.getElementById('settingGrace').value)||30;
    systemConfig.enableBackupWarn = document.getElementById('settingBackupWarn').checked;
    systemConfig.enableLowStock = document.getElementById('settingLowStock').checked;
    systemConfig.productSyncUrl = document.getElementById('settingProductUrl') ? document.getElementById('settingProductUrl').value : '';
    systemConfig.cloudUrl = document.getElementById('settingSyncUrl') ? document.getElementById('settingSyncUrl').value : '';
    
    isSettingsDirty=false; document.getElementById('settingsSaveBar').style.display='none';
    saveData(); showToast("Settings Saved", "success"); AudioEngine.playSuccess(); applySystemConfig();
}

function loadSettingsToUI() {
    document.getElementById('settingDefaultGst').value = systemConfig.defaultGst || 0; 
    document.getElementById('settingPrintFormat').value = systemConfig.printFormat || 'A4';
    document.getElementById('settingPin').value = systemConfig.securityPin || '0000'; 
    document.getElementById('settingInterest').value = systemConfig.interestRate || 1.5;
    document.getElementById('settingGrace').value = systemConfig.gracePeriod || 30;
    document.getElementById('settingBackupWarn').checked = (systemConfig.enableBackupWarn !== false);
    document.getElementById('settingLowStock').checked = (systemConfig.enableLowStock !== false);
}

function applySystemConfig() {
    if(systemConfig.darkMode) document.body.classList.add('dark-mode'); else document.body.classList.remove('dark-mode');
    if(systemConfig.themeColor === 'custom') { document.body.style.setProperty('--primary', systemConfig.customColor); document.body.removeAttribute('data-theme'); } 
    else { document.body.style.removeProperty('--primary'); document.body.setAttribute('data-theme', systemConfig.themeColor); }
    if(document.getElementById('customColorPicker')) document.getElementById('customColorPicker').value = systemConfig.customColor || '#000000';
}

function previewThemeColor(color, el) { systemConfig.themeColor=color; systemConfig.customColor=''; markSettingsDirty(); applySystemConfig(); }
function toggleTheme() { systemConfig.darkMode = !systemConfig.darkMode; saveSystemSettings(); applySystemConfig(); }

function checkBackupStatus() {
    if (systemConfig.enableBackupWarn === false) { document.getElementById('backupBanner').style.display = 'none'; return; }
    const last = systemConfig.lastBackup || 0;
    const daysSince = (Date.now() - last) / (1000 * 60 * 60 * 24);
    const banner = document.getElementById('backupBanner');
    if(banner) { if(daysSince > 7) banner.style.display = 'block'; else banner.style.display = 'none'; }
}

// --- PAYMENT PROFILES ---
function renderProfileLists() { 
    const u = document.getElementById('upiList'); 
    if(u) u.innerHTML = upiProfiles.map(p => `<div class="profile-item ${p.id===activeUpiId?'active':''}"><div onclick="switchProfile('${p.id}')" style="cursor:pointer; flex:1;"><b>${escapeHtml(p.name)}</b><br>${p.upiId}</div><div style="display:flex; gap:5px;"><button class="icon-btn" onclick="editUpiProfile('${p.id}')"><i class="fas fa-pencil-alt"></i></button><button class="icon-btn" style="color:var(--danger)" onclick="deleteUpiProfile('${p.id}')"><i class="fas fa-trash"></i></button></div></div>`).join(''); 
    const b = document.getElementById('bankList'); 
    if(b) b.innerHTML = bankProfiles.map(p => `<div class="profile-item ${p.id===activeBankId?'active':''}"><div onclick="activeBankId='${p.id}'; saveSettingsState(); renderProfileLists();" style="cursor:pointer; flex:1;"><b>${escapeHtml(p.name)}</b><br>${p.bankName}</div><div style="display:flex; gap:5px;"><button class="icon-btn" onclick="editBankProfile('${p.id}')"><i class="fas fa-pencil-alt"></i></button><button class="icon-btn" style="color:var(--danger)" onclick="deleteBankProfile('${p.id}')"><i class="fas fa-trash"></i></button></div></div>`).join(''); 
}
function renderDropdowns() { 
    const u = document.getElementById('activeUpiProfile'); if(u) u.innerHTML = upiProfiles.map(p=>`<option value="${p.id}">${p.name}</option>`).join(''); 
    const b = document.getElementById('activeBankProfile'); if(b) b.innerHTML = bankProfiles.map(p=>`<option value="${p.id}">${p.name}</option>`).join(''); 
}
function showAddUpiForm() { document.getElementById('addUpiForm').style.display='block'; document.getElementById('addBankForm').style.display='none'; document.getElementById('editUpiId').value=''; ['upiProfName', 'upiId', 'upiName'].forEach(id => document.getElementById(id).value = ''); }
function showAddBankForm() { document.getElementById('addBankForm').style.display='block'; document.getElementById('addUpiForm').style.display='none'; document.getElementById('editBankId').value=''; ['bankProfName', 'bankAccName', 'bankAccNo', 'bankName', 'bankIfsc', 'bankBranch'].forEach(id => document.getElementById(id).value = ''); }
function hideForms() { document.getElementById('addUpiForm').style.display='none'; document.getElementById('addBankForm').style.display='none'; }
function editUpiProfile(id) { const p = upiProfiles.find(x => x.id === id); if(!p) return; showAddUpiForm(); document.getElementById('editUpiId').value = id; document.getElementById('upiProfName').value = p.name; document.getElementById('upiId').value = p.upiId; document.getElementById('upiName').value = p.upiName; }
function saveUpiProfile() { const id = document.getElementById('editUpiId').value, name = document.getElementById('upiProfName').value, upiId = document.getElementById('upiId').value, upiName = document.getElementById('upiName').value; if(!name) return showToast("Name required", 'error'); if(id) { const idx = upiProfiles.findIndex(p => p.id === id); if(idx !== -1) upiProfiles[idx] = { id, name, upiId, upiName }; } else { const newId = generateUUID(); upiProfiles.push({ id: newId, name, upiId, upiName }); activeUpiId = newId; } saveData(); hideForms(); renderProfileLists(); renderDropdowns(); }
function deleteUpiProfile(id) { if(upiProfiles.length <= 1) return showToast("Cannot delete last profile.", 'error'); if(!confirm("Delete?")) return; upiProfiles = upiProfiles.filter(p => p.id !== id); if(activeUpiId === id) activeUpiId = upiProfiles[0].id; saveData(); renderProfileLists(); renderDropdowns(); }
function editBankProfile(id) { const p = bankProfiles.find(x => x.id === id); if(!p) return; showAddBankForm(); document.getElementById('editBankId').value = id; document.getElementById('bankProfName').value = p.name; document.getElementById('bankAccName').value = p.accName; document.getElementById('bankAccNo').value = p.accNo; document.getElementById('bankName').value = p.bankName; document.getElementById('bankIfsc').value = p.ifsc; document.getElementById('bankBranch').value = p.branch; }
function saveBankProfile() { const id = document.getElementById('editBankId').value, name = document.getElementById('bankProfName').value; if(!name) return showToast("Name required", 'error'); const obj = { name, accName: document.getElementById('bankAccName').value, accNo: document.getElementById('bankAccNo').value, bankName: document.getElementById('bankName').value, ifsc: document.getElementById('bankIfsc').value, branch: document.getElementById('bankBranch').value }; if(id) { const idx = bankProfiles.findIndex(p => p.id === id); if(idx !== -1) bankProfiles[idx] = { id, ...obj }; } else { const newId = generateUUID(); bankProfiles.push({ id: newId, ...obj }); activeBankId = newId; } saveData(); hideForms(); renderProfileLists(); renderDropdowns(); }
function deleteBankProfile(id) { if(bankProfiles.length <= 1) return showToast("Cannot delete last profile.", 'error'); if(!confirm("Delete?")) return; bankProfiles = bankProfiles.filter(p => p.id !== id); if(activeBankId === id) activeBankId = bankProfiles[0].id; saveData(); renderProfileLists(); renderDropdowns(); }

function handleLogoUpload(input) {
    const file = input.files[0]; if (!file) return;
    const reader = new FileReader(); reader.readAsDataURL(file);
    reader.onload = function(event) {
        const img = new Image(); img.src = event.target.result;
        img.onload = function() {
            const canvas = document.createElement('canvas'); const MAX_WIDTH = 300; const scaleSize = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH; canvas.height = img.height * scaleSize;
            const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            systemConfig.logoUrl = canvas.toDataURL('image/jpeg', 0.7); markSettingsDirty(); applySystemConfig();
        }
    }
}
function clearLogo() { systemConfig.logoUrl = ''; document.getElementById('settingLogoFile').value = ''; markSettingsDirty(); applySystemConfig(); }