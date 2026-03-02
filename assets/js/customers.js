// --- CUSTOMER DATABASE ---

function renderCustomerTable(query = '') {
    const tbody = document.querySelector('#custTable tbody'); 
    if(!tbody) return;
    tbody.innerHTML = '';
    const lowerQ = query.toLowerCase();
    
    const filtered = customerDB.filter(c => 
        c.phone.includes(query) || 
        c.name.toLowerCase().includes(lowerQ) || 
        (c.attn && c.attn.toLowerCase().includes(lowerQ)) || 
        (c.address && c.address.toLowerCase().includes(lowerQ))
    ).slice(0, 50);

    filtered.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:600; color:var(--text);">${escapeHtml(c.name)}</td>
            <td style="color:var(--text-light); font-size:0.85rem;">${escapeHtml(c.attn || '-')}</td>
            <td style="font-family:'Fira Code', monospace; color:var(--primary);">${c.phone}</td>
            <td style="font-size:0.85rem;">${escapeHtml(c.altPhone||'-')}</td>
            <td style="font-size:0.85rem; max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(c.address || '')}</td>
            <td style="font-family:'Fira Code', monospace; font-size:0.8rem;">${escapeHtml(c.gst || '')}</td>
            <td class="text-right">
                <div class="action-group">
                    <button class="action-btn edit" onclick="openCustModal('${c.phone}')" title="Edit Customer"><i class="fas fa-pen"></i></button>
                    <button class="action-btn delete" onclick="deleteCustomer('${c.phone}')" title="Delete Customer"><i class="fas fa-trash-alt"></i></button>
                </div>
            </td>`;
        tbody.appendChild(tr);
    });
}

function openCustModal(phone = null) {
    document.getElementById('custModal').style.display = 'flex';
    if(phone) {
        const c = customerDB.find(x => x.phone === phone);
        document.getElementById('custModalTitle').innerText = "Edit Customer";
        document.getElementById('editCustOriginalPhone').value = c.phone;
        document.getElementById('mCustName').value = c.name; 
        document.getElementById('mCustPhone').value = c.phone;
        document.getElementById('mCustAttn').value = c.attn || ""; 
        document.getElementById('mCustAltPhone').value = c.altPhone || "";
        document.getElementById('mCustAddr').value = c.address || ""; 
        document.getElementById('mCustGst').value = c.gst || "";
    } else {
        document.getElementById('custModalTitle').innerText = "Add Customer";
        document.getElementById('editCustOriginalPhone').value = "";
        document.getElementById('mCustName').value = ""; document.getElementById('mCustPhone').value = "";
        document.getElementById('mCustAttn').value = ""; document.getElementById('mCustAltPhone').value = "";
        document.getElementById('mCustAddr').value = ""; document.getElementById('mCustGst').value = "";
    }
}

function closeCustModal() { document.getElementById('custModal').style.display = 'none'; }

function saveCustomerFromModal() {
    const name = document.getElementById('mCustName').value.trim(); 
    const phone = document.getElementById('mCustPhone').value.trim();
    const origPhone = document.getElementById('editCustOriginalPhone').value;
    
    if(!name || !phone) return showToast("Name and Phone required.", 'error');
    if(phone !== origPhone && customerDB.some(c => c.phone === phone)) return showToast("Customer exists!", 'error');
    
    const newC = { 
        name, phone, 
        attn: document.getElementById('mCustAttn').value, 
        altPhone: document.getElementById('mCustAltPhone').value, 
        address: document.getElementById('mCustAddr').value, 
        gst: document.getElementById('mCustGst').value 
    };
    
    if (origPhone) { 
        const idx = customerDB.findIndex(c => c.phone === origPhone); 
        if (idx !== -1) { 
            customerDB[idx] = newC; 
            if (origPhone !== phone) ledgerDB.forEach(e => { if (e.phone === origPhone) e.phone = phone; }); 
        } 
    } else {
        customerDB.push(newC);
    }
    
    pushToFirebase('customers', newC.phone, newC);
    saveData(); 
    renderCustomerTable(); 
    closeCustModal(); 
    showToast("Customer saved.", 'success');
}

function deleteCustomer(phone) { 
    verifyPin(() => { 
        if(confirm("Delete customer?")) { 
            customerDB = customerDB.filter(c => c.phone !== phone); 
            // Optional: delete from firebase too
            saveData(); renderCustomerTable(); 
        } 
    }); 
}

function clearCustomers() { 
    verifyPin(() => { 
        if(confirm("Delete ALL customers?")) { customerDB = []; saveData(); renderCustomerTable(); } 
    }); 
}

function processCustomerImport() {
    const file = document.getElementById('custImportFile').files[0];
    if(!file) return;
    
    showLoading(true, "Importing Customers...");
    Papa.parse(file, { header:true, skipEmptyLines:true, complete: r => {
        let added = 0;
        r.data.forEach((d) => { 
            if(d['Phone'] && d['Name']) { 
                const existing = customerDB.findIndex(c => c.phone === d['Phone']); 
                const n = { name:d['Name'], phone:d['Phone'], attn:d['Attn']||"", altPhone:d['Alt Phone']||"", address:d['Address']||"", gst:d['GST']||"" }; 
                if(existing !== -1) customerDB[existing] = n; else { customerDB.push(n); added++; }
                pushToFirebase('customers', n.phone, n); // Sync new/updated
            } 
        });
        saveData(); renderCustomerTable(); 
        showLoading(false);
        showToast(`Imported/Updated ${added} customers.`, 'success');
    }});
}

function exportCustomers() {
    if(!customerDB.length) return showToast("No customers to export", "error");
    const data = customerDB.map(c => ({ Name: c.name, Phone: c.phone, Attn: c.attn || "", 'Alt Phone': c.altPhone || "", Address: c.address || "", GST: c.gst || "" }));
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.setAttribute('download', `Sagar_Customers_${new Date().toISOString().slice(0,10)}.csv`);
    a.click(); showToast("Customer list exported!", "success");
}

function debounceSearchCustomer(q, mode) { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => searchCustomer(q, mode), 300); }

function searchCustomer(q, mode) {
    const res = document.getElementById(mode === 'pos' ? 'customerResults' : 'ledgerCustResults');
    if(q.length < 3) { res.style.display = 'none'; return; }
    const lowerQ = q.toLowerCase();
    const hits = customerDB.filter(c => c.phone.includes(q) || c.name.toLowerCase().includes(lowerQ));
    res.innerHTML = hits.map(c => `<div class="search-item" onclick="pickCust('${c.phone}', '${mode}')"><b>${c.name}</b> (${c.phone})</div>`).join('');
    res.style.display = hits.length ? 'block' : 'none';
}

function pickCust(phone, mode) {
    const c = customerDB.find(x => x.phone === phone);
    if(mode === 'pos') {
        document.getElementById('custName').value = c.name; document.getElementById('custPhone').value = c.phone;
        document.getElementById('custAttn').value = c.attn||""; document.getElementById('custAddr').value = c.address||"";
        document.getElementById('customerResults').style.display = 'none';
    } else selectLedgerCustomer(phone);
}

function clearPosCustomer() {
    document.getElementById('custPhone').value=''; document.getElementById('custName').value=''; 
    document.getElementById('custAttn').value=''; document.getElementById('custAltPhone').value='';
    document.getElementById('custAddr').value=''; document.getElementById('custGst').value='';
}