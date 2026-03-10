const DB_NAME = 'SmartCanteenDB';
const DB_VERSION = 1;

class DbService {
    constructor() {
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => {
                console.error("Database error:", event.target.error);
                reject("Database error");
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Menu Items Store
                if (!db.objectStoreNames.contains('menuItems')) {
                    const menuStore = db.createObjectStore('menuItems', { keyPath: 'id' });
                    menuStore.createIndex('category', 'category', { unique: false });
                }

                // Orders Store
                if (!db.objectStoreNames.contains('orders')) {
                    const orderStore = db.createObjectStore('orders', { keyPath: 'id' });
                    orderStore.createIndex('status', 'status', { unique: false });
                    orderStore.createIndex('timestamp', 'timestamp', { unique: false });
                    orderStore.createIndex('tokenNumber', 'tokenNumber', { unique: false });
                }

                // Settings Store
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }

                // Logs Store
                if (!db.objectStoreNames.contains('logs')) {
                    db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
                }

                // Users Store
                if (!db.objectStoreNames.contains('users')) {
                    db.createObjectStore('users', { keyPath: 'username' });
                }

                // Feedback Store
                if (!db.objectStoreNames.contains('feedback')) {
                    db.createObjectStore('feedback', { keyPath: 'id', autoIncrement: true });
                }
            };
        });
    }

    async get(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async put(storeName, item) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(item);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async delete(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getByIndex(storeName, indexName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async clear(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Helper for generating tokens
    async getNextToken() {
        let settings = await this.get('settings', 'currentToken');
        let nextToken = 1;
        
        let shouldReset = false;
        const lastDateSetting = await this.get('settings', 'tokenDate');
        const today = new Date().toDateString();
        
        if (lastDateSetting && lastDateSetting.value !== today) {
            const autoResetSetting = await this.get('settings', 'autoDailyReset');
            if(autoResetSetting && autoResetSetting.value === true) {
                shouldReset = true;
            }
        }
        
        if (settings && !shouldReset) {
            nextToken = settings.value + 1;
        }

        await this.put('settings', { key: 'currentToken', value: nextToken });
        await this.put('settings', { key: 'tokenDate', value: today });
        return nextToken;
    }

    async logActivity(action, user = 'System') {
        await this.put('logs', {
            action,
            user,
            timestamp: Date.now()
        });
    }
}

// Global Singleton
window.dbService = new DbService();
