function loadAdminNotifications() {
    const listEl = document.getElementById('adminNotificationList');
    if (!listEl) return;

    renderAdminNotifications();

    const logoutBtn = document.getElementById('adminLogoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            setAuthToken(null);
            apiRequest('/api/admin/logout', 'POST').finally(() => {
                window.location.href = 'admin-login.html';
            });
        });
    }
}

function renderAdminNotifications() {
    const listEl = document.getElementById('adminNotificationList');
    const items = window.NotificationStore.getAll();

    if (items.length === 0) {
        listEl.innerHTML = '<div class="notification-empty">No help messages yet.</div>';
        return;
    }

    listEl.innerHTML = items.map((n) => {
        const isUnread = !n.adminRead;
        const replied = n.reply ? true : false;
        return `
            <div class="notification-item ${isUnread ? 'unread' : ''}" data-id="${n.id}">
                <div class="notification-header">
                    <div class="notification-meta">
                        <div class="notification-title">
                            ${escapeHtml(n.username)}
                            ${isUnread ? '<span class="unread-dot"></span>' : ''}
                        </div>
                        <div class="notification-subtitle">${escapeHtml(n.email)} &middot; ${n.policyType}</div>
                    </div>
                    <div class="notification-timestamp">${formatAdminTimestamp(n.timestamp)}</div>
                </div>
                <div class="notification-preview">${escapeHtml(n.message)}</div>
                <div class="notification-body" id="adminNotifBody-${n.id}">
                    <div class="notification-full-message">${escapeHtml(n.message)}</div>
                    ${replied ? '<p style="color:var(--success-color);font-size:0.875rem;font-weight:600;margin-bottom:var(--spacing-sm);">Reply sent</p>' : ''}
                    <div class="notification-reply-form">
                        <textarea id="adminReply-${n.id}" placeholder="Thank you for reaching out. We have recieved your message regarding your ${n.policyType} policy and we will get back to you shortly">${n.reply ? escapeHtml(n.reply) : ''}</textarea>
                        <button class="btn btn-primary btn-sm" onclick="sendAdminReply(${n.id})">${replied ? 'Update Reply' : 'Send Reply'}</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    listEl.querySelectorAll('.notification-item').forEach((el) => {
        el.addEventListener('click', (e) => {
            if (e.target.closest('.notification-reply-form') || e.target.closest('button')) return;

            const id = parseInt(el.getAttribute('data-id'), 10);
            const body = document.getElementById(`adminNotifBody-${id}`);

            if (body.classList.contains('open')) {
                body.classList.remove('open');
                return;
            }

            listEl.querySelectorAll('.notification-body.open').forEach((b) => b.classList.remove('open'));
            body.classList.add('open');

            if (!window.NotificationStore.getAll().find((n) => n.id === id)?.adminRead) {
                window.NotificationStore.markAdminRead(id);
                el.classList.remove('unread');
                const dot = el.querySelector('.unread-dot');
                if (dot) dot.remove();
                updateAdminNotificationBadge();
            }
        });
    });
}

function sendAdminReply(id) {
    const textarea = document.getElementById(`adminReply-${id}`);
    if (!textarea) return;

    const text = textarea.value.trim();
    if (!text) return;

    window.NotificationStore.replyToMessage(id, text);
    renderAdminNotifications();
    updateAdminNotificationBadge();
}

function updateAdminNotificationBadge() {
    const badge = document.getElementById('adminNotifBadge');
    if (!badge) return;
    const count = window.NotificationStore.getUnreadAdminCount();
    badge.textContent = count > 0 ? count : '';
    badge.setAttribute('data-count', count);
    badge.style.display = count > 0 ? 'flex' : 'none';
}

function formatAdminTimestamp(iso) {
    if (!iso) return '';
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

window.loadAdminNotifications = loadAdminNotifications;
window.sendAdminReply = sendAdminReply;
