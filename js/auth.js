// ============================================
// AUTH.JS - مدیریت احراز هویت کاربران
// Designed by S A D R A
// ============================================

// ===== STATE MANAGEMENT =====
const AuthState = {
    currentUser: null,
    userId: null,
    username: null,
    coins: 0,
    isAuthenticated: false
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    updateUI();
});

// ===== CHECK AUTH STATUS =====
function checkAuthStatus() {
    const userId = localStorage.getItem('userId');
    const username = localStorage.getItem('username');
    const coins = localStorage.getItem('coins');
    
    if (userId && username) {
        AuthState.isAuthenticated = true;
        AuthState.userId = userId;
        AuthState.username = username;
        AuthState.coins = parseInt(coins) || 0;
        
        // Get fresh user data
        fetchUserData(userId);
    } else {
        // اگر لاگین نیست، بره به صفحه ورود
        if (!window.location.pathname.includes('login') && !window.location.pathname.includes('index.html')) {
            window.location.href = '/login.html';
        }
    }
}

// ===== FETCH USER DATA =====
async function fetchUserData(userId) {
    try {
        const response = await fetch(`/api/user/${userId}`);
        const data = await response.json();
        
        if (data.success) {
            AuthState.currentUser = data.user;
            AuthState.username = data.user.username;
            AuthState.coins = data.user.coins || 0;
            
            localStorage.setItem('username', data.user.username);
            localStorage.setItem('coins', data.user.coins || 0);
            
            updateUI();
            
            // ✅ بعد از دریافت اطلاعات کاربر، لودینگ رو مخفی کن (اگه هنوز مخفی نشده)
            if (typeof hideLoadingOverlay === 'function') {
                hideLoadingOverlay();
            }
        } else {
            console.error('Failed to fetch user data');
            logout();
        }
    } catch (error) {
        console.error('Error fetching user data:', error);
        // حتی با خطا هم لودینگ رو مخفی کن
        if (typeof hideLoadingOverlay === 'function') {
            hideLoadingOverlay();
        }
    }
}

// ===== UPDATE UI =====
function updateUI() {
    const usernameDisplay = document.getElementById('usernameDisplay');
    const coinsDisplay = document.getElementById('coinsDisplay');
    
    if (usernameDisplay) {
        usernameDisplay.textContent = AuthState.username || 'مهمان';
    }
    
    if (coinsDisplay) {
        coinsDisplay.textContent = AuthState.coins || 0;
    }
    
    // Show/hide user section based on auth status
    const userSection = document.getElementById('userSection');
    if (userSection) {
        if (AuthState.isAuthenticated) {
            userSection.style.display = 'flex';
        } else {
            userSection.style.display = 'none';
        }
    }
}

// ===== TOGGLE USER MENU =====
function toggleUserMenu() {
    const menu = document.getElementById('userMenu');
    if (menu) {
        menu.classList.toggle('show');
    }
}

// ===== LOGOUT =====
function logout() {
    // Clear local storage
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('coins');
    
    // Reset state
    AuthState.isAuthenticated = false;
    AuthState.userId = null;
    AuthState.username = null;
    AuthState.coins = 0;
    
    // Close WebSocket connection if exists
    if (window.gameSocket && window.gameSocket.readyState === WebSocket.OPEN) {
        window.gameSocket.close();
    }
    
    // Redirect to login
    window.location.href = '/login.html';
}

// ===== UPDATE COINS =====
function updateCoins(amount) {
    AuthState.coins += amount;
    localStorage.setItem('coins', AuthState.coins);
    updateUI();
    
    // Show notification
    showNotification(`${amount > 0 ? '+' : ''}${amount} سکه طلا!`, 'success');
}

// ===== SHOW NOTIFICATION =====
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 4000);
}

// ===== SHOW LEADERBOARD =====
async function showLeaderboard() {
    const modal = document.getElementById('leaderboardModal');
    const body = document.getElementById('leaderboardBody');
    
    if (!modal || !body) return;
    
    modal.classList.add('show');
    body.innerHTML = '<div class="loading-spinner">⏳ در حال بارگذاری...</div>';
    
    try {
        const response = await fetch('/api/leaderboard');
        const data = await response.json();
        
        if (data.success && data.leaders.length > 0) {
            body.innerHTML = data.leaders.map((player, index) => {
                const rankClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : '';
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
                
                return `
                    <div class="leaderboard-item">
                        <span class="rank ${rankClass}">${medal}</span>
                        <span class="player-name">${player.username}</span>
                        <span class="player-stats">🏆 ${player.wins || 0} برد</span>
                        <span class="player-coins">🪙 ${player.coins || 0}</span>
                    </div>
                `;
            }).join('');
        } else {
            body.innerHTML = '<p style="text-align:center;color:var(--text-gray);padding:30px;">هنوز بازیکنی ثبت نشده است</p>';
        }
    } catch (error) {
        body.innerHTML = '<p style="text-align:center;color:#ff4444;">خطا در دریافت اطلاعات</p>';
    }
}

// ===== CLOSE MODAL =====
function closeModal() {
    const modal = document.getElementById('leaderboardModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// ===== CLOSE MODAL ON CLICK OUTSIDE =====
document.addEventListener('click', function(event) {
    const modal = document.getElementById('leaderboardModal');
    const content = document.querySelector('.modal-content');
    
    if (modal && modal.classList.contains('show') && content && !content.contains(event.target)) {
        closeModal();
    }
});

// ===== CLOSE USER MENU ON CLICK OUTSIDE =====
document.addEventListener('click', function(event) {
    const menu = document.getElementById('userMenu');
    const userInfo = document.querySelector('.user-info');
    
    if (menu && menu.classList.contains('show') && userInfo && !userInfo.contains(event.target) && !menu.contains(event.target)) {
        menu.classList.remove('show');
    }
});

// ===== HIDE LOADING OVERLAY (اضافه شده) =====
function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
        console.log('✅ Loading overlay hidden from auth.js');
    }
}

// ===== EXPOSE FUNCTIONS GLOBALLY =====
window.AuthState = AuthState;
window.logout = logout;
window.updateCoins = updateCoins;
window.showNotification = showNotification;
window.showLeaderboard = showLeaderboard;
window.closeModal = closeModal;
window.toggleUserMenu = toggleUserMenu;
window.hideLoadingOverlay = hideLoadingOverlay;
