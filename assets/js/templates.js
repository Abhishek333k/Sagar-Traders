// ============================================================================
// TEMPLATE ENGINE (assets/js/templates.js)
// ============================================================================

Handlebars.registerHelper("index_1", function(options) { return options.data.index + 1; });

const DEFAULT_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Invoice {{invoice.no}}</title>
    <style>
        @page { margin: 0; size: A4; }
        body { font-family: 'Helvetica', sans-serif; background: #fff; color: #000; padding: 20px; font-size: 12px; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
        .logo-box img { max-width: 100px; max-height: 80px; }
        .invoice-title { font-size: 24px; font-weight: bold; text-align: right; }
        .info-grid { display: flex; justify-content: space-between; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background-color: #eee; padding: 8px; text-align: left; border-bottom: 2px solid #000; }
        td { padding: 8px; border-bottom: 1px solid #ccc; }
        .text-right { text-align: right; }
        .totals { float: right; width: 250px; }
        .totals div { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dotted #ccc; }
        .totals .grand { font-weight: bold; font-size: 16px; border-bottom: 2px solid #000; }
        .footer { clear: both; margin-top: 40px; padding-top: 10px; border-top: 1px solid #000; font-size: 10px; color: #555; }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <div class="logo-box"><img src="{{company.logo}}" onerror="this.style.display='none'"></div>
            <h2>{{company.name}}</h2><p>{{company.address}}</p>
        </div>
        <div class="invoice-title">
            INVOICE<br><small style="font-size:12px; font-weight:normal;">{{invoice.mode}}</small>
        </div>
    </div>
    <div class="info-grid">
        <div>
            <strong>BILL TO:</strong><br>{{customer.name}}<br>{{customer.phone}}<br>{{customer.address}}<br>{{#if customer.gst}}GSTIN: {{customer.gst}}{{/if}}
        </div>
        <div class="text-right">
            <strong>Inv No:</strong> {{invoice.no}}<br>
            <strong>Date:</strong> {{invoice.date}}
        </div>
    </div>
    <table>
        <thead><tr><th>#</th><th>Description</th><th class="text-right">Qty</th><th class="text-right">Rate</th><th class="text-right">Total</th></tr></thead>
        <tbody>
            {{#each items}}<tr><td>{{@index_1}}</td><td>{{this.desc}}{{#if this.gst}}<br><small>GST {{this.gst}}%</small>{{/if}}</td><td class="text-right">{{this.qty}}</td><td class="text-right">{{this.rate}}</td><td class="text-right">{{this.total}}</td></tr>{{/each}}
        </tbody>
    </table>
    <div class="totals">
        <div><span>Subtotal:</span><span>{{totals.sub}}</span></div>
        <div data-visibility="{{totals.tax}}"><span>Tax:</span><span>{{totals.tax}}</span></div>
        <div data-visibility="{{totals.discount}}"><span>Discount:</span><span>-{{totals.discount}}</span></div>
        <div class="grand"><span>Total:</span><span>{{totals.grand}}</span></div>
        <div style="font-style:italic; font-size:9px;">{{totals.inWords}}</div>
    </div>
    <div class="footer">{{{company.footer}}}</div>
</body>
</html>`;

const PRESET_TEMPLATES = { 'default': DEFAULT_TEMPLATE }; // Expandable in the future

const PAYMENT_SLIP_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
    <style>
        @page { size: A5; margin: 0; } 
        body { font-family: sans-serif; background: #f8fafc; padding: 20px; }
        .card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 148mm; margin: 0 auto; text-align: center; padding-bottom:20px; }
        .header { background: #0f172a; color: white; padding: 20px; border-radius: 12px 12px 0 0; }
        .amount { font-size: 32px; font-weight: bold; margin: 20px 0; }
        .qr-box { display: inline-block; padding: 10px; border: 2px dashed #2563eb; border-radius: 8px; }
        .bank-box { background: #f1f5f9; padding: 15px; margin: 20px; text-align: left; border-radius: 8px; font-size:12px; }
        .bank-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header"><h2>Payment Advice</h2><p>{{company.name}}</p></div>
        <div class="amount">{{#if amount}}₹{{amount}}{{else}}Scan & Enter Amount{{/if}}</div>
        <div class="qr-box"><img src="{{qrCode}}" width="180" height="180"></div>
        <div class="bank-box">
            <strong>Bank Transfer Details</strong><br><br>
            <div class="bank-row"><span>Account Name:</span> <span>{{bank.accName}}</span></div>
            <div class="bank-row"><span>Account No:</span> <span>{{bank.accNo}}</span></div>
            <div class="bank-row"><span>Bank / IFSC:</span> <span>{{bank.bankName}} / {{bank.ifsc}}</span></div>
        </div>
    </div>
</body>
</html>`;

function openTemplateModal() { document.getElementById('settingInvoiceTemplate').value = systemConfig.invoiceTemplate || DEFAULT_TEMPLATE; document.getElementById('templateModal').style.display = 'flex'; }
function closeTemplateModal() { document.getElementById('templateModal').style.display = 'none'; }
function loadPreset(presetName) {
    if(!PRESET_TEMPLATES[presetName]) return;
    if(document.getElementById('settingInvoiceTemplate').value.trim().length > 0) { if(!confirm("⚠️ Replace current code?")) { document.getElementById('presetSelector').value = ""; return; } }
    document.getElementById('settingInvoiceTemplate').value = PRESET_TEMPLATES[presetName];
}
function saveTemplateFromModal() { systemConfig.invoiceTemplate = document.getElementById('settingInvoiceTemplate').value; localStorage.setItem('sagar_sys_config', JSON.stringify(systemConfig)); showToast("Template saved", 'success'); closeTemplateModal(); }
function resetPrintTemplate() { if(confirm("Reset to default?")) { document.getElementById('settingInvoiceTemplate').value = DEFAULT_TEMPLATE; } }
function copyToClip(text) { navigator.clipboard.writeText(text).then(() => showToast("Copied: " + text, 'info')); }

function reconstructInvoiceHTML(sale) {
    let sub = 0, tax = 0;
    const itemsFormatted = sale.items.map(i => {
        const base = i.rate * i.qty; const t = (base * (i.gst || 0)) / 100;
        sub += base; tax += t;
        return { desc: i.desc, qty: i.qty, rate: i.rate, total: (base + t).toFixed(2), gst: i.gst, hsn: i.hsn || '' };
    });
    
    const disc = ((sub + tax) - sale.amt);
    const bankProfile = bankProfiles.find(p => p.id === activeBankId) || bankProfiles[0] || {};

    const data = {
        isCredit: sale.paymentMode === 'Credit',
        company: { name: 'SAGAR TRADERS', address: 'Mangalagiri', logo: systemConfig.logoUrl, footer: systemConfig.printFooter },
        invoice: { no: sale.invoiceNo, date: formatDate(sale.date), mode: sale.mode || 'Retail' },
        customer: { name: sale.custDetails?.name, phone: sale.custDetails?.phone, address: sale.custDetails?.address, gst: sale.custDetails?.gst },
        items: itemsFormatted,
        totals: { sub: sub.toFixed(2), tax: tax.toFixed(2), discount: disc > 0.01 ? disc.toFixed(2) : null, grand: sale.amt.toFixed(2), inWords: numberToWords(sale.amt) }, 
        bank: bankProfile 
    };

    try { return Handlebars.compile(systemConfig.invoiceTemplate || DEFAULT_TEMPLATE)(data); } catch(e) { return Handlebars.compile(DEFAULT_TEMPLATE)(data); }
}

function openPrintPreview(saleId) {
    const sale = salesHistory.find(s => s.id === saleId); if(!sale) return;
    currentPreviewSale = sale; document.getElementById('previewInvNo').innerText = sale.invoiceNo;
    document.getElementById('previewFrame').srcdoc = reconstructInvoiceHTML(sale);
    document.getElementById('previewModal').style.display = 'flex';
}

function closePreview() { document.getElementById('previewModal').style.display = 'none'; currentPreviewSale = null; }
function reprintCurrent() { const f = document.getElementById('previewFrame'); f.contentWindow.focus(); f.contentWindow.print(); }
function generatePrintHTML(invNo) { return reconstructInvoiceHTML({ items: invoiceItems, amt: parseFloat(document.getElementById('grandTotal').innerText.replace('₹','')), invoiceNo: invNo, date: new Date().toISOString(), mode: document.getElementById('invMode').value, paymentMode: document.getElementById('paymentMode').value, custDetails: { name: document.getElementById('custName').value, phone: document.getElementById('custPhone').value }}); }

function shareWhatsappFromPreview() {
    if(currentPreviewSale) {
        const p = getActiveUpi();
        const text = `*INVOICE - Sagar Traders*\nInv No: ${currentPreviewSale.invoiceNo}\nAmount: ₹${currentPreviewSale.amt}\nPay via UPI: ${p.upiId}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
}

function printPaymentSlip() {
    const grandTotal = parseFloat(document.getElementById('grandTotal').innerText.replace('₹','')) || 0;
    const upiProfile = getActiveUpi(); const bankProfile = bankProfiles.find(p => p.id === activeBankId) || bankProfiles[0] || {};
    let qrData = `upi://pay?pa=${upiProfile.upiId}&pn=${encodeURIComponent(upiProfile.upiName)}&cu=INR`;
    if(grandTotal > 0) qrData += `&am=${grandTotal.toFixed(2)}`;
    
    const html = Handlebars.compile(PAYMENT_SLIP_TEMPLATE)({ company: { name: 'SAGAR TRADERS' }, amount: grandTotal > 0 ? grandTotal.toFixed(2) : null, qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`, bank: bankProfile });
    const win = window.open('', '_blank', 'width=500,height=700'); win.document.write(html); win.document.close(); win.onload = () => { win.focus(); win.print(); };
}