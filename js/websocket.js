// ============================================
// WEBSOCKET.JS - مدیریت ارتباطات لحظه‌ای
// Designed by S A D R A
// ============================================

// ===== WEBSOCKET CONFIGURATION =====
const WS_CONFIG = {
    get url() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        return `${protocol}//${host}`;
    },
    reconnectDelay: 3000,
    maxReconnectAttempts: 5
};

class GameWebSocket {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.userId = null;
        this.gameId = null;
        this.messageHandlers = new Map();
        this.isConnecting = false;
    }

    // ===== CONNECT =====
    connect(userId) {
        if (this.isConnecting || this.isConnected) {
            console.log('WebSocket already connecting or connected');
            return;
        }

        this.userId = userId;
        this.isConnecting = true;
        
        try {
            const wsUrl = WS_CONFIG.url;
            console.log(`🔗 Connecting to WebSocket: ${wsUrl}`);
            
            this.socket = new WebSocket(wsUrl);
            
            this.socket.onopen = () => {
                console.log('🔗 WebSocket connected');
                this.isConnected = true;
                this.isConnecting = false;
                this.reconnectAttempts = 0;
                
                this.authenticate();
                this.updateStatus('connected');
                
                // ✅ مخفی کردن لودینگ بعد از اتصال موفق
                hideLoadingOverlay();
            };
            
            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error('Error parsing message:', error);
                }
            };
            
            this.socket.onclose = () => {
                console.log('🔌 WebSocket disconnected');
                this.isConnected = false;
                this.isConnecting = false;
                this.updateStatus('disconnected');
                if (this.userId) {
                    this.attemptReconnect();
                }
            };
            
            this.socket.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.updateStatus('error');
            };
            
        } catch (error) {
            console.error('Failed to create WebSocket:', error);
            this.isConnecting = false;
            this.attemptReconnect();
        }
    }

    // ===== AUTHENTICATE =====
    authenticate() {
        if (this.isConnected && this.userId) {
            this.send({
                type: 'auth',
                userId: this.userId
            });
        }
    }

    // ===== SEND MESSAGE =====
    send(data) {
        if (this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(data));
            return true;
        } else {
            console.warn('Cannot send message: WebSocket not connected');
            return false;
        }
    }

    // ===== HANDLE INCOMING MESSAGES =====
    handleMessage(data) {
        console.log('📩 Received:', data.type, data);
        
        switch(data.type) {
            case 'auth_success':
                this.onAuthSuccess(data);
                break;
            case 'waiting':
                this.onWaiting(data);
                break;
            case 'game_start':
                this.onGameStart(data);
                break;
            case 'move_made':
                this.onMoveMade(data);
                break;
            case 'game_state':
                this.onGameState(data);
                break;
            case 'game_end':
                this.onGameEnd(data);
                break;
            case 'error':
                this.onError(data);
                break;
            case 'rematch_offered':
                this.onRematchOffered(data);
                break;
            case 'rematch_accepted':
                this.onRematchAccepted(data);
                break;
            default:
                console.log('Unknown message type:', data.type);
                this.callHandler(data.type, data);
        }
    }

    // ===== REGISTER MESSAGE HANDLER =====
    on(type, handler) {
        this.messageHandlers.set(type, handler);
    }

    callHandler(type, data) {
        const handler = this.messageHandlers.get(type);
        if (handler) {
            handler(data);
        }
    }

    // ===== CONNECTION STATUS =====
    updateStatus(status) {
        const statusText = document.getElementById('statusText');
        if (statusText) {
            switch(status) {
                case 'connected':
                    statusText.textContent = '🟢 متصل به سرور';
                    statusText.style.color = '#4CAF50';
                    break;
                case 'disconnected':
                    statusText.textContent = '🔴 قطع اتصال - در حال تلاش مجدد...';
                    statusText.style.color = '#ff4444';
                    break;
                case 'error':
                    statusText.textContent = '⚠️ خطا در اتصال';
                    statusText.style.color = '#FFA726';
                    break;
                default:
                    statusText.textContent = '⏳ در حال اتصال...';
                    statusText.style.color = '#FFA726';
            }
        }
    }

    // ===== RECONNECT LOGIC =====
    attemptReconnect() {
        if (this.reconnectAttempts >= WS_CONFIG.maxReconnectAttempts) {
            console.log('Max reconnect attempts reached');
            this.updateStatus('error');
            // ✅ حتی با خطا هم لودینگ رو مخفی کن
            hideLoadingOverlay();
            return;
        }
        
        this.reconnectAttempts++;
        console.log(`Attempting reconnect ${this.reconnectAttempts}/${WS_CONFIG.maxReconnectAttempts}`);
        
        setTimeout(() => {
            if (this.userId) {
                this.connect(this.userId);
            }
        }, WS_CONFIG.reconnectDelay * this.reconnectAttempts);
    }

    // ===== DISCONNECT =====
    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.isConnected = false;
        }
        this.userId = null;
    }

    // ===== MESSAGE HANDLERS =====
    onAuthSuccess(data) {
        console.log('✅ Authentication successful');
        showNotification('به سرور متصل شدید!', 'success');
        // ✅ بعد از احراز هویت موفق، لودینگ رو مخفی کن
        hideLoadingOverlay();
    }

    onWaiting(data) {
        console.log('⏳ Waiting for opponent...');
        const statusText = document.getElementById('statusText');
        if (statusText) {
            statusText.textContent = '⏳ در حال جستجوی حریف...';
            statusText.style.color = '#FFA726';
        }
        
        const cancelBtn = document.getElementById('cancelBtn');
        if (cancelBtn) cancelBtn.style.display = 'flex';
        
        showNotification('در حال جستجوی حریف...', 'info');
        
        // ✅ لودینگ رو مخفی کن چون کاربر منتظر حریفه
        hideLoadingOverlay();
    }

    onGameStart(data) {
        console.log('🎮 Game started!', data);
        
        this.gameId = data.gameId;
        
        const playerXName = document.getElementById('playerXName');
        const playerOName = document.getElementById('playerOName');
        const playerXStatus = document.getElementById('playerXStatus');
        const playerOStatus = document.getElementById('playerOStatus');
        const statusText = document.getElementById('statusText');
        
        if (data.player === 'X') {
            if (playerXName) playerXName.textContent = AuthState.username;
            if (playerOName) playerOName.textContent = 'حریف';
            if (playerXStatus) playerXStatus.textContent = '🎯 نوبت شماست';
            if (playerXStatus) playerXStatus.className = 'player-status ready';
            if (playerOStatus) playerOStatus.textContent = '⏳ منتظر حریف';
            if (playerOStatus) playerOStatus.className = 'player-status waiting';
            
            document.querySelector('.player-card.player-x')?.classList.add('active-turn');
            document.querySelector('.player-card.player-o')?.classList.remove('active-turn');
        } else {
            if (playerXName) playerXName.textContent = 'حریف';
            if (playerOName) playerOName.textContent = AuthState.username;
            if (playerXStatus) playerXStatus.textContent = '⏳ منتظر حریف';
            if (playerXStatus) playerXStatus.className = 'player-status waiting';
            if (playerOStatus) playerOStatus.textContent = '🎯 نوبت شماست';
            if (playerOStatus) playerOStatus.className = 'player-status ready';
            
            document.querySelector('.player-card.player-o')?.classList.add('active-turn');
            document.querySelector('.player-card.player-x')?.classList.remove('active-turn');
        }
        
        if (statusText) {
            statusText.textContent = `🎮 بازی شروع شد! ${data.player === 'X' ? 'شما با X' : 'شما با O'} بازی می‌کنید`;
            statusText.style.color = 'var(--gold)';
        }
        
        const cancelBtn = document.getElementById('cancelBtn');
        const rematchBtn = document.getElementById('rematchBtn');
        const startBtn = document.getElementById('startGameBtn');
        
        if (cancelBtn) cancelBtn.style.display = 'none';
        if (rematchBtn) rematchBtn.style.display = 'none';
        if (startBtn) startBtn.textContent = '⏳ در حال بازی...';
        if (startBtn) startBtn.disabled = true;
        
        clearBoard();
        showNotification('بازی شروع شد! موفق باشید 🎯', 'success');
        
        // ✅ لودینگ رو مخفی کن چون بازی شروع شده
        hideLoadingOverlay();
    }

    onMoveMade(data) {
        console.log('🎯 Move made:', data);
        updateBoard(data.position, data.player);
        
        const playerXStatus = document.getElementById('playerXStatus');
        const playerOStatus = document.getElementById('playerOStatus');
        const statusText = document.getElementById('statusText');
        
        if (data.player === AuthState.userId) {
            if (playerXStatus && document.querySelector('.player-card.player-x .player-symbol')?.textContent === 'X') {
                playerXStatus.textContent = '⏳ منتظر حریف';
                playerXStatus.className = 'player-status waiting';
                document.querySelector('.player-card.player-x')?.classList.remove('active-turn');
                document.querySelector('.player-card.player-o')?.classList.add('active-turn');
            } else {
                playerOStatus.textContent = '⏳ منتظر حریف';
                playerOStatus.className = 'player-status waiting';
                document.querySelector('.player-card.player-o')?.classList.remove('active-turn');
                document.querySelector('.player-card.player-x')?.classList.add('active-turn');
            }
            
            if (statusText) {
                statusText.textContent = '⏳ نوبت حریف...';
                statusText.style.color = '#FFA726';
            }
        } else {
            if (playerXStatus && document.querySelector('.player-card.player-x .player-symbol')?.textContent === 'X') {
                playerXStatus.textContent = '⏳ منتظر حریف';
                playerXStatus.className = 'player-status waiting';
                document.querySelector('.player-card.player-x')?.classList.remove('active-turn');
                document.querySelector('.player-card.player-o')?.classList.add('active-turn');
            } else {
                playerOStatus.textContent = '⏳ منتظر حریف';
                playerOStatus.className = 'player-status waiting';
                document.querySelector('.player-card.player-o')?.classList.remove('active-turn');
                document.querySelector('.player-card.player-x')?.classList.add('active-turn');
            }
            
            if (statusText) {
                statusText.textContent = '🎯 نوبت شماست!';
                statusText.style.color = 'var(--gold)';
            }
        }
    }

    onGameState(data) {
        console.log('📊 Game state updated:', data);
        if (data.board) {
            updateBoardFromState(data.board);
        }
    }

    onGameEnd(data) {
        console.log('🏁 Game ended:', data);
        
        const statusText = document.getElementById('statusText');
        const startBtn = document.getElementById('startGameBtn');
        const rematchBtn = document.getElementById('rematchBtn');
        
        if (data.winner) {
            const winnerSymbol = data.winner;
            const isWinner = (winnerSymbol === 'X' && AuthState.userId === window.currentGame?.playerX) ||
                            (winnerSymbol === 'O' && AuthState.userId === window.currentGame?.playerO);
            
            if (isWinner) {
                statusText.textContent = '🎉 شما برنده شدید! +۱۰ سکه';
                statusText.style.color = 'var(--gold)';
                showNotification('🎉 برنده شدید! ۱۰ سکه دریافت کردید', 'success');
                updateCoins(10);
            } else {
                statusText.textContent = '😢 شما باختید! +۲ سکه';
                statusText.style.color = '#ff4444';
                showNotification('😢 متاسفانه باختید! ۲ سکه دریافت کردید', 'error');
                updateCoins(2);
            }
        } else if (data.isDraw) {
            statusText.textContent = '🤝 بازی مساوی شد! +۵ سکه';
            statusText.style.color = '#FFA726';
            showNotification('🤝 بازی مساوی شد! ۵ سکه دریافت کردید', 'info');
            updateCoins(5);
        }
        
        if (rematchBtn) rematchBtn.style.display = 'flex';
        if (startBtn) {
            startBtn.textContent = '🔄 بازی جدید';
            startBtn.disabled = false;
        }
        
        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.add('game-over');
        });
        
        this.gameId = null;
    }

    onError(data) {
        console.error('❌ Server error:', data);
        showNotification(data.message || 'خطا در سرور', 'error');
        hideLoadingOverlay();
    }

    onRematchOffered(data) {
        showNotification('حریف درخواست بازی مجدد دارد!', 'info');
        this.send({
            type: 'rematch_accepted',
            gameId: this.gameId
        });
    }

    onRematchAccepted(data) {
        showNotification('بازی مجدد شروع می‌شود!', 'success');
        clearBoard();
        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove('game-over', 'win-cell');
        });
    }

    get isReady() {
        return this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN;
    }
}

