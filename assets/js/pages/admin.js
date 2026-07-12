function setupAdminLogin() {
    const adminForm = document.getElementById('adminLoginForm');
    if (!adminForm) return;

    adminForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(adminForm);
        const password = String(formData.get('password') || '').trim();
        const messageEl = adminForm.querySelector('.form-message');

        if (!password) {
            if (messageEl) {
                messageEl.textContent = 'Please enter the admin password.';
                messageEl.classList.add('form-message-error');
            }
            return;
        }

        apiRequest('/api/admin/login', 'POST', { password })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(response.message || 'Admin login failed');
                }
                window.location.href = 'admin-dashboard.html';
            })
            .catch((error) => {
                if (messageEl) {
                    messageEl.textContent = error.message;
                    messageEl.classList.add('form-message-error');
                }
            });
    });
}

/* ---------- Filter state ---------- */
let currentUserFilter = 'active';
let currentPolicyFilter = 'active';

/* ---------- Confirm delete modal ---------- */
let _confirmCallback = null;

function showConfirmModal(message, callback) {
    const msgEl = document.getElementById('confirmModalMessage');
    if (msgEl) msgEl.textContent = message;
    _confirmCallback = callback;
    openModal('confirmModal');
}

function setupConfirmListener() {
    const btn = document.getElementById('confirmDeleteBtn');
    if (btn) {
        btn.addEventListener('click', () => {
            if (typeof _confirmCallback === 'function') {
                _confirmCallback();
                _confirmCallback = null;
            }
            closeModal('confirmModal');
        });
    }
}

/* ---------- Tab switching ---------- */
function setupTabs() {
    document.querySelectorAll('.admin-tab').forEach((tab) => {
        tab.addEventListener('click', () => {
            const parent = tab.parentElement;
            const filter = tab.getAttribute('data-filter');

            parent.querySelectorAll('.admin-tab').forEach((t) => t.classList.remove('active'));
            tab.classList.add('active');

            if (parent.id === 'userTabs') {
                currentUserFilter = filter;
            } else if (parent.id === 'policyTabs') {
                currentPolicyFilter = filter;
            }

            loadAdminDashboard();
        });
    });
}

/* ---------- Archive / Restore / Delete handlers ---------- */
async function handleArchiveUser(userId) {
    const res = await apiRequest(`/api/admin/users/${userId}/archive`, 'POST');
    if (res.ok) {
        await loadAdminDashboard();
    } else {
        alert(res.message || 'Failed to archive user');
    }
}

async function handleRestoreUser(userId) {
    const res = await apiRequest(`/api/admin/users/${userId}/restore`, 'POST');
    if (res.ok) {
        await loadAdminDashboard();
    } else {
        alert(res.message || 'Failed to restore user');
    }
}

function handleDeleteUser(userId, userName) {
    showConfirmModal(
        `Are you sure you want to delete user "${userName}"? This will also remove all their policies.`,
        async () => {
            const res = await apiRequest(`/api/admin/users/${userId}/delete`, 'POST');
            if (res.ok) {
                await loadAdminDashboard();
            } else {
                alert(res.message || 'Failed to delete user');
            }
        }
    );
}

async function handleArchivePolicy(policyId) {
    const res = await apiRequest(`/api/admin/policies/${policyId}/archive`, 'POST');
    if (res.ok) {
        await loadAdminDashboard();
    } else {
        alert(res.message || 'Failed to archive policy');
    }
}

async function handleRestorePolicy(policyId) {
    const res = await apiRequest(`/api/admin/policies/${policyId}/restore`, 'POST');
    if (res.ok) {
        await loadAdminDashboard();
    } else {
        alert(res.message || 'Failed to restore policy');
    }
}

function handleDeletePolicy(policyId, policyNumber) {
    showConfirmModal(
        `Are you sure you want to delete policy "${policyNumber}"?`,
        async () => {
            const res = await apiRequest(`/api/admin/policies/${policyId}/delete`, 'POST');
            if (res.ok) {
                await loadAdminDashboard();
            } else {
                alert(res.message || 'Failed to delete policy');
            }
        }
    );
}

