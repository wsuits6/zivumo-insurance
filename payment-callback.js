async function verifyPayment() {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference');

    const processingEl = document.getElementById('payProcessing');
    const successEl = document.getElementById('paySuccess');
    const failedEl = document.getElementById('payFailed');

    function showFailed(message) {
        processingEl.style.display = 'none';
        failedEl.style.display = 'block';
        const msgEl = document.getElementById('payFailMessage');
        if (msgEl && message) msgEl.textContent = message;
    }

    if (!reference) {
        showFailed('Missing payment reference. Please start a new policy application.');
        return;
    }

    const response = await apiRequest(`/api/payments/verify/${encodeURIComponent(reference)}`, 'GET');

    if (response.ok && response.data && response.data.status === 'paid') {
        const { policy } = response.data;

        /* The congratulatory notification is synced into the visible feed by
           syncServerNotifications() (runs on every authenticated page load). */

        processingEl.style.display = 'none';
        successEl.style.display = 'block';

        document.getElementById('paySuccessMessage').textContent =
            `Thank you for acquiring the ${policy.type}. A confirmation notification has been sent to you.`;
        document.getElementById('payPolicyBox').innerHTML = `
            <div class="pay-summary-row"><span>Policy Number</span><strong>${escapePay(policy.policyNumber)}</strong></div>
            <div class="pay-summary-row"><span>Coverage</span><strong>${escapePay(policy.startDate)} &rarr; ${escapePay(policy.endDate)}</strong></div>
            <div class="pay-summary-row pay-total"><span>Premium Paid</span><strong>GHS ${Number(policy.premium).toFixed(2)}</strong></div>
        `;
    } else {
        showFailed(response.message);
    }
}

function escapePay(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
}

window.verifyPayment = verifyPayment;
