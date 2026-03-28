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
            usersTable.innerHTML = usersResponse.data.map((user) => `
                <tr>
                    <td>#${user.id}</td>
                    <td>${user.name}</td>
                    <td>${user.email}</td>
                    <td>${user.phone || '--'}</td>
                    <td>${user.address || '--'}</td>
                    <td>${user.policies}</td>
                </tr>
            `).join('');
        }
    }

    if (policiesTable) {
        const policiesResponse = await apiRequest('/api/admin/policies', 'GET');
        if (policiesResponse.ok) {
            policiesTable.innerHTML = policiesResponse.data.map((policy) => `
                <tr>
                    <td>#${policy.id}</td>
                    <td>${policy.type}</td>
                    <td>${policy.userName}</td>
                    <td>${policy.userEmail}</td>
                    <td>${policy.policyNumber}</td>
                    <td>${policy.status.replace('_', ' ')}</td>
                    <td>${ZivumoUtils.formatCurrency(policy.premium)}</td>
                    <td>
                        <select class="admin-status-select" data-policy-id="${policy.id}">
                            <option value="active" ${policy.status === 'active' ? 'selected' : ''}>Active</option>
                            <option value="pending_renewal" ${policy.status === 'pending_renewal' ? 'selected' : ''}>Pending Renewal</option>
                            <option value="cancelled" ${policy.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                        <button class="btn btn-secondary btn-sm admin-status-save" data-policy-id="${policy.id}">Save</button>
                    </td>
                </tr>
            `).join('');

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
    }
}

window.setupAdminLogin = setupAdminLogin;
window.loadAdminDashboard = loadAdminDashboard;
