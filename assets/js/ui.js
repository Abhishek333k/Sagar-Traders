// --- UI CONTROLS & NOTIFICATIONS ---

function showToast(msg, type='info') {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div'); 
    t.className = `toast ${type}`;
    t.innerHTML = `<i class="fas fa-${type==='success'?'check-circle':type==='error'?'exclamation-circle':'info-circle'}"></i> <span>${msg}</span>`;
    c.appendChild(t); 
    setTimeout(() => { 
        t.style.animation = 'slideOut 0.3s forwards'; 
        setTimeout(() => t.remove(), 300); 
    }, 3000);
}

function showLoading(show, txt="Processing...") { 
    const o = document.getElementById('loadingOverlay');
    const t = document.getElementById('loadingText');
    if(show) { 
        if(t) t.innerText = txt; 
        o.style.display = 'flex'; 
    } else {
        o.style.display = 'none';
    }
}

function toggleSidebar() { 
    document.getElementById('sidebar').classList.toggle('open'); 
}

function toggleFullScreen() { 
    if (!document.fullscreenElement) document.documentElement.requestFullscreen(); 
    else if (document.exitFullscreen) document.exitFullscreen(); 
}

// --- GLOBAL KEYBOARD NAVIGATION ---
function handleSearchNav(e, context) {
    const containerId = context === 'pos' ? 'customerResults' : 'ledgerCustResults';
    const container = document.getElementById(containerId);
    if(!container) return;
    
    const items = container.querySelectorAll('.search-item');
    let activeIndex = Array.from(items).findIndex(i => i.classList.contains('selected'));
    
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (activeIndex < items.length - 1) {
            if (activeIndex >= 0) items[activeIndex].classList.remove('selected');
            items[activeIndex + 1].classList.add('selected');
            items[activeIndex + 1].scrollIntoView({ block: 'nearest' });
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (activeIndex > 0) {
            items[activeIndex].classList.remove('selected');
            items[activeIndex - 1].classList.add('selected');
            items[activeIndex - 1].scrollIntoView({ block: 'nearest' });
        }
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeIndex >= 0) items[activeIndex].click();
    }
}