// ===== BOARD UTILITIES =====
function clearBoard() {
    document.querySelectorAll('.cell').forEach(cell => {
        cell.innerHTML = '';
        cell.classList.remove('taken', 'win-cell', 'game-over');
        cell.dataset.player = '';
    });
}

function updateBoard(position, player) {
    const cell = document.querySelector(`.cell[data-index="${position}"]`);
    if (cell) {
        const symbol = player === AuthState.userId ? 
            (document.querySelector('.player-card.player-x .player-symbol')?.textContent === 'X' ? 'X' : 'O') :
            (document.querySelector('.player-card.player-x .player-symbol')?.textContent === 'X' ? 'O' : 'X');
        
        cell.innerHTML = `<span class="${symbol === 'X' ? 'x-mark' : 'o-mark'}">${symbol}</span>`;
        cell.classList.add('taken');
        cell.dataset.player = symbol;
    }
}

function updateBoardFromState(board) {
    board.forEach((value, index) => {
        if (value) {
            const cell = document.querySelector(`.cell[data-index="${index}"]`);
            if (cell) {
                cell.innerHTML = `<span class="${value === 'X' ? 'x-mark' : 'o-mark'}">${value}</span>`;
                cell.classList.add('taken');
                cell.dataset.player = value;
            }
        }
    });
}

// ===== HIDE LOADING OVERLAY =====
function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
        console.log('✅ Loading overlay hidden');
    }
}

// ===== EXPOSE WEBSOCKET =====
const gameSocket = new GameWebSocket();
window.gameSocket = gameSocket;
window.hideLoadingOverlay = hideLoadingOverlay;

// ===== INITIALIZE WEBSOCKET =====
document.addEventListener('DOMContentLoaded', function() {
    const userId = localStorage.getItem('userId');
    if (userId) {
        setTimeout(() => {
            gameSocket.connect(userId);
        }, 500);
    } else {
        // اگه کاربر لاگین نیست، بره به صفحه ورود
        if (!window.location.pathname.includes('login')) {
            window.location.href = '/login.html';
        }
    }
});
