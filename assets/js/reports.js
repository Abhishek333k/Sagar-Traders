function renderSalesReports() {
    const fromDate = document.getElementById('reportFromDate').value;
    const toDate = document.getElementById('reportToDate').value;
    const filtered = salesHistory.filter(s => s.date.split('T')[0] >= fromDate && s.date.split('T')[0] <= toDate);

    let total = 0, cash = 0, upi = 0, credit = 0;
    filtered.forEach(s => {
        if(s.status === 'VOID') return; 
        total += s.amt;
        if(s.paymentMode === 'Split' && s.splitDetails) {
            cash += s.splitDetails.cash || 0; upi += s.splitDetails.upi || 0;
        } else if(s.paymentMode === 'Cash') cash += s.amt;
        else if(s.paymentMode === 'Credit') credit += s.amt;
        else upi += s.amt;
    });

    document.getElementById('repTotalSales').innerText = "₹" + total.toLocaleString('en-IN');
    document.getElementById('repCashSales').innerText = "₹" + cash.toLocaleString('en-IN');
    document.getElementById('repUpiSales').innerText = "₹" + upi.toLocaleString('en-IN');
    document.getElementById('repCreditSales').innerText = "₹" + credit.toLocaleString('en-IN');

    const tbody = document.getElementById('salesTableBody'); tbody.innerHTML = '';
    filtered.forEach((sale) => {
        const isVoid = sale.status === 'VOID';
        tbody.innerHTML += `
            <tr class="${isVoid ? 'row-void' : ''}">
                <td>${formatDate(sale.date)}</td> 
                <td style="font-family:'Fira Code', monospace; font-size:0.8rem;">${sale.invoiceNo} ${isVoid ? '<span class="tag tag-void">VOID</span>' : ''}</td>
                <td style="font-weight:600;">${escapeHtml(sale.cust)}</td>
                <td><span class="tag ${sale.paymentMode==='Credit'?'tag-danger':'tag-success'}">${sale.paymentMode || 'Cash'}</span></td>
                <td style="font-size:0.8rem; color:var(--text-light);"><i class="fas fa-user-circle"></i> ${sale.cashier || 'Admin'}</td>
                <td class="text-right" style="font-weight:bold;">₹${sale.amt.toFixed(2)}</td>
                <td class="text-right">
                    <div class="action-group">
                        ${!isVoid ? `<button class="action-btn edit" onclick="openPrintPreview('${sale.id}')" title="View"><i class="fas fa-eye"></i></button>` : ''}
                        ${!isVoid ? `<button class="action-btn delete" onclick="voidSaleEntry('${sale.id}')" title="Void"><i class="fas fa-ban"></i></button>` : '<small>Voided</small>'}
                    </div>
                </td>
            </tr>`;
    });
}

function voidSaleEntry(id) {
    verifyPin(() => {
        if(!confirm("WARNING: Voiding this bill removes it from profit stats but keeps the record. Continue?")) return;
        const reason = prompt("Reason for voiding (e.g., Mistake, Return):");
        if(!reason) return;
        
        const sale = salesHistory.find(s => s.id === id);
        if(sale) {
            sale.status = 'VOID';
            sale.voidReason = reason;
            sale.voidedBy = document.getElementById('activeCashier').value; // Track who voided it
            
            if (navigator.onLine && typeof auth !== 'undefined' && auth.currentUser) {
                db.collection('sales').doc(id).update({ status: 'VOID', voidReason: reason, voidedBy: sale.voidedBy });
            }
            saveData(); renderSalesReports(); renderDashboard(); 
            showToast("Bill Voided successfully", 'warning');
        }
    });
}

function exportSalesReport() {
    const fromDate = document.getElementById('reportFromDate').value;
    const toDate = document.getElementById('reportToDate').value;
    const filtered = salesHistory.filter(s => s.date.split('T')[0] >= fromDate && s.date.split('T')[0] <= toDate);
    const data = filtered.map(s => ({ 
        Date: new Date(s.date).toLocaleDateString(), InvoiceNo: s.invoiceNo, Status: s.status || 'Active',
        Customer: s.cust, PaymentMode: s.paymentMode || 'Cash', Cashier: s.cashier || 'Admin', Amount: s.status === 'VOID' ? 0 : s.amt
    }));
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([Papa.unparse(data)], {type: 'text/csv'}));
    a.download = `SalesReport_${fromDate}_to_${toDate}.csv`; a.click();
}

function clearSalesHistory() {
    verifyPin(() => { if(confirm("WARNING: Creating Backup before deleting all sales history...")) { backupData('sales'); setTimeout(() => { salesHistory = []; saveData(); renderSalesReports(); }, 1500); } });
}

// --- Z-REPORT (End of Day) ---
function generateEODReport() {
    const { jsPDF } = window.jspdf; const doc = new jsPDF();
    const todayStr = new Date().toISOString().split('T')[0];
    const todaysSales = salesHistory.filter(s => s.date.startsWith(todayStr) && s.status !== 'VOID');
    
    let c=0, u=0, cr=0, b=0, tax=0;
    todaysSales.forEach(s => {
        if(s.paymentMode==='Split' && s.splitDetails) { c+=s.splitDetails.cash||0; u+=s.splitDetails.upi||0; }
        else if(s.paymentMode==='Cash') c+=s.amt; else if(s.paymentMode==='UPI') u+=s.amt; else if(s.paymentMode==='Credit') cr+=s.amt; else b+=s.amt;
        s.items.forEach(i => { tax += (i.rate * Math.abs(i.qty) * (i.gst||0)/100); });
    });

    doc.setFontSize(18); doc.text("END OF DAY (Z-REPORT)", 14, 20);
    doc.setFontSize(10); doc.text(`Date: ${formatDate(new Date())}   |   Generated By: ${document.getElementById('activeCashier').value}`, 14, 28);
    
    doc.autoTable({ 
        startY: 35, head: [['Metric', 'Amount (INR)']], 
        body: [ 
            ['Total Bills Generated', todaysSales.length], 
            ['Cash Collected', c.toFixed(2)], 
            ['UPI / Digital', u.toFixed(2)], 
            ['Bank Transfer', b.toFixed(2)], 
            ['Credit Given (Khata)', cr.toFixed(2)], 
            ['Total Tax Collected (GST)', tax.toFixed(2)], 
            ['GRAND TOTAL REVENUE', (c+u+b+cr).toFixed(2)] 
        ], theme: 'grid' 
    });
    
    doc.save(`Z_Report_${todayStr}.pdf`);
    showToast("EOD PDF Downloaded", "success");
}