window.handleArchiveUser = handleArchiveUser;
window.handleRestoreUser = handleRestoreUser;
window.handleDeleteUser = handleDeleteUser;
window.handleArchivePolicy = handleArchivePolicy;
window.handleRestorePolicy = handleRestorePolicy;
window.handleDeletePolicy = handleDeletePolicy;

/* ---------- Table rendering ---------- */
function renderUsersTable(users, filter) {
    const filtered = filter === 'all'
        ? users
        : users.filter((u) => filter === 'archived' ? u.archived : !u.archived);

    const tbody = document.getElementById('adminUsersTable');
    if (!tbody) return;

    tbody.innerHTML = filtered.map((user) => {
        const isArchived = user.archived;
        return `
            <tr>
                <td>#${user.id}</td>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.phone || '--'}</td>
                <td>${user.address || '--'}</td>
                <td>${user.policies}</td>
                <td>
                    ${isArchived
                        ? `<button class="btn btn-sm btn-secondary" onclick="handleRestoreUser(${user.id})">Restore</button>`
                        : `<button class="btn btn-sm btn-secondary" onclick="handleArchiveUser(${user.id})">Archive</button>`
                    }
                    <button class="btn btn-sm btn-alert" onclick="handleDeleteUser(${user.id}, '${user.name.replace(/'/g, "\\'")}')">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

function renderPoliciesTable(policies, filter) {
    const filtered = filter === 'all'
        ? policies
        : policies.filter((p) => filter === 'archived' ? p.archived : !p.archived);

    const tbody = document.getElementById('adminPoliciesTable');
    if (!tbody) return;

    tbody.innerHTML = filtered.map((policy) => {
        const isArchived = policy.archived;
        return `
            <tr>
                <td>#${policy.id}</td>
                <td>${policy.type}</td>
                <td>${policy.userName}</td>
                <td>${policy.userEmail}</td>
                <td>${policy.policyNumber}</td>
                <td>${policy.status.replace('_', ' ')}</td>
                <td>${AvesUtils.formatCurrency(policy.premium)}</td>
                <td>
                    <select class="admin-status-select" data-policy-id="${policy.id}">
                        <option value="active" ${policy.status === 'active' ? 'selected' : ''}>Active</option>
                        <option value="pending_renewal" ${policy.status === 'pending_renewal' ? 'selected' : ''}>Pending Renewal</option>
                        <option value="cancelled" ${policy.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                    <button class="btn btn-secondary btn-sm admin-status-save" data-policy-id="${policy.id}">Save</button>
                    ${isArchived
                        ? `<button class="btn btn-sm btn-secondary" onclick="handleRestorePolicy(${policy.id})">Restore</button>`
                        : `<button class="btn btn-sm btn-secondary" onclick="handleArchivePolicy(${policy.id})">Archive</button>`
                    }
                    <button class="btn btn-sm btn-alert" onclick="handleDeletePolicy(${policy.id}, '${policy.policyNumber.replace(/'/g, "\\'")}')">Delete</button>
                </td>
            </tr>
        `;
    }).join('');

    document.querySelectorAll('.admin-status-save').forEach((button) => {
        button.addEventListener('click', async () => {
            const policyId = button.getAttribute('data-policy-id');
            const select = document.querySelector(`.admin-status-select[data-policy-id="${policyId}"]`);
            if (!select) return;
            const status = select.value;
            await apiRequest(`/api/admin/policies/${policyId}/status`, 'POST', { status });
        });
    });
}

/* ---------- Main dashboard loader ---------- */
async function loadAdminDashboard() {
    const summaryEl = {
        totalUsers: document.getElementById('adminTotalUsers'),
        totalPolicies: document.getElementById('adminTotalPolicies'),
        activePolicies: document.getElementById('adminActivePolicies'),
        totalPremium: document.getElementById('adminTotalPremium')
    };
    const usersTable = document.getElementById('adminUsersTable');
    const policiesTable = document.getElementById('adminPoliciesTable');

    const auth = await apiRequest('/api/admin/me', 'GET');
    if (!auth.ok) {
        window.location.href = 'admin-login.html';
        return;
    }

    const logoutBtn = document.getElementById('adminLogoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            apiRequest('/api/admin/logout', 'POST').finally(() => {
                window.location.href = 'admin-login.html';
            });
        });
    }

    const response = await apiRequest('/api/admin/summary', 'GET');
    if (!response.ok) return;

    if (summaryEl.totalUsers) summaryEl.totalUsers.textContent = response.data.totalUsers;
    if (summaryEl.totalPolicies) summaryEl.totalPolicies.textContent = response.data.totalPolicies;
    if (summaryEl.activePolicies) summaryEl.activePolicies.textContent = response.data.activePolicies;
    if (summaryEl.totalPremium) summaryEl.totalPremium.textContent = response.data.totalPremium;

    if (usersTable) {
        const usersResponse = await apiRequest('/api/admin/users', 'GET');
        if (usersResponse.ok) {
            renderUsersTable(usersResponse.data, currentUserFilter);
        }
    }

    if (policiesTable) {
        const policiesResponse = await apiRequest('/api/admin/policies', 'GET');
        if (policiesResponse.ok) {
            renderPoliciesTable(policiesResponse.data, currentPolicyFilter);
        }
    }
}

window.setupAdminLogin = setupAdminLogin;
window.loadAdminDashboard = loadAdminDashboard;

/* Modal Management */
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('open');
        if (id === 'assignPolicyModal') populatePolicyTypes('adminPolicyType');
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('open');
}

function populatePolicyTypes(selectId) {
    const select = document.getElementById(selectId);
    if (!select || select.options.length > 1) return;
    
    for (const type in window.POLICY_TYPES) {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        select.appendChild(option);
    }

    select.addEventListener('change', () => {
        const coverageId = selectId === 'adminPolicyType' ? 'adminPolicyCoverage' : 'policyCoverage';
        const coverageEl = document.getElementById(coverageId);
        if (coverageEl) coverageEl.value = window.POLICY_TYPES[select.value] || '';
    });
}

function setupAdminActions() {
    const userForm = document.getElementById('adminCreateUserForm');
    const policyForm = document.getElementById('adminAssignPolicyForm');

    if (userForm) {
        userForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const msgEl = document.getElementById('adminCreateUserMessage');
            const submitBtn = userForm.querySelector('button[type="submit"]');
            const password = document.getElementById('adminUserPassword').value;
            const confirm = document.getElementById('adminUserConfirmPassword').value;

            msgEl.textContent = '';
            msgEl.classList.remove('form-message-error');

            if (password !== confirm) {
                msgEl.textContent = 'Passwords do not match.';
                msgEl.classList.add('form-message-error');
                return;
            }
            if (password.length < 6) {
                msgEl.textContent = 'Password must be at least 6 characters.';
                msgEl.classList.add('form-message-error');
                return;
            }

            const payload = {
                name: document.getElementById('adminUserName').value.trim(),
                email: document.getElementById('adminUserEmail').value.trim(),
                password: password
            };

            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating...';

            const response = await apiRequest('/api/admin/users', 'POST', payload);

            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Account';

            if (response.ok) {
                msgEl.classList.remove('form-message-error');
                msgEl.textContent = 'Account created! Log in on the main site using the credentials you used to view your dashboard.';
                userForm.reset();
                setTimeout(() => { closeModal('createUserModal'); loadAdminDashboard(); }, 4000);
            } else {
                msgEl.textContent = response.message || 'Error creating user.';
                msgEl.classList.add('form-message-error');
            }
        });
    }

    if (policyForm) {
        const adminPolicyStart = document.getElementById('adminPolicyStart');
        const adminPolicyEnd = document.getElementById('adminPolicyEnd');
        const adminPolicyPremium = document.getElementById('adminPolicyPremium');
        const adminPolicyDurationHint = document.getElementById('adminPolicyDurationHint');

        function autoFillAdminPremium() {
            if (!adminPolicyStart.value || !adminPolicyEnd.value) return;
            const years = calcPolicyPremium(adminPolicyStart.value, adminPolicyEnd.value);
            if (years < 1) {
                adminPolicyDurationHint.textContent = 'Minimum duration is 1 year. Please adjust your dates.';
                adminPolicyDurationHint.style.color = 'var(--color-error, #dc3545)';
                adminPolicyPremium.value = '';
                return;
            }
            adminPolicyDurationHint.textContent = '';
            adminPolicyPremium.value = Math.round(years) * 100;
        }

        adminPolicyStart.addEventListener('change', autoFillAdminPremium);
        adminPolicyEnd.addEventListener('change', autoFillAdminPremium);

        policyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const years = calcPolicyPremium(adminPolicyStart.value, adminPolicyEnd.value);
            const msgEl = document.getElementById('adminAssignPolicyMessage');
            if (years < 1) {
                msgEl.textContent = 'You cannot assign this policy. The minimum duration is 1 year.';
                return;
            }
            const payload = {
                userId: document.getElementById('adminPolicyUserId').value,
                type: document.getElementById('adminPolicyType').value,
                coverage: document.getElementById('adminPolicyCoverage').value,
                startDate: adminPolicyStart.value,
                endDate: adminPolicyEnd.value,
                premium: adminPolicyPremium.value
            };
            const response = await apiRequest('/api/admin/assign-policy', 'POST', payload);
            if (response.ok) {
                msgEl.textContent = 'Policy assigned successfully!';
                policyForm.reset();
                setTimeout(() => { closeModal('assignPolicyModal'); loadAdminDashboard(); }, 2000);
            } else {
                msgEl.textContent = response.message || 'Error assigning policy.';
            }
        });
    }

    /* One-time setup for confirm modal listener and tabs */
    setupConfirmListener();
    setupTabs();
}

window.openModal = openModal;
window.closeModal = closeModal;
window.setupAdminActions = setupAdminActions;

/* ---------- Reports & Analytics ---------- */
let _reportCharts = [];

function destroyReportCharts() {
    _reportCharts.forEach((c) => { try { c.destroy(); } catch (_) {} });
    _reportCharts = [];
}

function openReportsModal() {
    openModal('reportsModal');
    loadReportsData();
}

async function loadReportsData() {
    const emptyEl = document.getElementById('reportsEmptyState');
    const errorEl = document.getElementById('reportsErrorState');
    const contentEl = document.getElementById('reportsContent');
    const errorMsg = document.getElementById('reportsErrorMessage');

    emptyEl.style.display = 'none';
    errorEl.style.display = 'none';
    contentEl.style.display = 'block';

    destroyReportCharts();

    const res = await apiRequest('/api/admin/reports/summary', 'GET');

    if (!res.ok) {
        contentEl.style.display = 'none';
        errorEl.style.display = 'block';
        if (errorMsg) errorMsg.textContent = res.message || 'Failed to load report data.';
        return;
    }

    const data = res.data;
    const hasPolicyData = data.totals.totalPolicies > 0;
    const hasUserData = data.totals.totalUsers > 0;

    if (!hasPolicyData && !hasUserData) {
        contentEl.style.display = 'none';
        emptyEl.style.display = 'block';
        return;
    }

    renderReportCharts(data);
    renderReportSummary(data);
}

function renderReportCharts(data) {
    const rootStyles = getComputedStyle(document.documentElement);
    const primary = rootStyles.getPropertyValue('--primary-color').trim() || '#0B6E6E';
    const secondary = rootStyles.getPropertyValue('--secondary-color').trim() || '#D18B2C';
    const accent = rootStyles.getPropertyValue('--accent-color').trim() || '#1F3A93';
    const textSecondary = rootStyles.getPropertyValue('--text-secondary').trim() || '#4B5B66';

    const chartColors = [
        primary, secondary, accent, '#1C8B6A', '#9DB8FF', '#F2B35D',
        '#D1494E', '#59D4C0', '#8B5CF6', '#EC4899', '#06B6D4'
    ];

    Chart.defaults.font.family = '"Manrope", sans-serif';
    Chart.defaults.color = textSecondary;

    /* --- Bar chart: policies per month --- */
    if (data.policiesPerMonth.length > 0) {
        const ctx1 = document.getElementById('policiesPerMonthChart');
        if (ctx1) {
            const chart = new Chart(ctx1.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: data.policiesPerMonth.map((d) => d.month),
                    datasets: [{
                        label: 'Policies',
                        data: data.policiesPerMonth.map((d) => d.count),
                        backgroundColor: primary + 'CC',
                        borderColor: primary,
                        borderWidth: 1,
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { stepSize: 1 },
                            grid: { color: 'rgba(0,0,0,0.06)' }
                        },
                        x: { grid: { display: false } }
                    }
                }
            });
            _reportCharts.push(chart);
        }
    }

    /* --- Bar chart: premium per month --- */
    if (data.premiumPerMonth.length > 0) {
        const ctx2 = document.getElementById('premiumPerMonthChart');
        if (ctx2) {
            const chart = new Chart(ctx2.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: data.premiumPerMonth.map((d) => d.month),
                    datasets: [{
                        label: 'Premium (GHS)',
                        data: data.premiumPerMonth.map((d) => d.total),
                        backgroundColor: secondary + 'CC',
                        borderColor: secondary,
                        borderWidth: 1,
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(0,0,0,0.06)' },
                            ticks: { callback: (v) => 'GHS ' + v.toLocaleString() }
                        },
                        x: { grid: { display: false } }
                    }
                }
            });
            _reportCharts.push(chart);
        }
    }

    /* --- Pie chart: policy type distribution --- */
    if (data.policyTypeDistribution.length > 0) {
        const ctx3 = document.getElementById('policyTypeChart');
        if (ctx3) {
            const chart = new Chart(ctx3.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: data.policyTypeDistribution.map((d) => d.name),
                    datasets: [{
                        data: data.policyTypeDistribution.map((d) => d.value),
                        backgroundColor: chartColors.slice(0, data.policyTypeDistribution.length),
                        borderWidth: 2,
                        borderColor: 'var(--bg-primary, #F9F7F2)'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true, pointStyleWidth: 10 } }
                    }
                }
            });
            _reportCharts.push(chart);
        }
    }

    /* --- Pie chart: policy status breakdown --- */
    if (data.policyStatusBreakdown.length > 0) {
        const ctx4 = document.getElementById('policyStatusChart');
        if (ctx4) {
            const statusColors = {
                active: '#1C8B6A',
                pending_renewal: '#D18B2C',
                cancelled: '#D1494E',
                unknown: '#999'
            };
            const labels = data.policyStatusBreakdown.map((d) => d.name.replace('_', ' '));
            const colors = data.policyStatusBreakdown.map((d) => statusColors[d.name] || '#999');

            const chart = new Chart(ctx4.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data.policyStatusBreakdown.map((d) => d.value),
                        backgroundColor: colors,
                        borderWidth: 2,
                        borderColor: 'var(--bg-primary, #F9F7F2)'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true, pointStyleWidth: 10 } }
                    }
                }
            });
            _reportCharts.push(chart);
        }
    }
}

function renderReportSummary(data) {
    const list = document.getElementById('reportsSummaryList');
    if (!list) return;
    list.innerHTML = '';
    (data.summaryLines || []).forEach((line) => {
        const li = document.createElement('li');
        li.textContent = line;
        list.appendChild(li);
    });
}

window.openReportsModal = openReportsModal;
window.loadReportsData = loadReportsData;
