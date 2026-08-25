let adminComplaints = [];

function loadAdminComplaintsPage() {
    const listEl = document.getElementById('adminComplaintList');
    if (!listEl) return;

    setupAdminLogout();
    refreshAdminComplaints();
}

async function refreshAdminComplaints() {
    const listEl = document.getElementById('adminComplaintList');

    const response = await apiRequest('/api/admin/complaints', 'GET');
    if (!response.ok) {
        if (response.status === 401) {
            window.location.href = 'admin-login.html';
            return;
        }
        listEl.innerHTML = '<div class="notification-empty">' + escapeHtml(response.message || 'Failed to load complaints.') + '</div>';
        return;
    }

    adminComplaints = response.data || [];
    renderAdminComplaints();
}

function renderAdminComplaints() {
    const listEl = document.getElementById('adminComplaintList');

    if (adminComplaints.length === 0) {
        listEl.innerHTML = '<div class="notification-empty">No complaints have been filed yet.</div>';
        return;
    }

    listEl.innerHTML = adminComplaints.map((c) => `
        <div class="notification-item" data-id="${c.id}">
            <div class="notification-header">
                <div class="notification-meta">
                    <div class="notification-title">${escapeHtml(c.subject)} ${statusBadge(c.status)}</div>
                    <div class="notification-subtitle">${escapeHtml(c.userName)} &middot; ${escapeHtml(c.userEmail)} &middot; ${formatTimestamp(c.createdAt)}</div>
                </div>
                <div class="notification-timestamp">${c.replies.length > 0 ? c.replies.length + ' repl' + (c.replies.length === 1 ? 'y' : 'ies') : 'No replies yet'}</div>
            </div>
            <div class="chat-thread" id="adminComplaintThread-${c.id}" style="display:none;"></div>
        </div>
    `).join('');

    listEl.querySelectorAll('.notification-item').forEach((el) => {
        el.addEventListener('click', (e) => {
            if (e.target.closest('.chat-reply-form')) return;
            const id = parseInt(el.getAttribute('data-id'), 10);
            toggleAdminComplaintThread(id);
        });
    });
}

function toggleAdminComplaintThread(id) {
    const thread = document.getElementById(`adminComplaintThread-${id}`);

    document.querySelectorAll('#adminComplaintList .chat-thread.open').forEach((t) => {
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

    const complaint = adminComplaints.find((c) => c.id === id);
    if (!complaint) return;

    renderAdminThread(complaint);
    thread.classList.add('open');
    thread.style.display = 'flex';
}

function renderAdminThread(complaint) {
    const thread = document.getElementById(`adminComplaintThread-${complaint.id}`);
    if (!thread) return;

    const resolvedButton = complaint.status !== 'resolved'
        ? `<button type="button" class="btn btn-secondary btn-sm" onclick="markComplaintResolved(${complaint.id})">Mark Resolved</button>`
        : '';

    thread.innerHTML = `
        ${buildAdminBubbles(complaint)}
        <form class="chat-reply-form" data-id="${complaint.id}">
            <textarea class="chat-reply-input" placeholder="Write a reply to ${escapeHtml(complaint.userName)}..." maxlength="5000" required></textarea>
            <div class="chat-reply-actions">
                ${resolvedButton}
                <button type="submit" class="btn btn-primary btn-sm">Send Reply</button>
            </div>
            <p class="chat-reply-message"></p>
        </form>
    `;

    const form = thread.querySelector('.chat-reply-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await sendAdminComplaintReply(complaint.id, form);
    });

    thread.scrollTop = thread.scrollHeight;
}

async function sendAdminComplaintReply(id, form) {
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

    const response = await apiRequest(`/api/admin/complaints/${id}/reply`, 'POST', { message });
    if (!response.ok) {
        if (response.status === 401) {
            window.location.href = 'admin-login.html';
            return;
        }
        messageEl.textContent = response.message || 'Failed to send reply.';
        messageEl.classList.add('form-message-error');
        return;
    }

    updateLocalComplaint(response.data);
    input.value = '';
}

async function markComplaintResolved(id) {
    const response = await apiRequest(`/api/admin/complaints/${id}/status`, 'PUT', { status: 'resolved' });
    if (!response.ok) {
        if (response.status === 401) {
            window.location.href = 'admin-login.html';
            return;
        }
        alert(response.message || 'Failed to update status.');
        return;
    }

    updateLocalComplaint(response.data);
}

function updateLocalComplaint(updated) {
    const index = adminComplaints.findIndex((c) => c.id === updated.id);
    if (index !== -1) {
        adminComplaints[index] = { ...adminComplaints[index], ...updated };
    }

    const item = document.querySelector(`#adminComplaintList .notification-item[data-id="${updated.id}"]`);
    if (item) {
        const headerMeta = item.querySelector('.notification-title');
        if (headerMeta) {
            const complaint = adminComplaints.find((c) => c.id === updated.id);
            headerMeta.innerHTML = `${escapeHtml(complaint.subject)} ${statusBadge(complaint.status)}`;
        }
    }

    renderAdminThread(adminComplaints.find((c) => c.id === updated.id));
}

function buildAdminBubbles(complaint) {
    const bubbles = [];

    bubbles.push(`
        <div class="chat-bubble chat-bubble-user">
            <div class="chat-meta">${escapeHtml(complaint.userName || 'User')} &middot; ${formatTimestamp(complaint.createdAt)}</div>
            <div class="chat-message">${escapeHtml(complaint.description)}</div>
        </div>
    `);

    complaint.replies.forEach((reply) => {
        bubbles.push(`
            <div class="chat-bubble chat-bubble-admin">
                <div class="chat-meta">You (Admin) &middot; ${formatTimestamp(reply.timestamp)}</div>
                <div class="chat-message">${escapeHtml(reply.message)}</div>
            </div>
        `);
    });

    if (complaint.replies.length === 0) {
        bubbles.push('<div class="chat-waiting">No replies yet. Send a reply below.</div>');
    }

    return bubbles.join('');
}

function setupAdminLogout() {
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

function statusBadge(status) {
    const badgeClass = status === 'resolved' ? 'badge-success' : status === 'in-progress' ? 'badge-error' : 'badge-warning';
    const label = status === 'in-progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1);
    return `<span class="badge ${badgeClass}">${label}</span>`;
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
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
}

window.loadAdminComplaintsPage = loadAdminComplaintsPage;
window.markComplaintResolved = markComplaintResolved;
