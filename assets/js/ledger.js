// --- ADVANCED LEDGER & DYNAMIC INTEREST ENGINE ---

function refreshLedger() {
    renderLedgerView(document.getElementById('ledgerActivePhone').value);
}

function resetLedgerFilters() {
    ['ledgerFilterStart', 'ledgerFilterEnd', 'ledgerFilterType', 'ledgerFilterMode', 'ledgerFilterSearch'].forEach(id => document.getElementById(id).value = '');
    refreshLedger();
}

function getModeTagColor(mode) {
    if(mode === 'Credit') return 'tag-danger'; 
    if(mode === 'UPI' || mode === 'Bank') return 'tag-info'; 
    if(mode === 'Interest') return 'tag-warning'; 
    return 'tag-success'; 
}

function renderLedgerView(phone) {
    if(!phone) return;

    // 1. Setup UI State
    document.getElementById('ledgerActiveCustomer').classList.remove('hidden');
    document.getElementById('ledgerAccountsList').classList.add('hidden');
    document.getElementById('ledgerTransFormCard').style.opacity = '1';
    document.getElementById('ledgerTransFormCard').style.pointerEvents = 'auto';
    document.getElementById('ledgerCustResults').style.display = 'none';

    // 2. Render Header Info
    let cust = customerDB.find(c => c.phone === phone) || { name: "Unknown", phone: phone };
    document.getElementById('ledgerCustName').innerText = cust.name;
    document.getElementById('ledgerCustPhone').innerText = `Phone: ${cust.phone}`;
    document.getElementById('ledgerActivePhone').value = cust.phone;
    document.getElementById('btnLinkLedger').classList.toggle('hidden', !!customerDB.find(c => c.phone === phone));

    // ====================================================================
    // THE ARCHITECT'S FINANCIAL ENGINE (FIFO Declining Balance)
    // ====================================================================
    const allTxs = ledgerDB.filter(x => x.phone === phone).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const ratePerMonth = systemConfig.interestRate || 1.5; 
    const ratePerDay = (ratePerMonth / 100) / 30;
    const gracePeriodDays = systemConfig.gracePeriod || 30; 
    const msPerDay = 1000 * 60 * 60 * 24;
    
    let unpaidDebts = []; 
    let totalInterestAccrued = 0;
    let advanceCredit = 0;
    let lastDate = null;

    // Process History Chronologically
    allTxs.forEach(tx => {
        const txDate = new Date(tx.date).getTime();
        
        // Calculate Interest accrued since the last transaction
        if (lastDate && txDate > lastDate) {
            const daysPassed = (txDate - lastDate) / msPerDay;
            unpaidDebts.forEach(debt => {
                const graceExpiryDate = debt.date + (gracePeriodDays * msPerDay);
                let interestDays = 0;
                if (lastDate >= graceExpiryDate) { interestDays = daysPassed; } 
                else if (txDate > graceExpiryDate) { interestDays = (txDate - graceExpiryDate) / msPerDay; }
                
                if (interestDays > 0 && debt.remainingAmt > 0) {
                    const interest = debt.remainingAmt * ratePerDay * interestDays;
                    debt.interestAccrued += interest;
                    totalInterestAccrued += interest;
                }
            });
        }
        
        // Apply Transaction
        if (tx.type === 'DEBIT') {
            let amtToDebt = tx.amount;
            if (advanceCredit > 0) {
                if (advanceCredit >= amtToDebt) { advanceCredit -= amtToDebt; amtToDebt = 0; } 
                else { amtToDebt -= advanceCredit; advanceCredit = 0; }
            }
            if (amtToDebt > 0) {
                unpaidDebts.push({ id: tx.id, desc: tx.desc, originalAmt: tx.amount, remainingAmt: amtToDebt, date: txDate, interestAccrued: 0 });
            }
        } else if (tx.type === 'CREDIT') {
            let paymentAvailable = tx.amount;
            // Pay off interest first
            if (totalInterestAccrued > 0) {
                if (paymentAvailable >= totalInterestAccrued) {
                    paymentAvailable -= totalInterestAccrued; totalInterestAccrued = 0;
                    unpaidDebts.forEach(d => d.interestAccrued = 0);
                } else {
                    totalInterestAccrued -= paymentAvailable;
                    for(let d of unpaidDebts) {
                        if(paymentAvailable <= 0) break;
                        if(d.interestAccrued > 0) {
                            if(paymentAvailable >= d.interestAccrued) { paymentAvailable -= d.interestAccrued; d.interestAccrued = 0; } 
                            else { d.interestAccrued -= paymentAvailable; paymentAvailable = 0; }
                        }
                    }
                    paymentAvailable = 0;
                }
            }
            // Pay off principal (FIFO)
            if (paymentAvailable > 0) {
                for(let i=0; i<unpaidDebts.length; i++) {
                    let debt = unpaidDebts[i];
                    if (paymentAvailable <= 0) break;
                    if (paymentAvailable >= debt.remainingAmt) { paymentAvailable -= debt.remainingAmt; debt.remainingAmt = 0; } 
                    else { debt.remainingAmt -= paymentAvailable; paymentAvailable = 0; }
                }
                unpaidDebts = unpaidDebts.filter(d => d.remainingAmt > 0);
            }
            // Leftover is Advance Credit
            if (paymentAvailable > 0) advanceCredit += paymentAvailable;
        }
        lastDate = txDate;
    });
    
    // Fast-forward to TODAY
    const todayMs = Date.now();
    if (lastDate && todayMs > lastDate) {
        const daysPassed = (todayMs - lastDate) / msPerDay;
        unpaidDebts.forEach(debt => {
            const graceExpiryDate = debt.date + (gracePeriodDays * msPerDay);
            let interestDays = 0;
            if (lastDate >= graceExpiryDate) { interestDays = daysPassed; } 
            else if (todayMs > graceExpiryDate) { interestDays = (todayMs - graceExpiryDate) / msPerDay; }
            if (interestDays > 0 && debt.remainingAmt > 0) {
                const interest = debt.remainingAmt * ratePerDay * interestDays;
                debt.interestAccrued += interest; totalInterestAccrued += interest;
            }
        });
    }
    
    const totalPrincipalOutstanding = unpaidDebts.reduce((sum, d) => sum + d.remainingAmt, 0);
    const totalDue = (totalPrincipalOutstanding + totalInterestAccrued) - advanceCredit;

    // UI RENDERING
    document.getElementById('ledgerBalanceDisplay').innerHTML = `
        <div style="font-size: 1.1rem; color: var(--text); display:flex; justify-content:space-between;"><span>Active Principal:</span> <span>₹${totalPrincipalOutstanding.toFixed(2)}</span></div>
        <div style="font-size: 1.1rem; color: var(--warning-text); display:flex; justify-content:space-between;"><span>Pending Interest:</span> <span>+ ₹${totalInterestAccrued.toFixed(2)}</span></div>
        ${advanceCredit > 0 ? `<div style="font-size: 1.1rem; color: var(--success); display:flex; justify-content:space-between;"><span>Advance Credit:</span> <span>- ₹${advanceCredit.toFixed(2)}</span></div>` : ''}
        <hr style="border-color: var(--border); margin: 8px 0;">
        <div style="font-size: 2.2rem; color: ${totalDue > 0 ? "var(--danger)" : "var(--success)"}; text-align:right;">₹${Math.abs(totalDue).toFixed(2)}</div>
    `;
    document.getElementById('ledgerBalanceLabel').innerText = totalDue > 0 ? "Total Due Now" : "Advance Balance";

    const tbody = document.getElementById('ledgerTableBody'); tbody.innerHTML = '';

    // Render Active Unpaid Loans
    if (unpaidDebts.length > 0) {
        tbody.innerHTML += `<tr><td colspan="7" style="background:#f1f5f9; text-align:center; font-weight:bold; font-size:0.8rem; color:var(--text-light); letter-spacing:1px; border-bottom: 2px solid var(--border);">--- CURRENT ACTIVE LOAN BREAKDOWN ---</td></tr>`;
        unpaidDebts.forEach(d => {
            const daysOld = Math.floor((todayMs - d.date) / msPerDay);
            const isBleeding = daysOld > gracePeriodDays;
            tbody.innerHTML += `
            <tr style="background: ${isBleeding ? 'rgba(245, 158, 11, 0.05)' : 'var(--surface)'};">
                <td style="font-family:'Fira Code', monospace; font-size:0.8rem;">${formatDate(new Date(d.date))}</td>
                <td><div style="font-weight:600; color:var(--primary);">${escapeHtml(d.desc)}</div><div style="font-size:0.75rem; color:var(--text-light);">${daysOld} days old</div></td>
                <td><span class="tag tag-info">UNPAID</span></td>
                <td>System</td>
                <td class="text-right"><div style="font-size:0.75rem; text-decoration:line-through; color:var(--text-light);">₹${d.originalAmt.toFixed(2)}</div><div style="color:var(--danger); font-weight:bold;">₹${d.remainingAmt.toFixed(2)}</div></td>
                <td class="text-right" style="color:var(--warning-text); font-weight:bold;">${d.interestAccrued > 0 ? '+ ₹'+d.interestAccrued.toFixed(2) : '-'}</td>
                <td class="text-right"><i class="fas fa-lock" style="color:var(--text-light); opacity:0.5;"></i></td>
            </tr>`;
        });
        tbody.innerHTML += `<tr><td colspan="7" style="background:#f1f5f9; text-align:center; font-weight:bold; font-size:0.8rem; color:var(--text-light); letter-spacing:1px; border-top: 2px solid var(--border); border-bottom: 2px solid var(--border);">--- HISTORICAL TRANSACTIONS ---</td></tr>`;
    }

    // Render Normal History
    const fStart = document.getElementById('ledgerFilterStart').value;
    const fEnd = document.getElementById('ledgerFilterEnd').value;
    const fType = document.getElementById('ledgerFilterType').value;
    const fMode = document.getElementById('ledgerFilterMode').value;
    const fSearch = document.getElementById('ledgerFilterSearch').value.toLowerCase();

    const filteredTxs = allTxs.filter(tx => {
        if(fStart && tx.date < fStart) return false;
        if(fEnd && tx.date > fEnd) return false;
        if(fType && tx.type !== fType) return false;
        if(fMode && (tx.mode || 'Cash') !== fMode) return false;
        if(fSearch && !(tx.desc || '').toLowerCase().includes(fSearch)) return false;
        return true;
    }).reverse();

    if (filteredTxs.length === 0) {
        tbody.innerHTML += `<tr><td colspan="7" style="text-align:center; padding:20px;">No matching transactions found.</td></tr>`;
    } else {
        filteredTxs.forEach(tx => {
            let tagClass = getModeTagColor(tx.mode);
            tbody.innerHTML += `
            <tr style="transition: background 0.1s;">
                <td style="font-family:'Fira Code', monospace; font-size:0.85rem;">${formatDate(tx.date)}</td>
                <td><div style="font-weight:600;">${escapeHtml(tx.desc)}</div></td>
                <td><span class="tag ${tagClass}">${tx.mode || 'Cash'}</span></td>
                <td><span style="font-size:0.8rem; color:var(--text-light);"><i class="fas fa-user"></i> ${tx.cashier || 'Admin'}</span></td>
                <td class="text-right" style="color:var(--danger); font-weight:600;">${tx.type === 'DEBIT' ? '₹' + tx.amount.toFixed(2) : ''}</td>
                <td class="text-right" style="color:var(--success); font-weight:600;">${tx.type === 'CREDIT' ? '₹' + tx.amount.toFixed(2) : ''}</td>
                <td class="text-right">
                    <div class="action-group">
                        <button class="action-btn edit" onclick="editLedgerEntry('${tx.id}')"><i class="fas fa-pen"></i></button>
                        <button class="action-btn delete" onclick="deleteLedgerEntry('${tx.id}')"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </td>
            </tr>`;
        });
    }
}

