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

    // [v6.2] Stock Reservation Logic
    if (sku && productDB[sku]) {
        const available = productDB[sku].stock - (reservedStock[sku] || 0);
        if (available < qty && !returnMode) {
            showToast(`Warning: Only ${available} left in stock!`, 'warning');
        }
        reservedStock[sku] = (reservedStock[sku] || 0) + qty;
    }

    invoiceItems.push({ sku, desc, qty, rate, gst: parseFloat(document.getElementById('itemGst').value)||0 });
    AudioEngine.playBeep();
    
    document.getElementById('skuInput').value=''; document.getElementById('itemDesc').value=''; document.getElementById('itemQty').value='1';
    document.getElementById('itemRate').value=''; document.getElementById('itemGst').value=systemConfig.defaultGst || ''; 
    document.getElementById('skuInput').focus(); 
    renderItems();
}

function removeItem(i) { 
    if(editingItemIndex === i) cancelEditItem(); 
    
    // [v6.2] Release Reserved Stock
    const item = invoiceItems[i];
    if(item.sku && reservedStock[item.sku]) {
        reservedStock[item.sku] -= item.qty;
    }

    invoiceItems.splice(i, 1); 
    renderItems(); 
}

function clearCart() {
    invoiceItems = [];
    reservedStock = {}; // Release all reservations
    renderItems();
    showToast("Cart Cleared", "info");
}

function renderItems() {
    const tbody = document.getElementById('invoiceItems'); 
    tbody.innerHTML = ''; 
    let sub = 0, tax = 0;
    let taxSlabs = {}; // [v6.2] Tax Breakdown Engine

    invoiceItems.forEach((item, i) => {
        const base = item.rate * item.qty; 
        const t = (base * item.gst) / 100; 
        sub += base; 
        tax += t;
        
        // Group taxes by %
        if (item.gst > 0) {
            taxSlabs[item.gst] = (taxSlabs[item.gst] || 0) + t;
        }

        tbody.innerHTML += `<tr><td>${escapeHtml(item.desc)}</td><td>${item.qty}</td><td class="text-right">₹${item.rate}</td><td class="text-right">₹${(base+t).toFixed(2)}</td><td class="text-right"><button class="icon-btn" onclick="editItem(${i})"><i class="fas fa-pencil-alt"></i></button><button class="icon-btn" style="color:red" onclick="removeItem(${i})"><i class="fas fa-trash"></i></button></td></tr>`;
    });

    const disc = (sub * (parseFloat(document.getElementById('discPercent').value)||0)) / 100;
    const grand = sub + tax - disc;
    
    document.getElementById('subTotalDisplay').innerText = "₹"+sub.toFixed(2);
    document.getElementById('discAmountDisplay').innerText = "-₹"+disc.toFixed(2);
    document.getElementById('grandTotal').innerText = "₹"+grand.toFixed(2);
    
    // [v6.2] Render Tax Slab UI
    let taxHtml = `<span>Tax (Included/Extra):</span><span id="taxTotalDisplay">₹${tax.toFixed(2)}</span>`;
    if (Object.keys(taxSlabs).length > 0) {
        taxHtml += `<div style="margin-top:5px; padding:8px; background:var(--bg); border-radius:6px; font-size:0.75rem; border:1px solid var(--border);">`;
        for(let slab in taxSlabs) {
            taxHtml += `<div style="display:flex; justify-content:space-between; margin-bottom:3px;"><span>GST @ ${slab}%:</span><span>₹${taxSlabs[slab].toFixed(2)}</span></div>`;
        }
        taxHtml += `</div>`;
    }
    document.getElementById('taxDisplayRow').innerHTML = taxHtml;

    updateDashboardQR(grand);
}

function initiateCheckout() {
    if(!invoiceItems.length) return showToast("Cart Empty", 'error');
    const mode = document.getElementById('paymentMode').value;
    
    if(mode === 'Credit') {
        const phone = document.getElementById('custPhone').value;
        const name = document.getElementById('custName').value;
        if(!phone || !name) {
            showToast("Name & Phone Required for Credit", 'error');
            AudioEngine.playError();
            return;
        }
    }
    if(mode === 'Split') openSplitModal(); else finalizeAndPrint(null);
}

function finalizeAndPrint(splitDetails) {
    const grandTotal = parseFloat(document.getElementById('grandTotal').innerText.replace('₹',''));
    const pMode = document.getElementById('paymentMode').value;
    const cName = document.getElementById('custName').value || "Walk-in";
    const cPhone = normalizePhone(document.getElementById('custPhone').value);
    
    if(!confirm(`Confirm ${document.getElementById('invMode').value} of ₹${grandTotal}?`)) return;

    // 1. Commit Stock (Permanently deduct reserved items)
    invoiceItems.forEach(i => { if(i.sku && productDB[i.sku]) productDB[i.sku].stock -= i.qty; });
    reservedStock = {}; // Clear reserves

    // 2. Update Customer
    if(cPhone) {
        const c = { name: cName, phone: cPhone, attn: document.getElementById('custAttn').value, altPhone: document.getElementById('custAltPhone').value, address: document.getElementById('custAddr').value, gst: document.getElementById('custGst').value };
        const idx = customerDB.findIndex(x => x.phone === cPhone);
        if(idx !== -1) customerDB[idx] = c; else customerDB.push(c);
        pushCustomerToCloud(c);
    }

    // 3. Create Sale Object [v6.2 Cashier Added]
    let totalCost = 0;
    invoiceItems.forEach(i => { if(i.sku && productDB[i.sku]) totalCost += (productDB[i.sku].purchaseRate || 0) * Math.abs(i.qty); });

    const invNo = generateNextInvoiceNumber();
    const newSale = {
        id: generateUUID(), invoiceNo: invNo, timestamp: Date.now(), date: new Date().toISOString(), 
        cust: cName, custDetails: { name: cName, phone: cPhone }, items: [...invoiceItems], 
        amt: grandTotal, cost: totalCost, mode: document.getElementById('invMode').value, 
        paymentMode: pMode, splitDetails: splitDetails,
        cashier: document.getElementById('activeCashier').value // Track who made sale
    };

    salesHistory.unshift(newSale);
    if(salesHistory.length > 500) salesHistory.pop(); 
    saveData(); renderSalesReports();
    syncToCloud(newSale); 

    // 4. Update Ledger
    if(pMode === 'Credit' && cPhone) {
        const ledg = { id: generateUUID(), phone: cPhone, date: new Date().toISOString().split('T')[0], type: 'DEBIT', amount: grandTotal, desc: `Inv #${invNo}`, mode: 'Credit', timestamp: Date.now(), cashier: newSale.cashier };
        ledgerDB.push(ledg);
        pushLedgerToCloud(ledg);
    }

    // 5. Print
    const finalHTML = generatePrintHTML(invNo); 
    invoiceItems = []; renderItems(); saveData(); 

    try {
        const win = window.open('', '_blank', 'width=900,height=800');
        if (win) { win.document.write(finalHTML); win.document.close(); win.onload = () => { win.focus(); win.print(); }; } 
        else { showToast("Bill Saved! (Pop-up blocked)", 'warning'); AudioEngine.playSuccess(); }
    } catch (e) { showToast("Bill Saved.", 'success'); }
}