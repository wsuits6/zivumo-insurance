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

    const typeSelect = document.getElementById('policyType');
    const coverageText = document.getElementById('policyCoverage');
    const policyStart = document.getElementById('policyStart');
    const policyEnd = document.getElementById('policyEnd');
    const policyPremium = document.getElementById('policyPremium');
    const policyDurationHint = document.getElementById('policyDurationHint');
    const rateInfoEl = document.getElementById('rateInfo');

    if (typeSelect && window.POLICY_TYPES) {
        for (const type in window.POLICY_TYPES) {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            typeSelect.appendChild(option);
        }

        typeSelect.addEventListener('change', () => {
            coverageText.value = window.POLICY_TYPES[typeSelect.value] || '';
            updateRateInfo();
            autoFillPremium();
        });
    }

    function updateRateInfo() {
        if (!rateInfoEl) return;
        const config = window.POLICY_BASE_RATES && window.POLICY_BASE_RATES[typeSelect.value];
        if (config) {
            rateInfoEl.textContent = `Base rate: GHS ${config.rate.toFixed(2)} per ${config.unit}`;
        } else {
            rateInfoEl.textContent = '';
        }
    }

    function autoFillPremium() {
        if (!policyStart.value || !policyEnd.value || !typeSelect.value) {
            policyPremium.value = '';
            if (policyDurationHint) policyDurationHint.textContent = '';
            return;
        }

        const total = window.calcPolicyTotalAmount
            ? window.calcPolicyTotalAmount(typeSelect.value, policyStart.value, policyEnd.value)
            : null;

        if (total === null || total <= 0) {
            policyDurationHint.textContent = 'Please select valid start and end dates.';
            policyDurationHint.style.color = 'var(--color-error, #dc3545)';
            policyPremium.value = '';
            return;
        }

        const config = window.POLICY_BASE_RATES[typeSelect.value];
        const start = new Date(policyStart.value);
        const end = new Date(policyEnd.value);
        const diffMs = end - start;
        let durationText;
        if (config.unit === 'annual') {
            const years = diffMs / (365.25 * 24 * 60 * 60 * 1000);
            durationText = `${years.toFixed(2)} year(s)`;
        } else {
            const months = diffMs / (30.4375 * 24 * 60 * 60 * 1000);
            durationText = `${months.toFixed(2)} month(s)`;
        }

        policyDurationHint.textContent = `Duration: ${durationText} x GHS ${config.rate.toFixed(2)} (${config.unit})`;
        policyDurationHint.style.color = '';
        policyPremium.value = total.toFixed(2);
    }

    policyStart.addEventListener('change', autoFillPremium);
    policyEnd.addEventListener('change', autoFillPremium);

    newPolicyForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const messageEl = document.getElementById('newPolicyMessage');
        const total = window.calcPolicyTotalAmount
            ? window.calcPolicyTotalAmount(typeSelect.value, policyStart.value, policyEnd.value)
            : null;

        if (!typeSelect.value) {
            messageEl.textContent = 'Please select a policy type.';
            messageEl.classList.add('form-message-error');
            return;
        }
        if (!policyStart.value || !policyEnd.value) {
            messageEl.textContent = 'Please select start and end dates.';
            messageEl.classList.add('form-message-error');
            return;
        }
        if (total === null || total <= 0) {
            messageEl.textContent = 'End date must be after start date.';
            messageEl.classList.add('form-message-error');
            return;
        }

        const payload = {
            type: typeSelect.value,
            coverage: coverageText.value.trim(),
            startDate: policyStart.value,
            endDate: policyEnd.value,
            premium: total.toFixed(2),
            currency: 'GHS'
        };
        const response = await apiRequest('/api/policies', 'POST', payload);
        if (response.ok) {
            messageEl.classList.remove('form-message-error');
            messageEl.textContent = response.message || 'Policy created.';
            newPolicyForm.reset();
            if (rateInfoEl) rateInfoEl.textContent = '';
            if (policyDurationHint) policyDurationHint.textContent = '';
        } else {
            messageEl.textContent = response.message || 'Unable to create policy.';
            messageEl.classList.add('form-message-error');
        }
    });
}

window.loadPoliciesPage = loadPoliciesPage;
window.loadPolicyDetailsPage = loadPolicyDetailsPage;
window.setupPolicyRenew = setupPolicyRenew;
window.setupNewPolicy = setupNewPolicy;
