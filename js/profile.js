// ============================================
// PROFILE.JS - مدیریت پروفایل کاربر
// Designed by S A D R A
// ============================================

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    loadProfile();
});

// ===== LOAD PROFILE =====
async function loadProfile() {
    const userId = localStorage.getItem('userId');
    
    if (!userId) {
        window.location.href = '/login';
        return;
    }
    
    try {
        const response = await fetch(`/api/user/${userId}`);
        const data = await response.json();
        
        if (data.success && data.user) {
            displayProfile(data.user);
        } else {
            showNotification('خطا در دریافت اطلاعات پروفایل', 'error');
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        showNotification('خطا در ارتباط با سرور', 'error');
    }
}

// ===== DISPLAY PROFILE =====
function displayProfile(user) {
    // Update basic info
    document.getElementById('profileName').textContent = user.username;
    document.getElementById('profileUsername').textContent = `@${user.username}`;
    document.getElementById('profileCoins').textContent = user.coins || 0;
    
    // Update stats
    document.getElementById('statWins').textContent = user.wins || 0;
    document.getElementById('statLosses').textContent = user.losses || 0;
    document.getElementById('statDraws').textContent = user.draws || 0;
    
    const totalGames = (user.wins || 0) + (user.losses || 0) + (user.draws || 0);
    document.getElementById('statGames').textContent = totalGames;
    
    // Update badges
    displayBadges(user);
    
    // Update items
    displayItems(user.items || []);
    
    // Update AuthState
    AuthState.coins = user.coins || 0;
    localStorage.setItem('coins', AuthState.coins);
    updateUI();
}

// ===== DISPLAY BADGES =====
function displayBadges(user) {
    const container = document.getElementById('profileBadges');
    if (!container) return;
    
    const badges = [];
    
    // Win badges
    const wins = user.wins || 0;
    if (wins >= 50) badges.push({ icon: '👑', label: 'سلطان بازی' });
    else if (wins >= 25) badges.push({ icon: '🏆', label: 'قهرمان' });
    else if (wins >= 10) badges.push({ icon: '⭐', label: 'بازیکن حرفه‌ای' });
    else if (wins >= 5) badges.push({ icon: '🌟', label: 'بازیکن فعال' });
    else if (wins >= 1) badges.push({ icon: '🎯', label: 'اولین برد' });
    
    // Coin badges
    const coins = user.coins || 0;
    if (coins >= 500) badges.push({ icon: '💎', label: 'ثروتمند' });
    else if (coins >= 200) badges.push({ icon: '💰', label: 'پولدار' });
    
    // Member badge
    if (user.createdAt) {
        const created = new Date(user.createdAt);
        const days = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
        if (days >= 30) badges.push({ icon: '🎖️', label: 'عضو وفادار' });
    }
    
    // Custom items as badges
    if (user.items && user.items.length > 0) {
        const itemMap = {
            '5': { icon: '🥇', label: 'نشان طلا' },
            '4': { icon: '👑', label: 'آواتار سلطنتی' }
        };
        
        user.items.forEach(itemId => {
            if (itemMap[itemId]) {
                badges.push(itemMap[itemId]);
            }
        });
    }
    
    if (badges.length === 0) {
        badges.push({ icon: '🆕', label: 'تازه‌وارد' });
    }
    
    container.innerHTML = badges.map(badge => 
        `<span class="badge">${badge.icon} ${badge.label}</span>`
    ).join('');
}

// ===== DISPLAY ITEMS =====
function displayItems(itemIds) {
    const container = document.getElementById('profileItems');
    if (!container) return;
    
    if (!itemIds || itemIds.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 30px; color: var(--text-gray);">
                <i class="fas fa-shopping-bag" style="font-size: 40px; display: block; margin-bottom: 15px; opacity: 0.3;"></i>
                هنوز آیتمی خریداری نکرده‌اید
                <br>
                <small>به فروشگاه بروید و آیتم‌های ویژه بخرید!</small>
            </div>
        `;
        return;
    }
    
    // Map item IDs to item details
    const itemMap = {
        '1': { name: 'طلای X', icon: 'fa-times', color: '#FFD700' },
        '2': { name: 'طلای O', icon: 'fa-circle-o', color: '#FFD700' },
        '3': { name: 'پس‌زمینه سلطنتی', icon: 'fa-image', color: '#B8860B' },
        '4': { name: 'آواتار سلطنتی', icon: 'fa-user-crown', color: '#FFD700' },
        '5': { name: 'نشان طلا', icon: 'fa-medal', color: '#C9A84C' },
        '6': { name: 'حرکت رعد برق', icon: 'fa-bolt', color: '#FFD700' },
        '7': { name: 'پوسته تیره طلایی', icon: 'fa-border-all', color: '#B8860B' },
        '8': { name: 'سکه طلای پرتابی', icon: 'fa-coins', color: '#FFD700' }
    };
    
    container.innerHTML = itemIds.map(id => {
        const item = itemMap[id];
        if (!item) return '';
        return `
            <div class="profile-item">
                <div class="item-icon" style="color: ${item.color}">
                    <i class="fas ${item.icon}"></i>
                </div>
                <div class="item-name">${item.name}</div>
            </div>
        `;
    }).join('');
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
}

// ===== EXPOSE FUNCTIONS =====
window.loadProfile = loadProfile;