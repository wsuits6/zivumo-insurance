async function loadAccountSummaries() {
    const paymentSummary = document.getElementById('paymentSummary');
    const documentsSummary = document.getElementById('documentsSummary');
    const invoicesSummary = document.getElementById('invoicesSummary');

    const [paymentRes, documentsRes, invoicesRes] = await Promise.all([
        apiRequest('/api/payment-methods', 'GET'),
        apiRequest('/api/documents', 'GET'),
        apiRequest('/api/invoices', 'GET')
    ]);

    if (paymentSummary) {
        if (paymentRes.ok && paymentRes.data.length) {
            const method = paymentRes.data[0];
            paymentSummary.textContent = `${method.brand} ending in ${method.last4} · Expires ${method.expiry}`;
        } else {
            paymentSummary.textContent = 'No payment method on file.';
        }
    }

    if (documentsSummary) {
        if (documentsRes.ok && documentsRes.data.length) {
            const latest = documentsRes.data
                .slice()
                .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
            documentsSummary.textContent = `Latest document generated on ${AvesUtils.formatDate(latest.date)}`;
        } else {
            documentsSummary.textContent = 'No documents available.';
        }
    }

    if (invoicesSummary) {
        if (invoicesRes.ok && invoicesRes.data.length) {
            const latest = invoicesRes.data
                .slice()
                .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
            invoicesSummary.textContent = `Last invoice on ${AvesUtils.formatDate(latest.date)} · ${latest.status}`;
        } else {
            invoicesSummary.textContent = 'No invoices available.';
        }
    }
}

function initAccountSettings() {
    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
        apiRequest('/api/account', 'GET')
            .then((response) => {
                if (!response.ok) return;
                const { name, email, phone, address, preferences } = response.data;
                const nameInput = document.getElementById('settingsName');
                const emailInput = document.getElementById('settingsEmail');
                const phoneInput = document.getElementById('settingsPhone');
                const addressInput = document.getElementById('settingsAddress');
                const renewalsInput = document.getElementById('notifyRenewals');
                const claimsInput = document.getElementById('notifyClaims');
                const announcementsInput = document.getElementById('notifyAnnouncements');

                if (nameInput && name) nameInput.value = name;
                if (emailInput && email) emailInput.value = email;
                if (phoneInput && phone) phoneInput.value = phone;
                if (addressInput && address) addressInput.value = address;
                if (preferences && typeof preferences === 'object') {
                    if (renewalsInput) renewalsInput.checked = !!preferences.renewals;
                    if (claimsInput) claimsInput.checked = !!preferences.claims;
                    if (announcementsInput) announcementsInput.checked = !!preferences.announcements;
                }
            });

        settingsForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const payload = {
                name: document.getElementById('settingsName').value.trim(),
                email: document.getElementById('settingsEmail').value.trim(),
                phone: document.getElementById('settingsPhone').value.trim(),
                address: document.getElementById('settingsAddress').value.trim()
            };

            apiRequest('/api/account', 'POST', payload)
                .then((response) => {
                    alert(response.message || 'Settings updated.');
                })
                .catch(() => alert('Unable to update settings right now.'));
        });
    }

    const settingsPreferencesBtn = document.getElementById('settingsPreferences');
    if (settingsPreferencesBtn) {
        settingsPreferencesBtn.addEventListener('click', () => {
            const payload = {
                renewals: document.getElementById('notifyRenewals')?.checked ?? false,
                claims: document.getElementById('notifyClaims')?.checked ?? false,
                announcements: document.getElementById('notifyAnnouncements')?.checked ?? false
            };

            apiRequest('/api/preferences', 'POST', payload)
                .then((response) => {
                    alert(response.message || 'Preferences updated.');
                });
        });
    }
}

function initPasswordUpdate() {
    const form = document.getElementById('passwordUpdateForm');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const msgEl = document.getElementById('passwordUpdateMessage');
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (!currentPassword || !newPassword || !confirmPassword) {
            msgEl.textContent = 'Please fill in all fields.';
            return;
        }

        if (newPassword.length < 8) {
            msgEl.textContent = 'New password must be at least 8 characters.';
            return;
        }

        if (newPassword !== confirmPassword) {
            msgEl.textContent = 'New passwords do not match.';
            return;
        }

        const response = await apiRequest('/api/account/password', 'POST', {
            currentPassword,
            newPassword
        });

        if (response.ok) {
            msgEl.textContent = response.message || 'Password updated successfully.';
            form.reset();
        } else {
            msgEl.textContent = response.message || 'Unable to update password.';
        }
    });
}

window.loadAccountSummaries = loadAccountSummaries;
window.initAccountSettings = initAccountSettings;
window.initPasswordUpdate = initPasswordUpdate;
