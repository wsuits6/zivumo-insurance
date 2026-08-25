let userNotificationsComplaints = {};

function loadUserNotifications() {
    const listEl = document.getElementById('userNotificationList');
    if (!listEl) return;

    const email = localStorage.getItem('aves_user_email');
    if (!email) {
        listEl.innerHTML = '<div class="notification-empty">Please log in to view notifications.</div>';
        return;
    }

    if (window.syncServerNotifications) {
        window.syncServerNotifications().then(() => {
            renderUserNotifications(email);
        });
    } else {
        renderUserNotifications(email);
    }

    const clearBtn = document.getElementById('clearUserNotifications');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            window.NotificationStore.clearUserMessages(email);
            userNotificationsComplaints = {};
            renderUserNotifications(email);
            if (window.updateUserNotificationBadge) window.updateUserNotificationBadge();
        });
    }
}

async function fetchComplaintThreads(complaintIds) {
    if (complaintIds.length === 0) return;

    const uniqueIds = [...new Set(complaintIds)];
    const toFetch = uniqueIds.filter((id) => !userNotificationsComplaints[id]);
    if (toFetch.length === 0) return;

    const response = await apiRequest('/api/complaints', 'GET');
    if (response.ok && Array.isArray(response.data)) {
        toFetch.forEach((id) => {
            const found = response.data.find((c) => c.id === id);
            if (found) {
                userNotificationsComplaints[id] = found;
            }
        });
    }
}

async function renderUserNotifications(email) {
    const listEl = document.getElementById('userNotificationList');
    const items = window.NotificationStore.getByUserEmail(email);

    if (window.updateUserNotificationBadge) window.updateUserNotificationBadge();
    updateNotificationSummary(email, items);

    if (items.length === 0) {
        listEl.innerHTML = '<div class="notification-empty">No notifications yet.</div>';
        return;
    }

    const complaintIds = items
        .filter((n) => n.type === 'complaint_reply' && n.complaintId)
        .map((n) => n.complaintId);

    await fetchComplaintThreads(complaintIds);

    listEl.innerHTML = items.map((n) => {
        if (n.type === 'complaint_reply' && n.complaintId && userNotificationsComplaints[n.complaintId]) {
            return renderComplaintThreadNotification(n);
        }
        return renderRegularNotification(n);
    }).join('');

    setupNotificationClickHandlers(items);
}

function updateNotificationSummary(email, items) {
    const summaryEl = document.getElementById('notificationSummary');
    if (!summaryEl) return;

    const unreadCount = window.NotificationStore.getTotalUnreadMessages(email);
    const complaintReplies = items.filter((n) => n.type === 'complaint_reply');
    const helpReplies = items.filter((n) => n.type !== 'complaint_reply' && n.reply && !n.userRead);

    let parts = [];
    if (complaintReplies.length > 0) {
        parts.push(complaintReplies.length + ' complaint repl' + (complaintReplies.length === 1 ? 'y' : 'ies'));
    }
    if (helpReplies.length > 0) {
        parts.push(helpReplies.length + ' help message' + (helpReplies.length === 1 ? '' : 's'));
    }

    if (items.length === 0) {
        summaryEl.textContent = '';
    } else if (unreadCount > 0) {
        summaryEl.textContent = unreadCount + ' unread message' + (unreadCount === 1 ? '' : 's') + ' \u00B7 ' + items.length + ' total';
    } else {
        summaryEl.textContent = items.length + ' notification' + (items.length === 1 ? '' : 's');
    }
}

