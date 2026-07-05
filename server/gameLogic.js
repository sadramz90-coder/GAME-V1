class GameLogic {
    constructor() {
        this.games = new Map();
    }

    createGame(gameId, playerX, playerO) {
        const game = {
            id: gameId,
            playerX: playerX,
            playerO: playerO,
            board: Array(9).fill(null),
            currentPlayer: 'X',
            winner: null,
            isDraw: false,
            moves: []
        };
        this.games.set(gameId, game);
        return game;
    }

    makeMove(gameId, playerId, position) {
        const game = this.games.get(gameId);
        if (!game) {
            return { success: false, message: 'بازی یافت نشد' };
        }

        // Check if game is over
        if (game.winner || game.isDraw) {
            return { success: false, message: 'بازی به پایان رسیده است' };
        }

        // Check if it's player's turn
        const playerSymbol = playerId === game.playerX ? 'X' : 'O';
        if (playerSymbol !== game.currentPlayer) {
            return { success: false, message: 'نوبت شما نیست' };
        }

        // Check if position is valid
        if (position < 0 || position > 8 || game.board[position] !== null) {
            return { success: false, message: 'موقعیت نامعتبر' };
        }

        // Make move
        game.board[position] = playerSymbol;
        game.moves.push({ player: playerSymbol, position });

        // Check for win
        if (this.checkWin(game.board, playerSymbol)) {
            game.winner = playerSymbol;
            return { success: true, message: 'شما برنده شدید!' };
        }

        // Check for draw
        if (this.checkDraw(game.board)) {
            game.isDraw = true;
            return { success: true, message: 'بازی مساوی شد!' };
        }

        // Switch turns
        game.currentPlayer = game.currentPlayer === 'X' ? 'O' : 'X';
        return { success: true, message: 'حرکت انجام شد' };
    }

    checkWin(board, player) {
        const winPatterns = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
            [0, 4, 8], [2, 4, 6] // Diagonals
        ];

        return winPatterns.some(pattern => 
            pattern.every(index => board[index] === player)
        );
    }

    checkDraw(board) {
        return board.every(cell => cell !== null);
    }

    getGame(gameId) {
        return this.games.get(gameId);
    }

    deleteGame(gameId) {
        this.games.delete(gameId);
    }
}

module.exports = GameLogic;