function addLedgerEntry(type) {
    const phone = document.getElementById('ledgerActivePhone').value;
    const amt = parseFloat(document.getElementById('ledgerTxAmount').value);
    if(!phone || amt <= 0) return showToast("Invalid Data", 'error');
    
    const obj = { 
        id: document.getElementById('editLedgerId').value || generateUUID(), 
        phone: phone, 
        date: document.getElementById('ledgerTxDate').value, 
        type: type, 
        amount: amt, 
        desc: document.getElementById('ledgerTxDesc').value, 
        mode: document.getElementById('ledgerTxMode').value, 
        timestamp: Date.now(),
        cashier: document.getElementById('activeCashier').value // Track Cashier
    };
    
    if(document.getElementById('editLedgerId').value) { 
        const idx = ledgerDB.findIndex(x => x.id === obj.id); 
        if(idx !== -1) ledgerDB[idx] = obj; 
    } else {
        ledgerDB.push(obj);
    }
    
    pushToFirebase('ledger', obj.id, obj);
    saveData(); cancelLedgerEdit(); renderLedgerView(phone); showToast("Saved", 'success');
}

function editLedgerEntry(id) {
    const tx = ledgerDB.find(x => x.id === id); if(!tx) return;
    document.getElementById('ledgerTxDate').value = tx.date; document.getElementById('ledgerTxAmount').value = tx.amount;
    document.getElementById('ledgerTxDesc').value = tx.desc; document.getElementById('ledgerTxMode').value = tx.mode || 'Cash';
    document.getElementById('editLedgerId').value = tx.id; document.getElementById('ledgerTxTitle').innerText = "Edit Transaction";
    document.getElementById('ledgerEditControls').style.display = 'block';
}

