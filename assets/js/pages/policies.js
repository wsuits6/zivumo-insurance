async function loadPoliciesPage() {
    const policiesList = document.getElementById('policiesList');
    if (!policiesList) return;
    const response = await apiRequest('/api/policies', 'GET');
    if (!response.ok) {
        policiesList.textContent = response.message || 'Unable to load policies.';
        return;
    }
    policiesList.innerHTML = response.data.map((policy) => `
        <div class="policy-row">
            <div>
                <h3>${policy.type}</h3>
                <p class="policy-number">Policy #${policy.policyNumber}</p>
            </div>
            <div>
                <span class="detail-label">Ends</span>
                <span class="detail-value">${ZivumoUtils.formatDate(policy.endDate)}</span>
            </div>
            <div class="policy-actions">
                <a class="btn btn-secondary btn-sm" href="policy-details.html?id=${policy.id}">View Details</a>
                <a class="btn btn-primary btn-sm" href="policy-renew.html?id=${policy.id}">Renew</a>
            </div>
        </div>
    `).join('');
}

async function loadPolicyDetailsPage() {
    const detailsEl = document.getElementById('policyDetails');
    if (!detailsEl) return;
    const policyId = getQueryParam('id');
    if (!policyId) {
        detailsEl.textContent = 'Policy not specified.';
        return;
    }
    const response = await apiRequest(`/api/policies/${policyId}`, 'GET');
    if (!response.ok) {
        detailsEl.textContent = response.message || 'Unable to load policy details.';
        return;
    }
    const policy = response.data;
    detailsEl.innerHTML = `
        <div class="detail-grid">
            <div><span class="detail-label">Policy Number</span><span class="detail-value">${policy.policyNumber}</span></div>
            <div><span class="detail-label">Status</span><span class="detail-value">${policy.status}</span></div>
            <div><span class="detail-label">Coverage</span><span class="detail-value">${policy.coverage}</span></div>
            <div><span class="detail-label">Start Date</span><span class="detail-value">${ZivumoUtils.formatDate(policy.startDate)}</span></div>
            <div><span class="detail-label">End Date</span><span class="detail-value">${ZivumoUtils.formatDate(policy.endDate)}</span></div>
            <div><span class="detail-label">Premium</span><span class="detail-value">${ZivumoUtils.formatCurrency(policy.premium)}</span></div>
        </div>
    `;
}

function setupPolicyRenew() {
    const renewForm = document.getElementById('renewForm');
    if (!renewForm) return;
    const policyId = getQueryParam('id');
    const messageEl = document.getElementById('renewMessage');
    if (!policyId) {
        if (messageEl) messageEl.textContent = 'Policy not specified.';
        renewForm.querySelector('button')?.setAttribute('disabled', 'disabled');
        return;
    }
    renewForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const response = await apiRequest(`/api/policies/${policyId}/renew`, 'POST');
        if (response.ok) {
            messageEl.textContent = response.message || 'Policy renewed.';
        } else {
            messageEl.textContent = response.message || 'Unable to renew policy.';
        }
    });
}

function setupNewPolicy() {
    const newPolicyForm = document.getElementById('newPolicyForm');
    if (!newPolicyForm) return;
    newPolicyForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const payload = {
            type: document.getElementById('policyType').value.trim(),
            coverage: document.getElementById('policyCoverage').value.trim(),
            startDate: document.getElementById('policyStart').value,
            endDate: document.getElementById('policyEnd').value,
            premium: document.getElementById('policyPremium').value,
            currency: document.getElementById('policyCurrency').value
        };
        const response = await apiRequest('/api/policies', 'POST', payload);
        const messageEl = document.getElementById('newPolicyMessage');
        if (response.ok) {
            messageEl.textContent = response.message || 'Policy created.';
            newPolicyForm.reset();
        } else {
            messageEl.textContent = response.message || 'Unable to create policy.';
        }
    });
}

window.loadPoliciesPage = loadPoliciesPage;
window.loadPolicyDetailsPage = loadPolicyDetailsPage;
window.setupPolicyRenew = setupPolicyRenew;
window.setupNewPolicy = setupNewPolicy;
