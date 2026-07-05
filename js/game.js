// ============================================
// GAME.JS - منطق اصلی بازی در سمت کاربر
// Designed by S A D R A
// ============================================

// ===== GAME STATE =====
const GameState = {
    board: Array(9).fill(null),
    currentPlayer: null,
    playerX: null,
    playerO: null,
    gameId: null,
    isGameOver: false,
    isMyTurn: false,
    mySymbol: null,
    scoreX: 0,
    scoreO: 0
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    initializeGame();
});

function initializeGame() {
    // Set up cell click handlers
    document.querySelectorAll('.cell').forEach(cell => {
        cell.addEventListener('click', () => handleCellClick(cell));
    });
    
    // Load scores from localStorage
    loadScores();
    
    // Set up WebSocket handlers
    setupGameHandlers();
}

// ===== SETUP WEBSOCKET HANDLERS =====
function setupGameHandlers() {
    gameSocket.on('game_start', (data) => {
        GameState.gameId = data.gameId;
        GameState.currentPlayer = data.player;
        GameState.playerX = data.player === 'X' ? AuthState.userId : data.opponent;
        GameState.playerO = data.player === 'O' ? AuthState.userId : data.opponent;
        GameState.mySymbol = data.player;
        GameState.isMyTurn = data.player === 'X';
        GameState.isGameOver = false;
        GameState.board = Array(9).fill(null);
        
        // Save game state
        window.currentGame = {
            gameId: data.gameId,
            playerX: GameState.playerX,
            playerO: GameState.playerO,
            mySymbol: GameState.mySymbol
        };
        
        // Update board
        clearBoard();
        updateTurnIndicators();
    });
    
    gameSocket.on('move_made', (data) => {
        const position = data.position;
        const player = data.player;
        
        // Update board
        const cell = document.querySelector(`.cell[data-index="${position}"]`);
        if (cell) {
            const symbol = player === GameState.playerX ? 'X' : 'O';
            cell.innerHTML = `<span class="${symbol === 'X' ? 'x-mark' : 'o-mark'}">${symbol}</span>`;
            cell.classList.add('taken');
            cell.dataset.player = symbol;
            
            // Update board array
            GameState.board[position] = symbol;
        }
        
        // Check if it's my turn
        GameState.isMyTurn = (player === GameState.playerO && GameState.mySymbol === 'X') ||
                            (player === GameState.playerX && GameState.mySymbol === 'O');
        
        updateTurnIndicators();
    });
    
    gameSocket.on('game_state', (data) => {
        if (data.board) {
            // Update board from server state
            data.board.forEach((value, index) => {
                if (value && GameState.board[index] !== value) {
                    const cell = document.querySelector(`.cell[data-index="${index}"]`);
                    if (cell && !cell.classList.contains('taken')) {
                        cell.innerHTML = `<span class="${value === 'X' ? 'x-mark' : 'o-mark'}">${value}</span>`;
                        cell.classList.add('taken');
                        cell.dataset.player = value;
                        GameState.board[index] = value;
                    }
                }
            });
        }
        
        // Update turn
        if (data.currentPlayer) {
            GameState.isMyTurn = data.currentPlayer === GameState.mySymbol;
            updateTurnIndicators();
        }
    });
    
    gameSocket.on('game_end', (data) => {
        GameState.isGameOver = true;
        GameState.isMyTurn = false;
        
        // Highlight winning cells
        if (data.winner) {
            const winPatterns = [
                [0, 1, 2], [3, 4, 5], [6, 7, 8],
                [0, 3, 6], [1, 4, 7], [2, 5, 8],
                [0, 4, 8], [2, 4, 6]
            ];
            
            // Find winning pattern
            for (const pattern of winPatterns) {
                const [a, b, c] = pattern;
                if (GameState.board[a] === data.winner &&
                    GameState.board[b] === data.winner &&
                    GameState.board[c] === data.winner) {
                    
                    pattern.forEach(index => {
                        const cell = document.querySelector(`.cell[data-index="${index}"]`);
                        if (cell) cell.classList.add('win-cell');
                    });
                    break;
                }
            }
        }
        
        updateTurnIndicators();
    });
}