function cancelLedgerEdit() { document.getElementById('ledgerTxTitle').innerText = "New Transaction"; document.getElementById('ledgerTxAmount').value = ''; document.getElementById('editLedgerId').value = ''; document.getElementById('ledgerEditControls').style.display = 'none'; }
function deleteLedgerEntry(id) { verifyPin(() => { if(confirm("Delete transaction?")) { ledgerDB = ledgerDB.filter(x => x.id !== id); saveData(); renderLedgerView(document.getElementById('ledgerActivePhone').value); } }); }
function clearCustomerLedger() { verifyPin(() => { if(confirm("Clear history? Creating Backup first...")) { backupData('ledger'); setTimeout(() => { ledgerDB = ledgerDB.filter(x => x.phone !== document.getElementById('ledgerActivePhone').value); saveData(); renderLedgerView(document.getElementById('ledgerActivePhone').value); }, 1000); } }); }
function selectLedgerCustomer(phone) { document.getElementById('ledgerSearchInput').value = ''; renderLedgerView(phone); }

function printLedger() {
    const { jsPDF } = window.jspdf; const doc = new jsPDF();
    const phone = document.getElementById('ledgerActivePhone').value; const cust = customerDB.find(c => c.phone === phone);
    const txs = ledgerDB.filter(x => x.phone === phone).sort((a,b) => new Date(a.date) - new Date(b.date));
    doc.text(`Statement: ${cust ? cust.name : phone}`, 14, 20);
    let bal = 0; 
    const rows = txs.map(tx => { if(tx.type==='DEBIT') bal+=tx.amount; else bal-=tx.amount; return [formatDate(tx.date), tx.desc, tx.mode, tx.type==='DEBIT'?tx.amount:'', tx.type==='CREDIT'?tx.amount:'', bal.toFixed(2)]; });
    doc.autoTable({ startY: 30, head:[['Date','Desc','Mode','Dr','Cr','Bal']], body:rows });
    doc.save(`Ledger_${phone}.pdf`);
}