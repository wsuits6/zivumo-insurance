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

    let pendingPolicyPayload = null;
    let pendingManualMethod = null;

    function setModalView(view) {
        document.getElementById('payMethodSelect').style.display = view === 'select' ? 'block' : 'none';
        document.getElementById('payManualDetails').style.display = view === 'manual' ? 'block' : 'none';
        document.getElementById('paySubmitted').style.display = view === 'submitted' ? 'block' : 'none';
    }

    function setPayMessage(text, isError) {
        const messageEl = document.getElementById('payModalMessage');
        if (!messageEl) return;
        messageEl.textContent = text || '';
        messageEl.classList.toggle('form-message-error', Boolean(isError));
    }

    function escapePolicyHtml(str) {
        const div = document.createElement('div');
        div.textContent = str == null ? '' : String(str);
        return div.innerHTML;
    }

    function openPaymentModal(payload) {
        pendingPolicyPayload = payload;
        pendingManualMethod = null;
        const summary = document.getElementById('paySummary');
        if (summary) {
            summary.innerHTML = `
                <div class="pay-summary-row"><span>Policy Type</span><strong>${escapePolicyHtml(payload.type)}</strong></div>
                <div class="pay-summary-row"><span>Coverage Period</span><strong>${payload.startDate} &rarr; ${payload.endDate}</strong></div>
                <div class="pay-summary-row pay-total"><span>Amount Due</span><strong>GHS ${Number(payload.premium).toFixed(2)}</strong></div>
            `;
        }
        setModalView('select');
        setPayMessage('');
        document.getElementById('policyPaymentModal').classList.add('open');
    }

    window.closePaymentModal = function () {
        document.getElementById('policyPaymentModal').classList.remove('open');
        pendingPolicyPayload = null;
        pendingManualMethod = null;
    };

    async function showManualDetails(method) {
        pendingManualMethod = method;
        setPayMessage('Loading payment details...');

        const response = await apiRequest(`/api/payments/instructions/${method}`, 'GET');
        if (!response.ok) {
            setPayMessage(response.message || 'Unable to load payment details.', true);
            return;
        }

        const label = response.data.label;
        document.getElementById('payManualTitle').textContent = `${label} - Payment Details`;
        document.getElementById('payManualAccounts').innerHTML = response.data.accounts.map((acc) => `
            <div class="pay-account">
                <div class="pay-account-network">${escapePolicyHtml(acc.network)}</div>
                <div class="pay-account-row"><span>Number</span><strong>${escapePolicyHtml(acc.number)}</strong></div>
                <div class="pay-account-row"><span>Account Name</span><strong>${escapePolicyHtml(acc.accountName)}</strong></div>
            </div>
        `).join('');

        setPayMessage('');
        setModalView('manual');
    }

    async function confirmManualPayment() {
        if (!pendingPolicyPayload || !pendingManualMethod) return;

        const paidBtn = document.getElementById('payPaidBtn');
        paidBtn.disabled = true;
        setPayMessage('Submitting your purchase for approval...');

        const response = await apiRequest('/api/payments/initialize', 'POST', {
            ...pendingPolicyPayload,
            method: pendingManualMethod
        });

        paidBtn.disabled = false;

        if (!response.ok) {
            setPayMessage(response.message || 'Unable to submit your purchase. Please try again.', true);
            return;
        }

        document.getElementById('paySubmittedRef').textContent = response.data.reference;
        setModalView('submitted');
        setPayMessage('');
    }

    document.querySelectorAll('.pay-method').forEach((button) => {
        button.addEventListener('click', () => {
            if (!pendingPolicyPayload) return;
            showManualDetails(button.getAttribute('data-method'));
        });
    });

    document.getElementById('payPaidBtn').addEventListener('click', confirmManualPayment);
    document.getElementById('payBackBtn').addEventListener('click', () => {
        pendingManualMethod = null;
        setModalView('select');
        setPayMessage('');
    });

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

        openPaymentModal({
            type: typeSelect.value,
            coverage: coverageText.value.trim(),
            startDate: policyStart.value,
            endDate: policyEnd.value,
            premium: total.toFixed(2),
            currency: 'GHS'
        });
    });
}

window.loadPoliciesPage = loadPoliciesPage;
window.loadPolicyDetailsPage = loadPolicyDetailsPage;
window.setupPolicyRenew = setupPolicyRenew;
window.setupNewPolicy = setupNewPolicy;
