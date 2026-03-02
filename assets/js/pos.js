// ============================================================================
// POS & CART ENGINE (assets/js/pos.js)
// ============================================================================

// --- CART MANAGEMENT ---
function toggleReturnMode() { 
    returnMode = !returnMode; 
    document.getElementById('posItemCard').classList.toggle('return-mode-active', returnMode); 
    showToast(returnMode ? "RETURN MODE: Items will be negative." : "Return Mode Disabled", 'info');
}

function addItem() {
    const desc = document.getElementById('itemDesc').value; 
    let qty = parseFloat(document.getElementById('itemQty').value)||0;
    const rate = parseFloat(document.getElementById('itemRate').value)||0;
    const sku = document.getElementById('skuInput').value.trim().toUpperCase();
    
    if(!desc || qty === 0) return showToast("Invalid Item", 'error');
    if(returnMode) qty = -Math.abs(qty); else qty = Math.abs(qty);

    // [AUDIT FIX] Hard Stock Reservation Logic
    if (sku && productDB[sku]) {
        const available = productDB[sku].stock - (reservedStock[sku] || 0);
        
        if (!returnMode && qty > available) {
            showToast(`STOCK BLOCK: Only ${available} units available!`, 'error');
            AudioEngine.playError();
            document.getElementById('itemQty').classList.add('input-error');
            setTimeout(()=> document.getElementById('itemQty').classList.remove('input-error'), 500);
            return; // STOP THE FUNCTION. Do not add to cart.
        }
        reservedStock[sku] = (reservedStock[sku] || 0) + qty;
    }

    invoiceItems.push({ sku, desc, qty, rate, gst: parseFloat(document.getElementById('itemGst').value)||0 });
    AudioEngine.playBeep();
    
    // Reset Fields
    document.getElementById('skuInput').value=''; document.getElementById('itemDesc').value=''; document.getElementById('itemQty').value='1';
    document.getElementById('itemRate').value=''; document.getElementById('itemGst').value=systemConfig.defaultGst || ''; 
    document.getElementById('skuInput').focus(); 
    renderItems();
}

function removeItem(i) { 
    if(editingItemIndex === i) cancelEditItem(); 
    const item = invoiceItems[i]; 
    if(item.sku && reservedStock[item.sku]) { reservedStock[item.sku] -= item.qty; } // Release stock
    invoiceItems.splice(i, 1); 
    renderItems(); 
}

function clearCart() { 
    if(!invoiceItems.length) return;
    if(!confirm("Clear the current cart?")) return;
    invoiceItems = []; 
    reservedStock = {}; // Release all reserved items globally
    renderItems(); 
    showToast("Cart Cleared", "info");
}

function editItem(i) {
    const item = invoiceItems[i];
    document.getElementById('skuInput').value = item.sku; document.getElementById('itemDesc').value = item.desc;
    document.getElementById('itemQty').value = Math.abs(item.qty);
    document.getElementById('itemRate').value = item.rate; document.getElementById('itemGst').value = item.gst;
    editingItemIndex = i;
    document.getElementById('btnAddItem').classList.add('hidden'); document.getElementById('btnUpdateItem').classList.remove('hidden');
}

function updateItem() {
    if(editingItemIndex === null) return;
    let qty = parseFloat(document.getElementById('itemQty').value)||0;
    if(returnMode || invoiceItems[editingItemIndex].qty < 0) qty = -Math.abs(qty);
    
    // Adjust reserved stock difference
    const oldItem = invoiceItems[editingItemIndex];
    if(oldItem.sku && reservedStock[oldItem.sku]) reservedStock[oldItem.sku] -= oldItem.qty;
    const newSku = document.getElementById('skuInput').value.trim().toUpperCase();
    
    // Hard block check on edit
    if(newSku && productDB[newSku]) {
        const available = productDB[newSku].stock - (reservedStock[newSku] || 0);
        if (!returnMode && qty > available) {
            showToast(`STOCK BLOCK: Only ${available} units available!`, 'error');
            AudioEngine.playError();
            if(oldItem.sku) reservedStock[oldItem.sku] += oldItem.qty; // Re-reserve the old amount
            return;
        }
        reservedStock[newSku] = (reservedStock[newSku] || 0) + qty;
    }

    invoiceItems[editingItemIndex] = {
        sku: newSku, desc: document.getElementById('itemDesc').value,
        qty: qty, rate: parseFloat(document.getElementById('itemRate').value), gst: parseFloat(document.getElementById('itemGst').value)
    };
    cancelEditItem(); renderItems();
}