function renderComplaintThreadNotification(n) {
    const complaint = userNotificationsComplaints[n.complaintId];
    const isUnread = !n.userRead;
    const statusBadgeClass = complaint.status === 'resolved' ? 'badge-success' : complaint.status === 'in-progress' ? 'badge-error' : 'badge-warning';
    const statusLabel = complaint.status === 'in-progress' ? 'In Progress' : complaint.status.charAt(0).toUpperCase() + complaint.status.slice(1);
    const unreadCount = isUnread ? (n.unreadCount || 1) : 0;

    return `
        <div class="notification-item ${isUnread ? 'unread' : ''}" data-id="${n.id}" data-complaint-id="${n.complaintId}">
            <div class="notification-header">
                <div class="notification-meta">
                    <div class="notification-title">
                        ${escapeHtml(complaint.subject)}
                        <span class="badge ${statusBadgeClass}">${statusLabel}</span>
                        ${isUnread ? '<span class="unread-dot"></span>' : ''}
                    </div>
                    <div class="notification-subtitle">
                        Complaint Reply &middot; ${complaint.replies.length} repl${complaint.replies.length === 1 ? 'y' : 'ies'}
                        ${unreadCount > 0 ? ' &middot; <strong>' + unreadCount + ' new</strong>' : ''}
                    </div>
                </div>
                <div class="notification-timestamp">${formatTimestamp(n.replyTimestamp || n.timestamp)}</div>
            </div>
            <div class="chat-thread" id="notifComplaintThread-${n.id}" style="display:none;"></div>
        </div>
    `;
}

function renderRegularNotification(n) {
    const isUnread = n.reply && !n.userRead;
    const replyPreview = n.reply
        ? `<div class="notification-reply-box">
               <h4>${n.type === 'complaint_reply' ? 'Admin Reply to Complaint' : 'Admin Reply'}</h4>
               <p>${escapeHtml(n.reply)}</p>
               <div class="notification-reply-time">${formatTimestamp(n.replyTimestamp)}</div>
           </div>`
        : '';
    return `
        <div class="notification-item ${isUnread ? 'unread' : ''}" data-id="${n.id}">
            <div class="notification-header">
                <div class="notification-meta">
                    <div class="notification-title">
                        ${escapeHtml(n.policyType)}
                        ${isUnread ? '<span class="unread-dot"></span>' : ''}
                    </div>
                    <div class="notification-subtitle">${n.message.length > 80 ? escapeHtml(n.message.substring(0, 80)) + '...' : escapeHtml(n.message)}</div>
                </div>
                <div class="notification-timestamp">${formatTimestamp(n.timestamp)}</div>
            </div>
            <div class="notification-body" id="userNotifBody-${n.id}">
                <div class="notification-full-message">${escapeHtml(n.message)}</div>
                ${replyPreview}
                ${(!n.reply && !n.system) ? '<p style="color:var(--text-secondary);font-size:0.875rem;font-style:italic;">Waiting for admin reply...</p>' : ''}
            </div>
        </div>
    `;
}

function setupNotificationClickHandlers(items) {
    const listEl = document.getElementById('userNotificationList');

    listEl.querySelectorAll('.notification-item').forEach((el) => {
        el.addEventListener('click', (e) => {
            if (e.target.closest('.chat-reply-form') || e.target.closest('button') || e.target.closest('.chat-thread')) return;

            const id = parseInt(el.getAttribute('data-id'), 10);
            const complaintId = el.getAttribute('data-complaint-id');

            if (complaintId) {
                toggleNotifComplaintThread(id, parseInt(complaintId, 10));
                return;
            }

            const body = document.getElementById(`userNotifBody-${id}`);
            if (!body) return;

            if (body.classList.contains('open')) {
                body.classList.remove('open');
                return;
            }

            listEl.querySelectorAll('.notification-body.open').forEach((b) => b.classList.remove('open'));
            body.classList.add('open');

            const item = items.find((n) => n.id === id);
            if (item && item.reply && !item.userRead) {
                window.NotificationStore.markUserRead(id);
                el.classList.remove('unread');
                const dot = el.querySelector('.unread-dot');
                if (dot) dot.remove();
                if (window.updateUserNotificationBadge) window.updateUserNotificationBadge();
                const email = localStorage.getItem('aves_user_email');
                updateNotificationSummary(email, window.NotificationStore.getByUserEmail(email));
            }
        });
    });
}

