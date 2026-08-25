let userComplaints = [];
let isComplaintsAuthenticated = false;

function loadUserComplaintsPage() {
    const listEl = document.getElementById('complaintList');
    if (!listEl) return;

    checkComplaintsAuth();
    setupComplaintForm();
}

async function checkComplaintsAuth() {
    const guestFields = document.getElementById('guestFields');
    const guestNav = document.getElementById('complaintsNavLinks');
    const authNav = document.getElementById('complaintsAuthNavLinks');
    const title = document.getElementById('complaintsTitle');
    const logoutBtn = document.getElementById('logoutBtn');
    const response = await apiRequest('/api/me', 'GET');

    if (response.ok) {
        isComplaintsAuthenticated = true;
        if (guestFields) guestFields.style.display = 'none';
        if (guestNav) guestNav.style.display = 'none';
        if (authNav) authNav.style.display = 'flex';
        if (title) title.textContent = 'My Complaints';
        const nameInput = document.getElementById('complaintName');
        const emailInput = document.getElementById('complaintEmail');
        if (nameInput) nameInput.removeAttribute('required');
        if (emailInput) emailInput.removeAttribute('required');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                setAuthToken(null);
                apiRequest('/api/logout', 'POST').finally(() => {
                    window.location.href = '../index.html';
                });
            });
        }
    } else {
        isComplaintsAuthenticated = false;
        if (guestFields) guestFields.style.display = 'block';
        if (guestNav) guestNav.style.display = 'flex';
        if (authNav) authNav.style.display = 'none';
        if (title) title.textContent = 'File a Complaint';
        const nameInput = document.getElementById('complaintName');
        const emailInput = document.getElementById('complaintEmail');
        if (nameInput) nameInput.setAttribute('required', '');
        if (emailInput) emailInput.setAttribute('required', '');
    }

    refreshUserComplaints();
}

async function refreshUserComplaints() {
    const listEl = document.getElementById('complaintList');

    let url = '/api/complaints';
    if (!isComplaintsAuthenticated) {
        const emailInput = document.getElementById('complaintEmail');
        const email = emailInput ? emailInput.value.trim() : '';
        if (email) {
            url += '?email=' + encodeURIComponent(email);
        } else {
            listEl.innerHTML = '<div class="notification-empty">Enter your email above and submit a complaint to track it here, or <a href="login.html">log in</a> to see your complaint history.</div>';
            return;
        }
    }

    const response = await apiRequest(url, 'GET');
    if (!response.ok) {
        listEl.innerHTML = '<div class="notification-empty">' + escapeHtml(response.message || 'Failed to load complaints.') + '</div>';
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

    const form = thread.querySelector('.chat-reply-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await sendUserComplaintReply(complaint.id, form);
        });
    }
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
        const isAdmin = reply.sender === 'admin';
        bubbles.push(`
            <div class="chat-bubble ${isAdmin ? 'chat-bubble-admin' : 'chat-bubble-user'}">
                <div class="chat-meta">${isAdmin ? 'Support Team' : 'You'} &middot; ${formatTimestamp(reply.timestamp)}</div>
                <div class="chat-message">${escapeHtml(reply.message)}</div>
            </div>
        `);
    });

    if (!isAdminView && complaint.replies.length === 0) {
        bubbles.push('<div class="chat-waiting">Waiting for a reply from our support team...</div>');
    }

    if (!isAdminView && complaint.status !== 'resolved') {
        bubbles.push(`
            <form class="chat-reply-form">
                <textarea class="chat-reply-input" placeholder="Write a reply to support..." maxlength="5000" required></textarea>
                <div class="chat-reply-actions">
                    <button type="submit" class="btn btn-primary btn-sm">Send Reply</button>
                </div>
                <p class="chat-reply-message"></p>
            </form>
        `);
    }

    if (!isAdminView && complaint.status === 'resolved') {
        bubbles.push('<div class="chat-waiting">This complaint has been resolved.</div>');
    }

    return bubbles.join('');
}

async function sendUserComplaintReply(complaintId, form) {
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

    const index = userComplaints.findIndex((c) => c.id === complaintId);
    if (index !== -1) {
        userComplaints[index] = response.data;
    }

    const thread = document.getElementById(`userComplaintThread-${complaintId}`);
    if (thread) {
        thread.innerHTML = buildChatThread(response.data, false);
        thread.scrollTop = thread.scrollHeight;
        const newForm = thread.querySelector('.chat-reply-form');
        if (newForm) {
            newForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await sendUserComplaintReply(complaintId, newForm);
            });
        }
    }
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

        const payload = { subject, description };

        if (!isComplaintsAuthenticated) {
            const name = document.getElementById('complaintName').value.trim();
            const email = document.getElementById('complaintEmail').value.trim();
            if (!name || !email) {
                messageEl.textContent = 'Please enter your name and email.';
                messageEl.classList.add('form-message-error');
                return;
            }
            payload.name = name;
            payload.email = email;
        }

        const response = await apiRequest('/api/complaints', 'POST', payload);
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