function cancelEditItem() { 
    editingItemIndex = null; document.getElementById('skuInput').value=''; 
    document.getElementById('itemDesc').value='';
    document.getElementById('btnAddItem').classList.remove('hidden'); document.getElementById('btnUpdateItem').classList.add('hidden');
    document.getElementById('itemRate').value=''; document.getElementById('itemGst').value=systemConfig.defaultGst || '';
}

function renderItems() {
    const tbody = document.getElementById('invoiceItems'); tbody.innerHTML = ''; 
    let sub = 0, tax = 0, taxSlabs = {}; 
    
    invoiceItems.forEach((item, i) => {
        const base = item.rate * item.qty; const t = (base * item.gst) / 100; 
        sub += base; tax += t;
        if (item.gst > 0) { taxSlabs[item.gst] = (taxSlabs[item.gst] || 0) + t; }
        tbody.innerHTML += `<tr><td>${escapeHtml(item.desc)}</td><td>${item.qty}</td><td class="text-right">₹${item.rate}</td><td class="text-right">₹${(base+t).toFixed(2)}</td><td class="text-right"><button class="icon-btn" onclick="editItem(${i})"><i class="fas fa-pencil-alt"></i></button><button class="icon-btn" style="color:red" onclick="removeItem(${i})"><i class="fas fa-trash"></i></button></td></tr>`;
    });
    
    const disc = (sub * (parseFloat(document.getElementById('discPercent').value)||0)) / 100;
    const grand = sub + tax - disc;
    
    document.getElementById('subTotalDisplay').innerText = "₹"+sub.toFixed(2);
    document.getElementById('discAmountDisplay').innerText = "-₹"+disc.toFixed(2);
    document.getElementById('grandTotal').innerText = "₹"+grand.toFixed(2);
    
    // Render Tax Slabs
    let taxHtml = `<span>Tax (Included/Extra):</span><span id="taxTotalDisplay">₹${tax.toFixed(2)}</span>`;
    if (Object.keys(taxSlabs).length > 0) {
        taxHtml += `<div style="margin-top:5px; padding:8px; background:var(--bg); border-radius:6px; font-size:0.75rem; border:1px solid var(--border);">`;
        for(let slab in taxSlabs) { taxHtml += `<div style="display:flex; justify-content:space-between; margin-bottom:3px;"><span>GST @ ${slab}%:</span><span>₹${taxSlabs[slab].toFixed(2)}</span></div>`; }
        taxHtml += `</div>`;
    }
    document.getElementById('taxDisplayRow').innerHTML = taxHtml;
    updateDashboardQR(grand);
}

// --- IFRAME SILENT PRINTING (Bypasses Popup Blockers) ---
function silentPrint(htmlContent) {
    let printFrame = document.getElementById('hiddenPrintFrame');
    if (!printFrame) {
        printFrame = document.createElement('iframe');
        printFrame.id = 'hiddenPrintFrame';
        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        printFrame.style.border = '0';
        document.body.appendChild(printFrame);
    }
    printFrame.contentWindow.document.open();
    printFrame.contentWindow.document.write(htmlContent);
    printFrame.contentWindow.document.close();
    printFrame.contentWindow.focus();
    
    // Slight delay to allow CSS/Logos to render inside the iframe before triggering printer
    setTimeout(() => { printFrame.contentWindow.print(); }, 500);
}

function generateNextInvoiceNumber() {
    const d = new Date(); const m = (d.getMonth() + 1).toString().padStart(2, '0'); const day = d.getDate().toString().padStart(2, '0');
    const prefix = `ST-${m}-${day}-`;
    const lastSale = salesHistory.find(s => s.invoiceNo && s.invoiceNo.startsWith(prefix));
    let seq = 1; if (lastSale) seq = parseInt(lastSale.invoiceNo.split('-').pop()) + 1;
    return `${prefix}${seq.toString().padStart(3, '0')}`; 
}

