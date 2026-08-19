/* ===================================
   NOTIFICATION DATA STORE
   =================================== */
const NotificationStore = {
    _KEY: 'aves_notifications',

    _read() {
        try {
            return JSON.parse(localStorage.getItem(this._KEY)) || [];
        } catch (_) {
            return [];
        }
    },

    _write(data) {
        localStorage.setItem(this._KEY, JSON.stringify(data));
    },

    _nextId(items) {
        return items.length > 0 ? Math.max(...items.map((n) => n.id)) + 1 : 1;
    },

    createHelpMessage(username, email, policyType, message) {
        const items = this._read();
        const now = new Date().toISOString();
        const notification = {
            id: this._nextId(items),
            username,
            email,
            policyType,
            message,
            timestamp: now,
            adminRead: false,
            userRead: false,
            reply: null,
            replyTimestamp: null
        };
        items.unshift(notification);
        this._write(items);
        return notification;
    },

    getAll() {
        return this._read().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    },

    getByUserEmail(email) {
        return this._read()
            .filter((n) => n.email === email)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    },

    getUnreadAdminCount() {
        return this._read().filter((n) => !n.adminRead).length;
    },

    getUnreadUserCount(email) {
        return this._read().filter((n) => n.email === email && n.reply && !n.userRead).length;
    },

    markAdminRead(id) {
        const items = this._read();
        const item = items.find((n) => n.id === id);
        if (item) {
            item.adminRead = true;
            this._write(items);
        }
    },

    markUserRead(id) {
        const items = this._read();
        const item = items.find((n) => n.id === id);
        if (item) {
            item.userRead = true;
            this._write(items);
        }
    },

    replyToMessage(id, replyText) {
        const items = this._read();
        const item = items.find((n) => n.id === id);
        if (item) {
            item.reply = replyText;
            item.replyTimestamp = new Date().toISOString();
            item.userRead = false;
            this._write(items);
            return item;
        }
        return null;
    },

    clearUserMessages(email) {
        const items = this._read().filter((n) => n.email !== email);
        this._write(items);
    },

    _seed() {
        if (this._read().length > 0) return;
        const now = Date.now();
        const samples = [
            {
                id: 1, username: 'Kwame Asante', email: 'kwame@example.com',
                policyType: 'Health Policy', message: 'I need clarification on the hospitalization coverage limits for my health policy. Are there any sub-limits on room charges?',
                timestamp: new Date(now - 86400000 * 2).toISOString(), adminRead: false, userRead: false, reply: null, replyTimestamp: null
            },
            {
                id: 2, username: 'Ama Mensah', email: 'ama@example.com',
                policyType: 'Motor Policy', message: 'My motor policy renewal is due next month. Can I upgrade from third-party to comprehensive coverage during renewal?',
                timestamp: new Date(now - 86400000).toISOString(), adminRead: false, userRead: false, reply: null, replyTimestamp: null
            },
            {
                id: 3, username: 'Kofi Darko', email: 'kofi@example.com',
                policyType: 'Life Policy', message: 'I would like to update my beneficiary details on my life policy. What documents are required for this change?',
                timestamp: new Date(now - 3600000 * 5).toISOString(), adminRead: false, userRead: false, reply: null, replyTimestamp: null
            }
        ];
        this._write(samples);
    }
};

NotificationStore._seed();

window.NotificationStore = NotificationStore;

function updateUserNotificationBadge() {
    const badge = document.getElementById('userNotifBadge');
    if (!badge) return;
    const email = localStorage.getItem('aves_user_email');
    if (!email) {
        badge.style.display = 'none';
        return;
    }
    const count = window.NotificationStore.getUnreadUserCount(email);
    badge.textContent = count > 0 ? count : '';
    badge.setAttribute('data-count', count);
    badge.style.display = count > 0 ? 'flex' : 'none';
}

window.updateUserNotificationBadge = updateUserNotificationBadge;
