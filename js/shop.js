// ============================================
// SHOP.JS - مدیریت فروشگاه
// Designed by S A D R A
// ============================================

// ===== SHOP ITEMS =====
const SHOP_ITEMS = [
    {
        id: '1',
        name: 'طلای X',
        description: 'علامت X با روکش طلای ۲۴ عیار',
        price: 50,
        icon: 'fa-times',
        category: 'style',
        color: '#FFD700'
    },
    {
        id: '2',
        name: 'طلای O',
        description: 'علامت O با روکش طلای ۲۴ عیار',
        price: 50,
        icon: 'fa-circle-o',
        category: 'style',
        color: '#FFD700'
    },
    {
        id: '3',
        name: 'پس‌زمینه سلطنتی',
        description: 'پس‌زمینه بازی با طرح طلایی',
        price: 30,
        icon: 'fa-image',
        category: 'background',
        color: '#B8860B'
    },
    {
        id: '4',
        name: 'آواتار سلطنتی',
        description: 'آواتار ویژه با تاج طلا',
        price: 100,
        icon: 'fa-user-crown',
        category: 'avatar',
        color: '#FFD700'
    },
    {
        id: '5',
        name: 'نشان طلا',
        description: 'نشان افتخار برای پروفایل شما',
        price: 75,
        icon: 'fa-medal',
        category: 'badge',
        color: '#C9A84C'
    },
    {
        id: '6',
        name: 'حرکت رعد برق',
        description: 'جلوه ویژه هنگام حرکت',
        price: 40,
        icon: 'fa-bolt',
        category: 'effect',
        color: '#FFD700'
    },
    {
        id: '7',
        name: 'پوسته تیره طلایی',
        description: 'پوسته اختصاصی برای تخته بازی',
        price: 60,
        icon: 'fa-border-all',
        category: 'skin',
        color: '#B8860B'
    },
    {
        id: '8',
        name: 'سکه طلای پرتابی',
        description: 'جلوه پرتاب سکه هنگام برد',
        price: 45,
        icon: 'fa-coins',
        category: 'effect',
        color: '#FFD700'
    }
];

// ===== STATE =====
const ShopState = {
    items: SHOP_ITEMS,
    ownedItems: [],
    selectedItem: null
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    loadOwnedItems();
    renderShop();
    updateCoinsDisplay();
});

// ===== LOAD OWNED ITEMS =====
function loadOwnedItems() {
    const saved = localStorage.getItem('ownedItems');
    if (saved) {
        ShopState.ownedItems = JSON.parse(saved);
    } else {
        // Load from server if logged in
        const userId = localStorage.getItem('userId');
        if (userId) {
            fetchUserItems(userId);
        }
    }
}

// ===== FETCH USER ITEMS FROM SERVER =====
async function fetchUserItems(userId) {
    try {
        const response = await fetch(`/api/user/${userId}`);
        const data = await response.json();
        
        if (data.success && data.user && data.user.items) {
            ShopState.ownedItems = data.user.items;
            localStorage.setItem('ownedItems', JSON.stringify(ShopState.ownedItems));
            renderShop();
        }
    } catch (error) {
        console.error('Error fetching user items:', error);
    }
}