// --- CHECKOUT LOGIC ---
function initiateCheckout() {
    if(!invoiceItems.length) return showToast("Cart Empty", 'error');
    const mode = document.getElementById('paymentMode').value;
    if(mode === 'Credit') {
        const phone = document.getElementById('custPhone').value;
        const name = document.getElementById('custName').value;
        if(!phone || !name) {
            showToast("Name & Phone Required for Credit", 'error'); AudioEngine.playError();
            if(!phone) { document.getElementById('custPhone').classList.add('input-error'); setTimeout(() => document.getElementById('custPhone').classList.remove('input-error'), 500); }
            return;
        }
    }
    if(mode === 'Split') openSplitModal(); else finalizeAndPrint(null);
}

function finalizeAndPrint(splitDetails) {
    const grandTotal = parseFloat(document.getElementById('grandTotal').innerText.replace('₹','')), pMode = document.getElementById('paymentMode').value;
    const cPhone = normalizePhone(document.getElementById('custPhone').value), cName = document.getElementById('custName').value || 'Walk-in';
    
    if(!confirm(`Confirm ${document.getElementById('invMode').value} of ₹${grandTotal}?`)) return;

    // 1. Commit Stock (Permanently deduct reserved items)
    invoiceItems.forEach(i => { if(i.sku && productDB[i.sku]) productDB[i.sku].stock -= i.qty; });
    reservedStock = {}; // Clear reserves

    // 2. Update Customer
    if(cPhone) {
        const c = { name: cName, phone: cPhone, attn: document.getElementById('custAttn').value, altPhone: document.getElementById('custAltPhone').value, address: document.getElementById('custAddr').value, gst: document.getElementById('custGst').value };
        const idx = customerDB.findIndex(x => x.phone === cPhone);
        if(idx !== -1) customerDB[idx] = c; else customerDB.push(c);
        pushCustomerToCloud(c); // Sync to firebase
    }

    // 3. Create Sale Object
    let totalCost = 0;
    invoiceItems.forEach(i => { if(i.sku && productDB[i.sku]) totalCost += (productDB[i.sku].purchaseRate || 0) * Math.abs(i.qty); });
    
    const invNo = generateNextInvoiceNumber();
    const newSale = { 
        id: generateUUID(), invoiceNo: invNo, timestamp: Date.now(), date: new Date().toISOString(), 
        cust: cName, custDetails: { name: cName, phone: cPhone }, items: [...invoiceItems], 
        amt: grandTotal, cost: totalCost, mode: document.getElementById('invMode').value, 
        paymentMode: pMode, splitDetails: splitDetails, cashier: document.getElementById('activeCashier').value 
    };

    salesHistory.unshift(newSale); if(salesHistory.length>500) salesHistory.pop();
    saveData(); renderSalesReports(); syncToCloud(newSale); 

    // 4. Update Ledger
    if(pMode === 'Credit' && cPhone) {
        const ledg = { id: generateUUID(), phone: cPhone, date: new Date().toISOString().split('T')[0], type: 'DEBIT', amount: grandTotal, desc: `Inv #${invNo}`, mode: 'Credit', timestamp: Date.now(), cashier: newSale.cashier };
        ledgerDB.push(ledg); pushLedgerToCloud(ledg);
    }

    // 5. Compile Print HTML & Clear Cart
    // Call generatePrintHTML (located in templates.js)
    const finalHTML = generatePrintHTML(invNo); 
    invoiceItems = []; renderItems(); saveData(); 
    
    showToast("Bill Saved. Sending to printer...", 'success');
    AudioEngine.playSuccess();
    
    // 6. Print silently to avoid popup blocker
    silentPrint(finalHTML);
}

// --- SPLIT PAYMENT ---
function openSplitModal() {
    document.getElementById('splitPayModal').style.display = 'flex';
    const total = document.getElementById('grandTotal').innerText.replace('₹','');
    document.getElementById('splitTotalDisplay').innerText = "₹" + total;
    document.getElementById('splitCash').value = ''; document.getElementById('splitUpi').value = '';
    calculateSplit('init');
}
function closeSplitModal() { document.getElementById('splitPayModal').style.display = 'none'; }
function calculateSplit(source) {
    const total = parseFloat(document.getElementById('splitTotalDisplay').innerText.replace('₹',''));
    let cash = parseFloat(document.getElementById('splitCash').value)||0, upi = parseFloat(document.getElementById('splitUpi').value)||0;
    if(source === 'cash') { upi = total - cash; document.getElementById('splitUpi').value = upi.toFixed(2); } 
    else if (source === 'upi') { cash = total - upi; document.getElementById('splitCash').value = cash.toFixed(2); }
    const sum = cash + upi, status = document.getElementById('splitStatus'), btn = document.getElementById('btnConfirmSplit');
    if(Math.abs(sum - total) < 0.1) { status.innerText = "Balanced"; status.style.color = "var(--success)"; btn.disabled = false; } 
    else { status.innerText = `Mismatch: ${Math.abs(sum - total).toFixed(2)}`; status.style.color = "var(--danger)"; btn.disabled = true; }
}
function confirmSplitPayment() {
    const cash = parseFloat(document.getElementById('splitCash').value), upi = parseFloat(document.getElementById('splitUpi').value);
    finalizeAndPrint({ cash, upi }); closeSplitModal();
}

