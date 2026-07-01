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
                <span class="detail-value">${AvesUtils.formatDate(policy.endDate)}</span>
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
            <div><span class="detail-label">Start Date</span><span class="detail-value">${AvesUtils.formatDate(policy.startDate)}</span></div>
            <div><span class="detail-label">End Date</span><span class="detail-value">${AvesUtils.formatDate(policy.endDate)}</span></div>
            <div><span class="detail-label">Premium</span><span class="detail-value">${AvesUtils.formatCurrency(policy.premium)}</span></div>
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

    // Populate types and setup auto-fill
    const typeSelect = document.getElementById('policyType');
    const coverageText = document.getElementById('policyCoverage');

    if (typeSelect && window.POLICY_TYPES) {
        for (const type in window.POLICY_TYPES) {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            typeSelect.appendChild(option);
        }

        typeSelect.addEventListener('change', () => {
            coverageText.value = window.POLICY_TYPES[typeSelect.value] || '';
        });
    }

    const policyStart = document.getElementById('policyStart');
    const policyEnd = document.getElementById('policyEnd');
    const policyPremium = document.getElementById('policyPremium');
    const policyDurationHint = document.getElementById('policyDurationHint');

    function autoFillPremium() {
        if (!policyStart.value || !policyEnd.value) return;
        const years = calcPolicyPremium(policyStart.value, policyEnd.value);
        if (years < 1) {
            policyDurationHint.textContent = 'Minimum duration is 1 year. Please adjust your dates.';
            policyDurationHint.style.color = 'var(--color-error, #dc3545)';
            policyPremium.value = '';
            return;
        }
        policyDurationHint.textContent = '';
        policyPremium.value = Math.round(years) * 100;
    }

    policyStart.addEventListener('change', autoFillPremium);
    policyEnd.addEventListener('change', autoFillPremium);

    newPolicyForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const years = calcPolicyPremium(policyStart.value, policyEnd.value);
        const messageEl = document.getElementById('newPolicyMessage');
        if (years < 1) {
            messageEl.textContent = 'You cannot acquire this policy. The minimum duration is 1 year.';
            return;
        }
        const payload = {
            type: typeSelect.value,
            coverage: coverageText.value.trim(),
            startDate: policyStart.value,
            endDate: policyEnd.value,
            premium: policyPremium.value,
            currency: 'GHS'
        };
        const response = await apiRequest('/api/policies', 'POST', payload);
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