function toggleNotifComplaintThread(notifId, complaintId) {
    const thread = document.getElementById(`notifComplaintThread-${notifId}`);

    document.querySelectorAll('#userNotificationList .chat-thread.open').forEach((t) => {
        if (t !== thread) {
            t.classList.remove('open');
            t.style.display = 'none';
        }
    });

    if (thread.classList.contains('open')) {
        thread.classList.remove('open');
        thread.style.display = 'none';
        return;
    }

    const complaint = userNotificationsComplaints[complaintId];
    if (!complaint) return;

    renderNotifComplaintThread(notifId, complaint);
    thread.classList.add('open');
    thread.style.display = 'flex';
    thread.scrollTop = thread.scrollHeight;

    const item = document.querySelector(`#userNotificationList .notification-item[data-id="${notifId}"]`);
    if (item && item.classList.contains('unread')) {
        window.NotificationStore.markUserRead(notifId);
        item.classList.remove('unread');
        const dot = item.querySelector('.unread-dot');
        if (dot) dot.remove();
        const countEl = item.querySelector('.notification-subtitle strong');
        if (countEl) countEl.remove();
        if (window.updateUserNotificationBadge) window.updateUserNotificationBadge();
        const email = localStorage.getItem('aves_user_email');
        updateNotificationSummary(email, window.NotificationStore.getByUserEmail(email));
    }
}

function renderNotifComplaintThread(notifId, complaint) {
    const thread = document.getElementById(`notifComplaintThread-${notifId}`);
    if (!thread) return;

    const bubbles = [];
    bubbles.push(`
        <div class="chat-bubble chat-bubble-user">
            <div class="chat-meta">You &middot; ${formatTimestamp(complaint.createdAt)}</div>
            <div class="chat-message">${escapeHtml(complaint.description)}</div>
        </div>
    `);

    complaint.replies.forEach((reply) => {
        const isAdmin = reply.sender === 'admin';
        bubbles.push(`
            <div class="chat-bubble ${isAdmin ? 'chat-bubble-admin' : 'chat-bubble-user'}">
                <div class="chat-meta">${isAdmin ? 'Support Team' : 'You'} &middot; ${formatTimestamp(reply.timestamp)}</div>
                <div class="chat-message">${escapeHtml(reply.message)}</div>
            </div>
        `);
    });

    if (complaint.replies.length === 0) {
        bubbles.push('<div class="chat-waiting">Waiting for a reply from our support team...</div>');
    }

    thread.innerHTML = `
        ${bubbles.join('')}
        ${complaint.status !== 'resolved' ? `
        <form class="chat-reply-form" data-notif-id="${notifId}" data-complaint-id="${complaint.id}">
            <textarea class="chat-reply-input" placeholder="Write a reply to support..." maxlength="5000" required></textarea>
            <div class="chat-reply-actions">
                <button type="submit" class="btn btn-primary btn-sm">Send Reply</button>
            </div>
            <p class="chat-reply-message"></p>
        </form>
        ` : '<div class="chat-waiting">This complaint has been resolved.</div>'}
    `;

    const form = thread.querySelector('.chat-reply-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await sendNotifComplaintReply(complaint.id, form, notifId);
        });
    }

    thread.scrollTop = thread.scrollHeight;
}

async function sendNotifComplaintReply(complaintId, form, notifId) {
    const input = form.querySelector('.chat-reply-input');
    const messageEl = form.querySelector('.chat-reply-message');

    messageEl.textContent = '';
    messageEl.classList.remove('form-message-error');

    const message = input.value.trim();
    if (!message) {
        messageEl.textContent = 'Please write a reply first.';
        messageEl.classList.add('form-message-error');
        return;
    }

    const email = localStorage.getItem('aves_user_email');
    const response = await apiRequest(`/api/complaints/${complaintId}/reply`, 'POST', { message, email });
    if (!response.ok) {
        messageEl.textContent = response.message || 'Failed to send reply.';
        messageEl.classList.add('form-message-error');
        return;
    }

    userNotificationsComplaints[complaintId] = response.data;
    input.value = '';
    renderNotifComplaintThread(notifId, response.data);
}

function formatTimestamp(iso) {
    const d = new Date(iso);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

window.loadUserNotifications = loadUserNotifications;
