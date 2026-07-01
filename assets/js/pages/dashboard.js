function renderPolicyCard(policy) {
    const badgeClass = policy.status === 'pending_renewal' ? 'badge badge-warning' : 'badge badge-success';
    const badgeText = policy.status === 'pending_renewal' ? 'Renewal Due' : 'Active';
    const progressClass = policy.status === 'pending_renewal' ? 'timeline-progress warning' : 'timeline-progress';

    return `
        <div class="policy-card">
            <div class="policy-header">
                <div class="policy-type">
                    <div class="icon-wrap">
                        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M12 21s-8-4-8-10a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6-8 10-8 10z"></path>
                        </svg>
                    </div>
                    <div>
                        <h3>${policy.type}</h3>
                        <p class="policy-number">Policy #${policy.policyNumber}</p>
                    </div>
                </div>
                <span class="${badgeClass}">${badgeText}</span>
            </div>
            <div class="policy-body">
                <div class="policy-detail">
                    <span class="detail-label">Coverage</span>
                    <span class="detail-value">${policy.coverage}</span>
                </div>
                <div class="policy-detail">
                    <span class="detail-label">Start Date</span>
                    <span class="detail-value">${AvesUtils.formatDate(policy.startDate)}</span>
                </div>
                <div class="policy-detail">
                    <span class="detail-label">Expiration Date</span>
                    <span class="detail-value">${AvesUtils.formatDate(policy.endDate)}</span>
                </div>
                <div class="policy-timeline">
                    <div class="timeline-bar">
                        <div class="${progressClass}" style="width: ${policy.progress}%"></div>
                    </div>
                    <span class="timeline-text">${policy.remainingDays} days remaining</span>
                </div>
            </div>
            <div class="policy-footer">
                <a class="btn btn-secondary btn-sm" href="policy-details.html?id=${policy.id}">View Details</a>
                <a class="btn btn-primary btn-sm" href="policy-renew.html?id=${policy.id}">Renew Policy</a>
            </div>
        </div>
    `;
}

async function loadDashboardData() {
    const statsEl = {
        total: document.getElementById('totalPolicies'),
        active: document.getElementById('activePolicies'),
        pending: document.getElementById('pendingRenewals'),
        notifications: document.getElementById('notifications')
    };

    const statsResponse = await apiRequest('/api/stats', 'GET');
    if (statsResponse.ok) {
        if (statsEl.total) statsEl.total.textContent = statsResponse.data.totalPolicies;
        if (statsEl.active) statsEl.active.textContent = statsResponse.data.activePolicies;
        if (statsEl.pending) statsEl.pending.textContent = statsResponse.data.pendingRenewals;
        if (statsEl.notifications) statsEl.notifications.textContent = statsResponse.data.notifications;
    }

    const policiesGrid = document.getElementById('policiesGrid');
    if (policiesGrid) {
        const policiesResponse = await apiRequest('/api/policies', 'GET');
        if (policiesResponse.ok) {
            policiesGrid.innerHTML = policiesResponse.data.map(renderPolicyCard).join('');
        }
    }
}

window.loadDashboardData = loadDashboardData;
