let userComplaints = [];

function loadUserComplaintsPage() {
    const listEl = document.getElementById('complaintList');
    if (!listEl) return;

    setupComplaintForm();
    refreshUserComplaints();
}

async function refreshUserComplaints() {
    const listEl = document.getElementById('complaintList');

    const response = await apiRequest('/api/complaints', 'GET');
    if (!response.ok) {
        listEl.innerHTML = '<div class="notification-empty">' + escapeHtml(response.message || 'Please log in to view your complaints.') + '</div>';
        return;
    }

    userComplaints = response.data || [];
    renderUserComplaints();
}

function renderUserComplaints() {
    const listEl = document.getElementById('complaintList');

    if (userComplaints.length === 0) {
        listEl.innerHTML = '<div class="notification-empty">You have not filed any complaints yet.</div>';
        return;
    }

    listEl.innerHTML = userComplaints.map((c) => `
        <div class="notification-item" data-id="${c.id}">
            <div class="notification-header">
                <div class="notification-meta">
                    <div class="notification-title">${escapeHtml(c.subject)} ${statusBadge(c.status)}</div>
                    <div class="notification-subtitle">Filed ${formatTimestamp(c.createdAt)}</div>
                </div>
                <div class="notification-timestamp">${c.replies.length > 0 ? c.replies.length + ' admin repl' + (c.replies.length === 1 ? 'y' : 'ies') : 'Awaiting reply'}</div>
            </div>
            <div class="chat-thread" id="userComplaintThread-${c.id}" style="display:none;"></div>
        </div>
    `).join('');

    listEl.querySelectorAll('.notification-item').forEach((el) => {
        el.addEventListener('click', () => {
            const id = parseInt(el.getAttribute('data-id'), 10);
            toggleUserComplaintThread(id);
        });
    });
}

function toggleUserComplaintThread(id) {
    const thread = document.getElementById(`userComplaintThread-${id}`);

    document.querySelectorAll('#complaintList .chat-thread.open').forEach((t) => {
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

    const complaint = userComplaints.find((c) => c.id === id);
    if (!complaint) return;

    thread.innerHTML = buildChatThread(complaint, false);
    thread.classList.add('open');
    thread.style.display = 'flex';
    thread.scrollTop = thread.scrollHeight;
}

function buildChatThread(complaint, isAdminView) {
    const bubbles = [];

    bubbles.push(`
        <div class="chat-bubble chat-bubble-user">
            <div class="chat-meta">${isAdminView ? escapeHtml(complaint.userName || 'User') : 'You'} &middot; ${formatTimestamp(complaint.createdAt)}</div>
            <div class="chat-message">${escapeHtml(complaint.description)}</div>
        </div>
    `);

    complaint.replies.forEach((reply) => {
        bubbles.push(`
            <div class="chat-bubble chat-bubble-admin">
                <div class="chat-meta">Support Team &middot; ${formatTimestamp(reply.timestamp)}</div>
                <div class="chat-message">${escapeHtml(reply.message)}</div>
            </div>
        `);
    });

    if (!isAdminView && complaint.replies.length === 0) {
        bubbles.push('<div class="chat-waiting">Waiting for a reply from our support team...</div>');
    }

    return bubbles.join('');
}

function statusBadge(status) {
    const badgeClass = status === 'resolved' ? 'badge-success' : status === 'in-progress' ? 'badge-error' : 'badge-warning';
    const label = status === 'in-progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1);
    return `<span class="badge ${badgeClass}">${label}</span>`;
}

function setupComplaintForm() {
    const form = document.getElementById('complaintForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const subject = document.getElementById('complaintSubject').value.trim();
        const description = document.getElementById('complaintDescription').value.trim();
        const messageEl = document.getElementById('complaintFormMessage');

        messageEl.textContent = '';
        messageEl.classList.remove('form-message-error', 'form-message-success');

        if (!subject || !description) {
            messageEl.textContent = 'Please fill in both subject and description.';
            messageEl.classList.add('form-message-error');
            return;
        }

        const response = await apiRequest('/api/complaints', 'POST', { subject, description });
        if (!response.ok) {
            messageEl.textContent = response.message || 'Failed to submit complaint.';
            messageEl.classList.add('form-message-error');
            return;
        }

        form.reset();
        messageEl.textContent = 'Complaint submitted. Our team will respond soon.';
        messageEl.classList.add('form-message-success');
        await refreshUserComplaints();
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
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
}

window.loadUserComplaintsPage = loadUserComplaintsPage;