// ===== HANDLE CELL CLICK =====
function handleCellClick(cell) {
    const index = parseInt(cell.dataset.index);
    
    // Validation checks
    if (GameState.isGameOver) {
        showNotification('بازی به پایان رسیده است!', 'error');
        return;
    }
    
    if (!GameState.isMyTurn) {
        showNotification('⏳ نوبت شما نیست!', 'error');
        return;
    }
    
    if (GameState.board[index] !== null) {
        showNotification('این خانه قبلاً پر شده است!', 'error');
        return;
    }
    
    if (!GameState.gameId) {
        showNotification('لطفاً ابتدا بازی را شروع کنید!', 'error');
        return;
    }
    
    if (!gameSocket.isReady) {
        showNotification('اتصال به سرور برقرار نیست!', 'error');
        return;
    }
    
    // Make move
    makeMove(index);
}

// ===== MAKE MOVE =====
function makeMove(position) {
    const data = {
        type: 'move',
        gameId: GameState.gameId,
        position: position
    };
    
    if (gameSocket.send(data)) {
        // Update local state
        const symbol = GameState.mySymbol;
        GameState.board[position] = symbol;
        
        // Update cell
        const cell = document.querySelector(`.cell[data-index="${position}"]`);
        if (cell) {
            cell.innerHTML = `<span class="${symbol === 'X' ? 'x-mark' : 'o-mark'}">${symbol}</span>`;
            cell.classList.add('taken');
            cell.dataset.player = symbol;
        }
        
        // Set waiting state
        GameState.isMyTurn = false;
        updateTurnIndicators();
        
        // Update status
        const statusText = document.getElementById('statusText');
        if (statusText) {
            statusText.textContent = '⏳ منتظر حرکت حریف...';
            statusText.style.color = '#FFA726';
        }
    } else {
        showNotification('خطا در ارسال حرکت!', 'error');
    }
}

// ===== START GAME =====
function startGame() {
    const userId = localStorage.getItem('userId');
    
    if (!userId) {
        window.location.href = '/login';
        return;
    }
    
    if (gameSocket.isReady) {
        // Re-authenticate
        gameSocket.send({
            type: 'auth',
            userId: userId
        });
        
        const startBtn = document.getElementById('startGameBtn');
        if (startBtn) {
            startBtn.textContent = '⏳ در حال جستجو...';
            startBtn.disabled = true;
        }
        
        const statusText = document.getElementById('statusText');
        if (statusText) {
            statusText.textContent = '⏳ در حال جستجوی حریف...';
            statusText.style.color = '#FFA726';
        }
        
        showNotification('در حال جستجوی حریف...', 'info');
        
        // Show cancel button
        const cancelBtn = document.getElementById('cancelBtn');
        if (cancelBtn) cancelBtn.style.display = 'flex';
        
    } else {
        showNotification('اتصال به سرور برقرار نیست! در حال تلاش مجدد...', 'error');
        // Attempt to reconnect
        gameSocket.connect(userId);
    }
}

