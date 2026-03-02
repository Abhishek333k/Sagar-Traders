// ============================================================================
// FIREBASE AUTHENTICATION ENGINE (assets/js/auth.js)
// ============================================================================

// 1. Firebase Configuration Keys
const firebaseConfig = {
    apiKey: "AIzaSyC5yN1knlOPAmgsorqLnnGyIJa8U_le5mQ",
    authDomain: "sagar-traders-pos.firebaseapp.com",
    projectId: "sagar-traders-pos",
    storageBucket: "sagar-traders-pos.firebasestorage.app",
    messagingSenderId: "1051300930828",
    appId: "1:1051300930828:web:bd32f208364c64756b1529"
};

// 2. Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Make db and auth globally available to all other JS files
const db = firebase.firestore();
const auth = firebase.auth();

// 3. Authentication State Listener (The Gatekeeper)
auth.onAuthStateChanged(user => {
    if (user) {
        // User is logged in. Hide the login gate and boot the POS.
        document.getElementById('authGate').style.display = 'none';
        initializeSystem(); // This lives in main.js
    } else {
        // User is logged out. Lock the screen.
        document.getElementById('authGate').style.display = 'flex';
    }
});

// 4. Login Function (Triggered by the button/Enter key)
function loginSystem() {
    const email = document.getElementById('authEmail').value.trim();
    const pass = document.getElementById('authPassword').value;
    const btn = document.getElementById('authSubmitBtn');
    const errEl = document.getElementById('authError');
    
    // Clear previous errors
    errEl.style.display = 'none';

    // Basic Validation
    if(!email || !pass) {
        errEl.innerText = "Please enter both Email and Passkey.";
        errEl.style.display = 'block';
        AudioEngine.playError();
        return;
    }

    // UI Feedback: Set button to Loading State
    const originalBtnText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Authenticating...';
    btn.disabled = true;
    btn.style.opacity = '0.8';

    // Attempt Firebase Login
    auth.signInWithEmailAndPassword(email, pass)
        .catch(error => {
            // Show error message
            errEl.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Access Denied: Check credentials.`;
            errEl.style.display = 'block';
            AudioEngine.playError();
            
            // Revert button back to normal
            btn.innerHTML = originalBtnText;
            btn.disabled = false;
            btn.style.opacity = '1';
        });
}