// --- PRODUCT DATABASE ---

function populateFilters() {
    const cats = new Set(), types = new Set(), hps = new Set();
    Object.values(productDB).forEach(item => { if(item.category) cats.add(item.category); if(item.pumpType) types.add(item.pumpType); if(item.hp) hps.add(item.hp); });
    
    const catSel = document.getElementById('filterCat'), typeSel = document.getElementById('filterType'), hpSel = document.getElementById('filterHp');
    if(!catSel || !typeSel || !hpSel) return;
    
    catSel.length = 1; typeSel.length = 1; hpSel.length = 1;
    Array.from(cats).sort().forEach(c => catSel.add(new Option(c, c)));
    Array.from(types).sort().forEach(t => typeSel.add(new Option(t, t)));
    Array.from(hps).sort().forEach(h => hpSel.add(new Option(h, h)));
}

function renderProductTable() {
    const q = document.getElementById('prodSearch').value.toLowerCase();
    const fCat = document.getElementById('filterCat').value;
    const fType = document.getElementById('filterType').value;
    const fHp = document.getElementById('filterHp').value;
    
    const tbody = document.querySelector('#prodTable tbody'); 
    if(!tbody) return;
    tbody.innerHTML = '';

    Object.entries(productDB)
        .filter(([sku, item]) => 
            (sku.toLowerCase().includes(q) || (item.desc && item.desc.toLowerCase().includes(q))) && 
            (!fCat || item.category === fCat) && (!fType || item.pumpType === fType) && (!fHp || item.hp === fHp)
        )
        .slice(0, 100)
        .forEach(([sku, item]) => {
            const stockColor = item.stock < 5 ? 'color:var(--danger); font-weight:bold;' : 'color:var(--success);';
            tbody.innerHTML += `
            <tr>
                <td style="font-family:'Fira Code', monospace; font-weight:bold; color:var(--primary);">${sku}</td>
                <td><div style="font-weight:600;">${escapeHtml(item.desc)}</div><small style="color:var(--text-light); font-size:0.75rem;">${item.category||''} ${item.pumpType||''} ${item.hp||''}</small></td>
                <td style="font-size:0.85rem;">${item.category||'-'}</td>
                <td class="text-right" style="font-family:'Fira Code', monospace; color:var(--text-light);">₹${item.purchaseRate||0}</td>
                <td class="text-right" style="font-family:'Fira Code', monospace; font-weight:bold; color:var(--text);">₹${item.rate}</td>
                <td class="text-right" style="${stockColor} font-family:'Fira Code', monospace;">${item.stock}</td>
                <td class="text-right">
                    <div class="action-group">
                        <button class="action-btn edit" onclick="openProductModal('${sku}')"><i class="fas fa-pen"></i></button>
                        <button class="action-btn delete" onclick="deleteProduct('${sku}')"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </td>
            </tr>`;
        });
}

function openProductModal(sku = null) {
    document.getElementById('prodModal').style.display = 'flex';
    if(sku) {
        const item = productDB[sku];
        document.getElementById('editProdOriginalSku').value = sku; document.getElementById('mProdSku').value = sku; document.getElementById('mProdSku').disabled = true;
        document.getElementById('mProdDesc').value = item.desc; document.getElementById('mProdCat').value = item.category||""; document.getElementById('mProdType').value = item.pumpType||"";
        document.getElementById('mProdHp').value = item.hp||""; document.getElementById('mProdRate').value = item.rate; document.getElementById('mProdPurchase').value = item.purchaseRate||""; document.getElementById('mProdStock').value = item.stock;
        document.getElementById('prodModalTitle').innerText = "Edit Product";
    } else {
        document.getElementById('prodModalTitle').innerText = "Add Product"; document.getElementById('editProdOriginalSku').value = ""; document.getElementById('mProdSku').disabled = false;
        ['mProdSku','mProdDesc','mProdCat','mProdType','mProdHp','mProdRate','mProdPurchase','mProdStock'].forEach(id=>document.getElementById(id).value='');
    }
}
function closeProdModal() { document.getElementById('prodModal').style.display = 'none'; }

function saveProduct() {
    const sku = document.getElementById('mProdSku').value.trim().toUpperCase(); const desc = document.getElementById('mProdDesc').value.trim();
    if(!sku || !desc) return showToast("SKU/Desc required", 'error');
    productDB[sku] = {
        desc, category: document.getElementById('mProdCat').value, pumpType: document.getElementById('mProdType').value, hp: document.getElementById('mProdHp').value,
        rate: parseFloat(document.getElementById('mProdRate').value)||0, purchaseRate: parseFloat(document.getElementById('mProdPurchase').value)||0, stock: parseInt(document.getElementById('mProdStock').value)||0
    };
    saveData(); renderProductTable(); populateFilters(); closeProdModal(); showToast("Saved", 'success');
}