// ===== RENDER SHOP =====
function renderShop() {
    const grid = document.getElementById('shopGrid');
    if (!grid) return;
    
    grid.innerHTML = ShopState.items.map(item => {
        const owned = ShopState.ownedItems.includes(item.id);
        const canAfford = AuthState.coins >= item.price;
        
        return `
            <div class="shop-item ${owned ? 'owned' : ''}" data-item-id="${item.id}">
                <div class="item-badge">${owned ? '✅ مالک' : item.category}</div>
                <div class="item-icon" style="color: ${item.color}">
                    <i class="fas ${item.icon}"></i>
                </div>
                <div class="item-name">${item.name}</div>
                <div class="item-desc">${item.description}</div>
                <div class="item-footer">
                    <div class="item-price">
                        <i class="fas fa-coins"></i>
                        ${item.price}
                    </div>
                    <button class="buy-btn ${owned ? 'owned-btn' : ''}" 
                            onclick="openBuyModal('${item.id}')"
                            ${owned ? 'disabled' : ''}>
                        ${owned ? '✅ خریداری شده' : 'خرید'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ===== UPDATE COINS DISPLAY =====
function updateCoinsDisplay() {
    const display = document.getElementById('shopCoinsDisplay');
    if (display) {
        display.textContent = AuthState.coins || 0;
    }
}

// ===== OPEN BUY MODAL =====
function openBuyModal(itemId) {
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) return;
    
    // Check if already owned
    if (ShopState.ownedItems.includes(itemId)) {
        showNotification('این آیتم قبلاً خریداری شده است!', 'error');
        return;
    }
    
    // Check if can afford
    if (AuthState.coins < item.price) {
        showNotification('سکه کافی نیست!', 'error');
        return;
    }
    
    ShopState.selectedItem = item;
    
    const modal = document.getElementById('buyModal');
    const body = document.getElementById('buyModalBody');
    
    if (modal && body) {
        body.innerHTML = `
            <div class="confirm-icon">
                <i class="fas ${item.icon}" style="color: ${item.color}"></i>
            </div>
            <div class="confirm-item">${item.name}</div>
            <div class="confirm-price">
                <i class="fas fa-coins"></i> ${item.price} سکه طلا
            </div>
            <p style="color: var(--text-gray); margin-bottom: 25px;">
                ${item.description}
            </p>
            <div class="confirm-btns">
                <button class="confirm-btn" onclick="confirmPurchase()">
                    <i class="fas fa-check"></i> خرید
                </button>
                <button class="cancel-btn" onclick="closeBuyModal()">
                    <i class="fas fa-times"></i> انصراف
                </button>
            </div>
        `;
        
        modal.classList.add('show');
    }
}

// ===== CLOSE BUY MODAL =====
function closeBuyModal() {
    const modal = document.getElementById('buyModal');
    if (modal) {
        modal.classList.remove('show');
    }
    ShopState.selectedItem = null;
}

// ===== CONFIRM PURCHASE =====
async function confirmPurchase() {
    const item = ShopState.selectedItem;
    if (!item) return;
    
    const userId = localStorage.getItem('userId');
    if (!userId) {
        window.location.href = '/login';
        return;
    }
    
    try {
        const response = await fetch('/api/buy-item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: userId,
                itemId: item.id
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Update local state
            AuthState.coins -= item.price;
            localStorage.setItem('coins', AuthState.coins);
            
            ShopState.ownedItems.push(item.id);
            localStorage.setItem('ownedItems', JSON.stringify(ShopState.ownedItems));
            
            // Update UI
            updateCoinsDisplay();
            renderShop();
            
            // Show success
            const body = document.getElementById('buyModalBody');
            if (body) {
                body.innerHTML = `
                    <div class="success-message">
                        <i class="fas fa-check-circle"></i>
                        <h3>خرید موفق! 🎉</h3>
                        <p>آیتم ${item.name} با موفقیت خریداری شد</p>
                        <p style="margin-top: 15px; color: var(--gold);">
                            <i class="fas fa-coins"></i> موجودی: ${AuthState.coins} سکه
                        </p>
                        <button class="gold-btn" style="margin: 20px auto 0;" onclick="closeBuyModal()">
                            <i class="fas fa-check"></i> عالی!
                        </button>
                    </div>
                `;
            }
            
            showNotification(`🎉 ${item.name} خریداری شد!`, 'success');
            
        } else {
            showNotification(data.message || 'خطا در خرید', 'error');
            closeBuyModal();
        }
    } catch (error) {
        console.error('Error purchasing item:', error);
        showNotification('خطا در ارتباط با سرور', 'error');
        closeBuyModal();
    }
}

// ===== CLOSE MODAL ON OUTSIDE CLICK =====
document.addEventListener('click', function(event) {
    const modal = document.getElementById('buyModal');
    const content = document.querySelector('.shop-modal');
    
    if (modal && modal.classList.contains('show') && content && !content.contains(event.target) && !event.target.closest('.buy-btn')) {
        closeBuyModal();
    }
});

// ===== UPDATE COINS WHEN AUTH STATE CHANGES =====
// Override updateCoins from auth.js to also update shop display
const originalUpdateCoins = window.updateCoins;
window.updateCoins = function(amount) {
    if (originalUpdateCoins) {
        originalUpdateCoins(amount);
    }
    updateCoinsDisplay();
};

// ===== EXPOSE FUNCTIONS =====
window.openBuyModal = openBuyModal;
window.closeBuyModal = closeBuyModal;
window.confirmPurchase = confirmPurchase;
window.ShopState = ShopState;