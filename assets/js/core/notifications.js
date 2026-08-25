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

    createComplaintReplyNotification(email, subject, complaintId, replyText, replyTimestamp) {
        const items = this._read();
        const existing = items.find(
            (n) => n.complaintId === complaintId && n.type === 'complaint_reply'
        );
        if (existing) {
            existing.reply = replyText;
            existing.replyTimestamp = replyTimestamp;
            existing.message = subject;
            existing.userRead = false;
            existing.unreadCount = (existing.unreadCount || 0) + 1;
            this._write(items);
            return existing;
        }
        const notification = {
            id: this._nextId(items),
            username: 'Aves Admin',
            email,
            policyType: 'Complaint: ' + subject,
            message: subject,
            timestamp: replyTimestamp || new Date().toISOString(),
            adminRead: true,
            userRead: false,
            reply: replyText,
            replyTimestamp: replyTimestamp || new Date().toISOString(),
            type: 'complaint_reply',
            complaintId,
            unreadCount: 1
        };
        items.unshift(notification);
        this._write(items);
        return notification;
    },

    createSystemMessage(email, title, message) {
        const items = this._read();
        const notification = {
            id: this._nextId(items),
            username: 'Aves Admin',
            email,
            policyType: title,
            message,
            timestamp: new Date().toISOString(),
            adminRead: true,
            userRead: false,
            reply: null,
            replyTimestamp: null,
            system: true
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

    getTotalUnreadMessages(email) {
        const items = this._read().filter((n) => n.email === email);
        let count = 0;
        items.forEach((n) => {
            if (n.type === 'complaint_reply') {
                if (!n.userRead) count += (n.unreadCount || 1);
            } else if (n.reply && !n.userRead) {
                count += 1;
            }
        });
        return count;
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
            item.unreadCount = 0;
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

/* Mirror backend notifications (approvals, renewals, purchases...) into the visible feed.
   Server-side records are tracked by id so nothing is duplicated across reloads. */
const SERVER_NOTIF_SEEN_KEY = 'aves_server_notifications_seen';

function getSeenServerNotifIds() {
    try {
        return JSON.parse(localStorage.getItem(SERVER_NOTIF_SEEN_KEY)) || [];
    } catch (_) {
        return [];
    }
}

async function syncServerNotifications() {
    const email = localStorage.getItem('aves_user_email');
    if (!email) return;

    const response = await apiRequest('/api/notifications', 'GET');
    if (!response.ok || !Array.isArray(response.data)) return;

    const seen = getSeenServerNotifIds();
    const titles = {
        renewal: 'Policy Renewed',
        purchase: 'Policy Approved',
        complaint_reply: 'Complaint Reply'
    };

    let changed = false;
    response.data.forEach((n) => {
        const key = 'srv-' + n.id;
        if (seen.indexOf(key) !== -1) return;
        if (n.type === 'complaint_reply' && n.complaintId) {
            window.NotificationStore.createComplaintReplyNotification(
                email,
                n.subject || 'Complaint',
                n.complaintId,
                n.replyText || n.message,
                n.replyTimestamp || n.date
            );
        } else {
            window.NotificationStore.createSystemMessage(
                email,
                titles[n.type] || 'Aves Admin',
                n.message
            );
        }
        seen.push(key);
        changed = true;
    });

    localStorage.setItem(SERVER_NOTIF_SEEN_KEY, JSON.stringify(seen.slice(-500)));

    if (changed && window.updateUserNotificationBadge) {
        window.updateUserNotificationBadge();
    }
}

window.syncServerNotifications = syncServerNotifications;

function updateUserNotificationBadge() {
    const badge = document.getElementById('userNotifBadge');
    if (!badge) return;
    const email = localStorage.getItem('aves_user_email');
    if (!email) {
        badge.style.display = 'none';
        return;
    }
    const count = window.NotificationStore.getTotalUnreadMessages(email);
    badge.textContent = count > 0 ? count : '';
    badge.setAttribute('data-count', count);
    badge.style.display = count > 0 ? 'flex' : 'none';
}

window.updateUserNotificationBadge = updateUserNotificationBadge;