function deleteProduct(sku) { verifyPin(() => { if(confirm("Delete product?")) { delete productDB[sku]; saveData(); renderProductTable(); } }); }

function downloadTemplate() {
    const data = Object.entries(productDB).map(([sku, i]) => ({ "Item Code": sku, "Item Description": i.desc, "Category": i.category, "Pump Type": i.pumpType, "HP": i.hp, "Sale Price ": i.rate, "Purchase Price": i.purchaseRate||0, "Stock": i.stock }));
    if(!data.length) data.push({"Item Code":"TEST","Item Description":"Test","Sale Price ":100,"Purchase Price":80,"Stock":10});
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([Papa.unparse(data)], {type:'text/csv'})); a.download = 'Stock.csv'; a.click();
}
function exportProducts() { downloadTemplate(); }

function processDbFiles() {
    const file = document.getElementById('dbFiles').files[0]; if(!file) return;
    Papa.parse(file, { header:true, skipEmptyLines:true, complete: r => {
        let count = 0; r.data.forEach(d => {
            const sku = d["Item Code"]; if(!sku) return;
            const old = productDB[sku] || {};
            productDB[sku] = {
                desc: d["Item Description"] || old.desc || "Unknown",
                category: d["Category"] || old.category || "", pumpType: d["Pump Type"] || old.pumpType || "", hp: d["HP"] || old.hp || "",
                rate: parseFloat(d["Sale Price "] || d["Sale Price"] || old.rate || 0),
                purchaseRate: parseFloat(d["Purchase Price"] || old.purchaseRate || 0),
                stock: d["Stock"] ? parseInt(d["Stock"]) : (d["Qty"] ? parseInt(d["Qty"]) : old.stock||0)
            }; count++;
        });
        saveData(); renderProductTable(); alert(`Processed ${count} items.`);
    }});
}
function clearDatabase() { verifyPin(() => { if(prompt("Type DELETE")==='DELETE') { productDB={}; saveData(); renderProductTable(); } }); }

function syncProductsFromCloud() {
    if(!systemConfig.productSyncUrl) {
        showToast("Please set Product DB URL in Settings first", "error");
        showSection('settings', document.querySelector('.sidebar .nav-item:nth-child(9)')); 
        return;
    }
    showLoading(true, "Syncing Product Database...");
    fetch(systemConfig.productSyncUrl)
        .then(response => response.json())
        .then(data => {
            if(data && Object.keys(data).length > 0) {
                productDB = data; saveData(); renderProductTable(); populateFilters();
                document.getElementById('dbCount').innerText = Object.keys(productDB).length;
                showToast(`Synced ${Object.keys(productDB).length} products.`, "success"); AudioEngine.playSuccess();
            } else throw new Error("Received Empty Data");
        })
        .catch(err => { console.error(err); showToast("Sync Failed. Check URL.", "error"); AudioEngine.playError(); })
        .finally(() => showLoading(false));
}

function debounceSearchProduct(q) { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => searchProductByName(q), 300); }
function searchProductByName(q) {
    const res = document.getElementById('productResults');
    if(q.length < 2) { res.style.display='none'; return; }
    const lowerQ = q.toLowerCase();
    const hits = Object.entries(productDB).filter(([sku, i]) => i.desc.toLowerCase().includes(lowerQ) || sku.toLowerCase().includes(lowerQ)).slice(0, 10);
    res.innerHTML = hits.map(([sku, i]) => `<div class="search-item" onclick="fetchProductBySku('${sku}')"><b>${i.desc}</b> (${sku})<br>₹${i.rate} | Stock: ${i.stock}</div>`).join('');
    res.style.display = hits.length ? 'block' : 'none';
}
function fetchProductBySku(sku) {
    sku = sku.trim().toUpperCase(); if(/^\d+$/.test(sku)) sku = "IN"+sku; document.getElementById('skuInput').value = sku;
    const i = productDB[sku];
    if(i) {
        document.getElementById('itemDesc').value = i.desc; document.getElementById('itemRate').value = i.rate;
        const stockLabel = document.getElementById('stockDisplay');
        
        // [v6.2] Show true available stock factoring in active cart reservations
        const available = i.stock - (reservedStock[sku] || 0);
        stockLabel.innerText = "Stock: " + available;
        stockLabel.style.color = (available < 5) ? '#ef4444' : '#22c55e'; 
        
        document.getElementById('itemQty').focus(); document.getElementById('itemQty').select();
        document.getElementById('productResults').style.display='none';
    } else { document.getElementById('stockDisplay').innerText = "Not Found"; }
}