const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const USERS_FILE = path.join(__dirname, '..', 'database', 'users.json');

class UserManager {
    constructor() {
        this.users = this.loadUsers();
        this.items = {
            '1': { id: '1', name: 'طلای X', price: 50, type: 'style' },
            '2': { id: '2', name: 'طلای O', price: 50, type: 'style' },
            '3': { id: '3', name: 'پس‌زمینه طلایی', price: 30, type: 'background' },
            '4': { id: '4', name: 'آواتار سلطنتی', price: 100, type: 'avatar' },
            '5': { id: '5', name: 'نشان طلا', price: 75, type: 'badge' }
        };
    }

    loadUsers() {
        try {
            if (fs.existsSync(USERS_FILE)) {
                const data = fs.readFileSync(USERS_FILE, 'utf8');
                return JSON.parse(data);
            }
            return {};
        } catch (error) {
            console.error('Error loading users:', error);
            return {};
        }
    }

    saveUsers() {
        try {
            fs.writeFileSync(USERS_FILE, JSON.stringify(this.users, null, 2));
        } catch (error) {
            console.error('Error saving users:', error);
        }
    }

    async registerUser(username, password) {
        // Check if username exists
        if (Object.values(this.users).find(u => u.username === username)) {
            return { success: false, message: 'این نام کاربری قبلاً ثبت شده است' };
        }

        const userId = uuidv4();
        const hashedPassword = await bcrypt.hash(password, 10);
        
        this.users[userId] = {
            id: userId,
            username: username,
            password: hashedPassword,
            coins: 100, // Start with 100 coins
            wins: 0,
            losses: 0,
            draws: 0,
            items: [],
            createdAt: new Date().toISOString()
        };

        this.saveUsers();
        return { 
            success: true, 
            message: 'ثبت نام با موفقیت انجام شد',
            userId: userId,
            user: { ...this.users[userId], password: undefined }
        };
    }

    async loginUser(username, password) {
        const user = Object.values(this.users).find(u => u.username === username);
        if (!user) {
            return { success: false, message: 'نام کاربری یا رمز عبور اشتباه است' };
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return { success: false, message: 'نام کاربری یا رمز عبور اشتباه است' };
        }

        return { 
            success: true, 
            message: 'ورود با موفقیت انجام شد',
            userId: user.id,
            user: { ...user, password: undefined }
        };
    }

    getUser(userId) {
        const user = this.users[userId];
        if (user) {
            return { ...user, password: undefined };
        }
        return null;
    }

    addCoins(userId, amount) {
        if (this.users[userId]) {
            this.users[userId].coins += amount;
            this.saveUsers();
            return true;
        }
        return false;
    }

    buyItem(userId, itemId) {
        const user = this.users[userId];
        const item = this.items[itemId];
        
        if (!user || !item) {
            return { success: false, message: 'کاربر یا آیتم یافت نشد' };
        }

        if (user.coins < item.price) {
            return { success: false, message: 'سکه کافی نیست' };
        }

        if (user.items.includes(itemId)) {
            return { success: false, message: 'این آیتم قبلاً خریداری شده است' };
        }

        user.coins -= item.price;
        user.items.push(itemId);
        this.saveUsers();

        return { 
            success: true, 
            message: `آیتم ${item.name} با موفقیت خریداری شد`,
            user: { ...user, password: undefined }
        };
    }

    getLeaderboard() {
        const users = Object.values(this.users)
            .map(u => ({ 
                username: u.username, 
                wins: u.wins || 0,
                coins: u.coins || 0,
                draws: u.draws || 0
            }))
            .sort((a, b) => b.wins - a.wins)
            .slice(0, 10);
        
        return users;
    }

    updateStats(userId, result) {
        const user = this.users[userId];
        if (user) {
            if (result === 'win') user.wins = (user.wins || 0) + 1;
            else if (result === 'loss') user.losses = (user.losses || 0) + 1;
            else if (result === 'draw') user.draws = (user.draws || 0) + 1;
            this.saveUsers();
        }
    }
}

module.exports = UserManager;