// ===== CANCEL MATCHMAKING =====
function cancelMatchmaking() {
    // Send cancel message if needed
    const startBtn = document.getElementById('startGameBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const statusText = document.getElementById('statusText');
    
    if (startBtn) {
        startBtn.textContent = '🎮 شروع بازی';
        startBtn.disabled = false;
    }
    
    if (cancelBtn) cancelBtn.style.display = 'none';
    
    if (statusText) {
        statusText.textContent = 'جستجو لغو شد';
        statusText.style.color = '#ff4444';
    }
    
    showNotification('جستجوی حریف لغو شد', 'info');
}

// ===== REQUEST REMATCH =====
function requestRematch() {
    if (GameState.gameId) {
        gameSocket.send({
            type: 'rematch',
            gameId: GameState.gameId
        });
        
        showNotification('درخواست بازی مجدد ارسال شد...', 'info');
        
        const rematchBtn = document.getElementById('rematchBtn');
        if (rematchBtn) {
            rematchBtn.textContent = '⏳ در انتظار تایید...';
            rematchBtn.disabled = true;
        }
    }
}

// ===== UPDATE TURN INDICATORS =====
function updateTurnIndicators() {
    const playerXCard = document.querySelector('.player-card.player-x');
    const playerOCard = document.querySelector('.player-card.player-o');
    const playerXStatus = document.getElementById('playerXStatus');
    const playerOStatus = document.getElementById('playerOStatus');
    const statusText = document.getElementById('statusText');
    
    // Remove all active turn classes
    playerXCard?.classList.remove('active-turn');
    playerOCard?.classList.remove('active-turn');
    
    if (GameState.isGameOver) {
        if (playerXStatus) playerXStatus.textContent = '🏁 پایان بازی';
        if (playerOStatus) playerOStatus.textContent = '🏁 پایان بازی';
        if (playerXStatus) playerXStatus.className = 'player-status';
        if (playerOStatus) playerOStatus.className = 'player-status';
        return;
    }
    
    if (GameState.mySymbol === 'X') {
        if (GameState.isMyTurn) {
            playerXCard?.classList.add('active-turn');
            if (playerXStatus) {
                playerXStatus.textContent = '🎯 نوبت شماست';
                playerXStatus.className = 'player-status ready';
            }
            if (playerOStatus) {
                playerOStatus.textContent = '⏳ منتظر حریف';
                playerOStatus.className = 'player-status waiting';
            }
            if (statusText) {
                statusText.textContent = '🎯 نوبت شماست!';
                statusText.style.color = 'var(--gold)';
            }
        } else {
            playerOCard?.classList.add('active-turn');
            if (playerOStatus) {
                playerOStatus.textContent = '🎯 نوبت حریف';
                playerOStatus.className = 'player-status ready';
            }
            if (playerXStatus) {
                playerXStatus.textContent = '⏳ منتظر حریف';
                playerXStatus.className = 'player-status waiting';
            }
            if (statusText) {
                statusText.textContent = '⏳ منتظر حرکت حریف...';
                statusText.style.color = '#FFA726';
            }
        }
    } else {
        // My symbol is O
        if (GameState.isMyTurn) {
            playerOCard?.classList.add('active-turn');
            if (playerOStatus) {
                playerOStatus.textContent = '🎯 نوبت شماست';
                playerOStatus.className = 'player-status ready';
            }
            if (playerXStatus) {
                playerXStatus.textContent = '⏳ منتظر حریف';
                playerXStatus.className = 'player-status waiting';
            }
            if (statusText) {
                statusText.textContent = '🎯 نوبت شماست!';
                statusText.style.color = 'var(--gold)';
            }
        } else {
            playerXCard?.classList.add('active-turn');
            if (playerXStatus) {
                playerXStatus.textContent = '🎯 نوبت حریف';
                playerXStatus.className = 'player-status ready';
            }
            if (playerOStatus) {
                playerOStatus.textContent = '⏳ منتظر حریف';
                playerOStatus.className = 'player-status waiting';
            }
            if (statusText) {
                statusText.textContent = '⏳ منتظر حرکت حریف...';
                statusText.style.color = '#FFA726';
            }
        }
    }
}

// ===== LOAD SCORES =====
function loadScores() {
    const scoreX = localStorage.getItem('scoreX');
    const scoreO = localStorage.getItem('scoreO');
    
    if (scoreX !== null) {
        document.getElementById('playerXScore').textContent = scoreX;
        GameState.scoreX = parseInt(scoreX);
    }
    if (scoreO !== null) {
        document.getElementById('playerOScore').textContent = scoreO;
        GameState.scoreO = parseInt(scoreO);
    }
}

// ===== UPDATE SCORES =====
function updateScores(winner) {
    if (winner === 'X') {
        GameState.scoreX++;
        document.getElementById('playerXScore').textContent = GameState.scoreX;
        localStorage.setItem('scoreX', GameState.scoreX);
    } else if (winner === 'O') {
        GameState.scoreO++;
        document.getElementById('playerOScore').textContent = GameState.scoreO;
        localStorage.setItem('scoreO', GameState.scoreO);
    }
}

// ===== EXPOSE GAME FUNCTIONS =====
window.startGame = startGame;
window.cancelMatchmaking = cancelMatchmaking;
window.requestRematch = requestRematch;
window.GameState = GameState;