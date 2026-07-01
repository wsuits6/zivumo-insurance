async function loadDocumentsPage() {
    const list = document.getElementById('documentsList');
    if (!list) return;
    const response = await apiRequest('/api/documents', 'GET');
    if (!response.ok) {
        list.textContent = response.message || 'Unable to load documents.';
        return;
    }
    list.innerHTML = response.data.map((doc) => `
        <div class="data-row">
            <div>
                <h3>${doc.title}</h3>
                <p>${AvesUtils.formatDate(doc.date)}</p>
            </div>
            <a class="btn btn-secondary btn-sm" href="${doc.file}" target="_blank" rel="noreferrer">Open</a>
        </div>
    `).join('');
}

async function loadInvoicesPage() {
    const list = document.getElementById('invoicesList');
    if (!list) return;
    const response = await apiRequest('/api/invoices', 'GET');
    if (!response.ok) {
        list.textContent = response.message || 'Unable to load invoices.';
        return;
    }
    list.innerHTML = response.data.map((invoice) => `
        <div class="data-row">
            <div>
                <h3>Invoice #${invoice.id}</h3>
                <p>${AvesUtils.formatDate(invoice.date)} - ${invoice.status}</p>
            </div>
            <div class="amount">${AvesUtils.formatCurrency(invoice.amount)}</div>
        </div>
    `).join('');
}

async function loadPaymentMethodsPage() {
    const list = document.getElementById('paymentMethodsList');
    if (!list) return;
    const response = await apiRequest('/api/payment-methods', 'GET');
    if (!response.ok) {
        list.textContent = response.message || 'Unable to load payment methods.';
        return;
    }
    list.innerHTML = response.data.map((method) => `
        <div class="data-row">
            <div>
                <h3>${method.brand} ending ${method.last4}</h3>
                <p>Expires ${method.expiry}</p>
            </div>
            <button class="btn btn-secondary btn-sm" disabled>Active</button>
        </div>
    `).join('');
}

window.loadDocumentsPage = loadDocumentsPage;
window.loadInvoicesPage = loadInvoicesPage;
window.loadPaymentMethodsPage = loadPaymentMethodsPage;
