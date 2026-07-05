const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const GameLogic = require('./gameLogic');
const UserManager = require('./userManager');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ 
    server,
    perMessageDeflate: false
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// Initialize managers
const userManager = new UserManager();
const gameLogic = new GameLogic();

// Store active games and connections
const activeGames = new Map();
const userConnections = new Map();
const waitingPlayers = [];

// WebSocket connection handling
wss.on('connection', (ws, req) => {
    console.log('New client connected');
    let userId = null;

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            
            switch(data.type) {
                case 'auth':
                    userId = data.userId;
                    userConnections.set(userId, ws);
                    ws.userId = userId;
                    
                    // Check if user is in waiting list
                    const waitingIndex = waitingPlayers.indexOf(userId);
                    if (waitingIndex !== -1) {
                        waitingPlayers.splice(waitingIndex, 1);
                    }
                    
                    // Find opponent
                    if (waitingPlayers.length > 0) {
                        const opponentId = waitingPlayers[0];
                        waitingPlayers.shift();
                        
                        // Create new game
                        const gameId = uuidv4();
                        const game = gameLogic.createGame(gameId, userId, opponentId);
                        activeGames.set(gameId, game);
                        
                        // Notify both players
                        const gameData = {
                            type: 'game_start',
                            gameId: gameId,
                            player: 'X',
                            opponent: opponentId
                        };
                        
                        const opponentData = {
                            type: 'game_start',
                            gameId: gameId,
                            player: 'O',
                            opponent: userId
                        };
                        
                        sendToUser(userId, gameData);
                        sendToUser(opponentId, opponentData);
                    } else {
                        waitingPlayers.push(userId);
                        sendToUser(userId, { type: 'waiting', message: 'در حال جستجوی حریف...' });
                    }
                    break;
                    
                case 'move':
                    const { gameId, position } = data;
                    const game = activeGames.get(gameId);
                    if (game) {
                        const result = gameLogic.makeMove(gameId, userId, position);
                        if (result.success) {
                            // Broadcast move to both players
                            const moveData = {
                                type: 'move_made',
                                position: position,
                                player: userId,
                                board: game.board
                            };
                            
                            const gameState = {
                                type: 'game_state',
                                board: game.board,
                                currentPlayer: game.currentPlayer,
                                winner: game.winner,
                                isDraw: game.isDraw
                            };
                            
                            broadcastToGame(gameId, moveData);
                            broadcastToGame(gameId, gameState);
                            
                            // Check for game end
                            if (game.winner || game.isDraw) {
                                const endData = {
                                    type: 'game_end',
                                    winner: game.winner,
                                    isDraw: game.isDraw,
                                    board: game.board
                                };
                                broadcastToGame(gameId, endData);
                                
                                // Update coins
                                if (game.winner) {
                                    const winnerId = game.winner === 'X' ? game.playerX : game.playerO;
                                    const loserId = game.winner === 'X' ? game.playerO : game.playerX;
                                    userManager.addCoins(winnerId, 10);
                                    userManager.addCoins(loserId, 2);
                                } else if (game.isDraw) {
                                    userManager.addCoins(game.playerX, 5);
                                    userManager.addCoins(game.playerO, 5);
                                }
                                
                                activeGames.delete(gameId);
                            }
                        } else {
                            sendToUser(userId, { type: 'error', message: result.message });
                        }
                    }
                    break;
                    
                case 'rematch':
                    // Handle rematch request
                    break;
                    
                default:
                    console.log('Unknown message type:', data.type);
            }
        } catch (error) {
            console.error('Error processing message:', error);
            ws.send(JSON.stringify({ type: 'error', message: 'خطا در پردازش درخواست' }));
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        if (userId) {
            userConnections.delete(userId);
            // Remove from waiting list
            const waitingIndex = waitingPlayers.indexOf(userId);
            if (waitingIndex !== -1) {
                waitingPlayers.splice(waitingIndex, 1);
            }
        }
    });
});

function sendToUser(userId, data) {
    const ws = userConnections.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
    }
}

function broadcastToGame(gameId, data) {
    const game = activeGames.get(gameId);
    if (game) {
        sendToUser(game.playerX, data);
        sendToUser(game.playerO, data);
    }
}

// API Routes
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const result = await userManager.registerUser(username, password);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: 'خطا در ثبت نام' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const result = await userManager.loginUser(username, password);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: 'خطا در ورود' });
    }
});

app.get('/api/user/:userId', async (req, res) => {
    try {
        const user = await userManager.getUser(req.params.userId);
        if (user) {
            res.json({ success: true, user });
        } else {
            res.json({ success: false, message: 'کاربر یافت نشد' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'خطا در دریافت اطلاعات' });
    }
});

app.post('/api/buy-item', async (req, res) => {
    try {
        const { userId, itemId } = req.body;
        const result = await userManager.buyItem(userId, itemId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: 'خطا در خرید' });
    }
});

app.get('/api/leaderboard', async (req, res) => {
    try {
        const leaders = await userManager.getLeaderboard();
        res.json({ success: true, leaders });
    } catch (error) {
        res.status(500).json({ success: false, message: 'خطا در دریافت جدول امتیازات' });
    }
});

// Serve HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'login.html'));
});

app.get('/shop', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'shop.html'));
});

app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'profile.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`🔌 WebSocket server is active`);
});
