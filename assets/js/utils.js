// --- UTILITY FUNCTIONS ---

function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function formatDate(dateInput) {
    if (!dateInput) return "";
    const d = new Date(dateInput);
    const pad = (n) => n.toString().padStart(2, '0');
    return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
}

function escapeHtml(t) { 
    return t ? t.toString().replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;") : ''; 
}

function normalizePhone(phone) {
    if (!phone) return "";
    let clean = phone.toString().replace(/\D/g, '');
    if (clean.length === 12 && clean.startsWith('91')) clean = clean.substring(2);
    if (clean.length === 11 && clean.startsWith('0')) clean = clean.substring(1);
    return clean;
}

function numberToWords(price) {
    var sglDigit = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"],
        dblDigit = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"],
        tensPlace = ["", "Ten", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"],
        handle_tens = function(dgt, prevDgt) { return 0 == dgt ? "" : " " + (1 == dgt ? dblDigit[prevDgt] : tensPlace[dgt]) },
        handle_utlc = function(dgt, nxtDgt, denom) { return (0 != dgt && 1 != nxtDgt ? " " + sglDigit[dgt] : "") + (0 != nxtDgt || dgt > 0 ? " " + denom : "") };

    var str = "", digitIdx = 0, digit = 0, nxtDigit = 0, words = [];
    if (price += "", isNaN(parseInt(price))) return "";
    var priceArr = parseFloat(price).toFixed(2).split(".");
    var numbers = priceArr[0].split("").reverse();
    
    for (var i = 0; i < numbers.length; i++) {
        digit = parseInt(numbers[i]);
        if ((digitIdx = i + 1) > 3) {
            var rem = digitIdx % 2;
            if (0 == rem) {
                nxtDigit = i < numbers.length - 1 ? parseInt(numbers[i + 1]) : 0;
                str = handle_tens(nxtDigit, digit);
                str += handle_utlc(digit, nxtDigit, ((digitIdx > 5 ? (digitIdx > 7 ? (digitIdx > 9 ? "Hundred" : "Crore") : "Lakh") : "Thousand")));
                i++;
            } else {
                str = handle_utlc(digit, 0, ((digitIdx > 5 ? (digitIdx > 7 ? (digitIdx > 9 ? "Hundred" : "Crore") : "Lakh") : "Thousand")));
            }
        } else {
            switch (digitIdx) {
                case 1: str = handle_utlc(digit, 0, ""); break;
                case 2: nxtDigit = parseInt(numbers[i - 1]); str = handle_tens(digit, nxtDigit); break;
                case 3: str = handle_utlc(digit, 0, "Hundred"); break;
            }
        }
        words.push(str);
    }
    words.reverse();
    return "Rupees " + words.join("").trim() + " Only";
}