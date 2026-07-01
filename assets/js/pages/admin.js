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
                    <td>${AvesUtils.formatCurrency(policy.premium)}</td>
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
            const payload = {
                name: document.getElementById('adminUserName').value.trim(),
                email: document.getElementById('adminUserEmail').value.trim()
            };
            const response = await apiRequest('/api/admin/users', 'POST', payload);
            const msgEl = document.getElementById('adminCreateUserMessage');
            if (response.ok) {
                msgEl.textContent = 'User created! Default password: ChangeMe123!';
                userForm.reset();
                setTimeout(() => { closeModal('createUserModal'); loadAdminDashboard(); }, 2000);
            } else {
                msgEl.textContent = response.message || 'Error creating user.';
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
}

window.openModal = openModal;
window.closeModal = closeModal;
window.setupAdminActions = setupAdminActions;
