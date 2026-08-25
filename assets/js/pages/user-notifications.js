function loadUserNotifications() {
    const listEl = document.getElementById('userNotificationList');
    if (!listEl) return;

    const email = localStorage.getItem('aves_user_email');
    if (!email) {
        listEl.innerHTML = '<div class="notification-empty">Please log in to view notifications.</div>';
        return;
    }

    renderUserNotifications(email);

    const clearBtn = document.getElementById('clearUserNotifications');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            window.NotificationStore.clearUserMessages(email);
            renderUserNotifications(email);
            if (window.updateUserNotificationBadge) window.updateUserNotificationBadge();
        });
    }
}

function renderUserNotifications(email) {
    const listEl = document.getElementById('userNotificationList');
    const items = window.NotificationStore.getByUserEmail(email);

    if (window.updateUserNotificationBadge) window.updateUserNotificationBadge();

    if (items.length === 0) {
        listEl.innerHTML = '<div class="notification-empty">No notifications yet.</div>';
        return;
    }

    listEl.innerHTML = items.map((n) => {
        const isUnread = n.reply && !n.userRead;
        const replyPreview = n.reply
            ? `<div class="notification-reply-box">
                   <h4>Admin Reply</h4>
                   <p>${escapeHtml(n.reply)}</p>
                   <div class="notification-reply-time">${formatTimestamp(n.replyTimestamp)}</div>
               </div>`
            : '';
        return `
            <div class="notification-item ${isUnread ? 'unread' : ''}" data-id="${n.id}">
                <div class="notification-header">
                    <div class="notification-meta">
                        <div class="notification-title">
                            ${n.policyType}
                            ${isUnread ? '<span class="unread-dot"></span>' : ''}
                        </div>
                        <div class="notification-subtitle">Re: ${escapeHtml(n.message.substring(0, 80))}${n.message.length > 80 ? '...' : ''}</div>
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
    }).join('');

    listEl.querySelectorAll('.notification-item').forEach((el) => {
        el.addEventListener('click', () => {
            const id = parseInt(el.getAttribute('data-id'), 10);
            const body = document.getElementById(`userNotifBody-${id}`);

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
            }
        });
    });
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
