async function loadPaymentsMethods() {
    const list = document.getElementById('paymentMethodsList');
    if (!list) return;
    const response = await apiRequest('/api/payment-methods', 'GET');
    if (!response.ok) {
        list.textContent = response.message || 'Unable to load payment methods.';
        return;
    }
    if (response.data.length === 0) {
        list.innerHTML = '<p class="form-hint">No payment methods saved yet. Add one using the form above.</p>';
        return;
    }
    list.innerHTML = response.data.map((method) => `
        <div class="data-row">
            <div>
                <h3>${method.brand} &bull;&bull;&bull;&bull; ${method.last4}
                    ${method.isDefault ? '<span class="badge badge-warning">Default</span>' : ''}
                </h3>
                <p>Expires ${method.expiry}</p>
            </div>
            <div class="policy-actions">
                <button type="button" class="btn btn-secondary btn-sm" data-action="default" data-id="${method.id}" ${method.isDefault ? 'disabled' : ''}>Make Default</button>
                <button type="button" class="btn btn-secondary btn-sm" data-action="delete" data-id="${method.id}">Delete</button>
            </div>
        </div>
    `).join('');
}

async function addPaymentMethod(payload) {
    const response = await apiRequest('/api/payment-methods', 'POST', payload);
    return response;
}

async function updatePaymentMethod(id, payload) {
    return apiRequest(`/api/payment-methods/${id}`, 'PUT', payload);
}

async function deletePaymentMethod(id) {
    const response = await apiRequest(`/api/payment-methods/${id}`, 'DELETE');
    if (!response.ok) {
        alert(response.message || 'Unable to remove payment method.');
        return;
    }
    loadPaymentsMethods();
}

async function setDefaultPaymentMethod(id) {
    const response = await updatePaymentMethod(id, { isDefault: true });
    if (!response.ok) {
        alert(response.message || 'Unable to set default payment method.');
        return;
    }
    loadPaymentsMethods();
}

function initPaymentsPage() {
    loadPaymentsMethods();

    const list = document.getElementById('paymentMethodsList');
    if (list) {
        list.addEventListener('click', (event) => {
            const button = event.target.closest('button[data-action]');
            if (!button || button.disabled) return;
            const id = Number(button.dataset.id);
            if (button.dataset.action === 'delete') {
                deletePaymentMethod(id);
            } else if (button.dataset.action === 'default') {
                setDefaultPaymentMethod(id);
            }
        });
    }
}

window.loadPaymentsMethods = loadPaymentsMethods;
window.addPaymentMethod = addPaymentMethod;
window.updatePaymentMethod = updatePaymentMethod;
window.deletePaymentMethod = deletePaymentMethod;
window.setDefaultPaymentMethod = setDefaultPaymentMethod;
window.initPaymentsPage = initPaymentsPage;