// --- HELD CARTS ---
function updateHeldBadge() {
    const badge = document.getElementById('heldBadge');
    if(heldCarts.length > 0) { badge.innerText = heldCarts.length; badge.classList.remove('hidden'); badge.style.animation = "pulse-red 2s infinite"; } 
    else { badge.classList.add('hidden'); badge.style.animation = "none"; }
}
function holdCart() {
    if(!invoiceItems.length) return;
    const enteredName = document.getElementById('custName').value.trim();
    const timeStr = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    heldCarts.push({ id: Date.now(), name: enteredName || "Walk-in", time: timeStr, items: [...invoiceItems], cust: { name: enteredName, phone: document.getElementById('custPhone').value } });
    invoiceItems=[]; reservedStock={}; renderItems(); saveData(); updateHeldBadge(); showToast("Cart Parked Successfully", 'success');
}
function checkHeldCarts(searchQuery = '') {
    const list = document.getElementById('heldCartsList');
    const q = searchQuery.toLowerCase();
    const filtered = heldCarts.filter(c => c.name.toLowerCase().includes(q) || (c.cust && c.cust.phone && c.cust.phone.includes(q)));
    
    if(!filtered.length) { list.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-light);">No carts found.</div>`; } 
    else {
        list.innerHTML = filtered.map((c, i) => {
            const sum = c.items.map(x=>x.desc).join(', ');
            return `<div class="held-cart-item"><div class="cart-details"><div class="cart-header"><span class="cart-name">${escapeHtml(c.name)}</span> <span class="cart-time">${c.time}</span></div><div class="cart-summary">${c.items.length} Items: ${sum}</div></div><div class="cart-actions"><button class="btn-recall" onclick="recallCart(${i})">Recall</button><button class="btn-trash" onclick="deleteHeldCart(${i})"><i class="fas fa-trash"></i></button></div></div>`;
        }).join('');
    }
    document.getElementById('heldCartsModal').style.display = 'flex';
}
function closeHeldModal() { document.getElementById('heldCartsModal').style.display = 'none'; }
function recallCart(i) {
    if(invoiceItems.length && !confirm("Current cart has items. Overwrite with held cart?")) return;
    
    // Release existing cart stock
    reservedStock = {}; 
    
    const c = heldCarts[i]; invoiceItems = c.items;
    
    // Re-reserve stock for recalled items
    invoiceItems.forEach(it => { if(it.sku) reservedStock[it.sku] = (reservedStock[it.sku]||0) + it.qty; });
    
    document.getElementById('custName').value = c.cust.name || ''; document.getElementById('custPhone').value = c.cust.phone || '';
    heldCarts.splice(i, 1); saveData(); closeHeldModal(); renderItems(); updateHeldBadge(); AudioEngine.playChime();
}
function deleteHeldCart(i) {
    if(!confirm("Permanently remove this parked cart?")) return;
    heldCarts.splice(i, 1); saveData(); checkHeldCarts(); updateHeldBadge(); showToast("Cart Removed", 'info');
}

function getActiveUpi() { return upiProfiles.find(p => p.id === activeUpiId) || upiProfiles[0] || {upiId:"", upiName:""}; }
function updateDashboardQR(amount) {
    if(amount <= 0) { document.getElementById('dashboardQR').style.opacity = '0.5'; return; }
    document.getElementById('dashboardQR').style.opacity = '1'; document.getElementById('qrAmount').innerText = amount.toFixed(0);
    const p = getActiveUpi(); document.getElementById('qrPayeeName').innerText = p.upiName;
    document.getElementById('liveQrTarget').innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`upi://pay?pa=${p.upiId}&pn=${p.upiName}&am=${amount.toFixed(2)}&cu=INR`)}" style="max-width:100%">`;
}