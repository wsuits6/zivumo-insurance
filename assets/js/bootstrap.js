document.addEventListener('DOMContentLoaded', () => {
    initPasswordToggles();

    if (window.initTheme) initTheme();
    if (window.initSmoothScroll) initSmoothScroll();
    if (window.initNavToggle) initNavToggle();
    if (window.initCardAnimations) initCardAnimations();

    if (window.initTour) initTour();

    if (window.initAuthForms) initAuthForms();
    if (window.initAppAuth) initAppAuth();
    if (window.initAccountSettings) initAccountSettings();

    const path = window.location.pathname;

    if (path.includes('dashboard.html') && window.loadDashboardData) {
        loadDashboardData();
    }

    if (path.includes('account-settings.html')) {
        if (window.loadAccountSummaries) loadAccountSummaries();
    }

    if (path.includes('password-update.html') && window.initPasswordUpdate) {
        initPasswordUpdate();
    }

    if (path.includes('policies.html') && window.loadPoliciesPage) {
        loadPoliciesPage();
    }

    if (path.includes('policy-details.html') && window.loadPolicyDetailsPage) {
        loadPolicyDetailsPage();
    }

    if (path.includes('policy-renew.html') && window.setupPolicyRenew) {
        setupPolicyRenew();
    }

    if (path.includes('new-policy.html') && window.setupNewPolicy) {
        setupNewPolicy();
    }

    if (path.includes('documents.html') && window.loadDocumentsPage) {
        loadDocumentsPage();
    }

    if (path.includes('invoices.html') && window.loadInvoicesPage) {
        loadInvoicesPage();
    }

    if (path.includes('payments-methods.html') && window.initPaymentsPage) {
        initPaymentsPage();
    }

    if (path.includes('admin-login.html') && window.setupAdminLogin) {
        setupAdminLogin();
    }

    if (path.includes('admin-dashboard.html') && window.loadAdminDashboard) {
        loadAdminDashboard();
        if (window.setupAdminActions) setupAdminActions();
    }

    if (path.includes('help-center.html') && window.setupHelpCenter) {
        setupHelpCenter();
    }

    if (path.includes('user-notifications.html') && window.loadUserNotifications) {
        loadUserNotifications();
    } else if (window.syncServerNotifications && window.updateUserNotificationBadge) {
        window.syncServerNotifications().then(() => {
            window.updateUserNotificationBadge();
        });
    }

    if (path.includes('admin-notifications.html') && window.loadAdminNotifications) {
        loadAdminNotifications();
    }

    if (path.includes('admin-complaints.html') && window.loadAdminComplaintsPage) {
        loadAdminComplaintsPage();
    } else if (path.includes('complaints.html') && window.loadUserComplaintsPage) {
        loadUserComplaintsPage();
    }

    if (path.includes('payment-callback.html') && window.verifyPayment) {
        verifyPayment();
    }
});

function initPasswordToggles() {
    const eyeOpen = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    const eyeClosed = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

    document.addEventListener('click', function(e) {
        const btn = e.target.closest('.password-toggle');
        if (!btn) return;

        const wrapper = btn.closest('.password-wrapper');
        if (!wrapper) return;

        const input = wrapper.querySelector('input');
        if (!input) return;

        if (input.type === 'password') {
            input.type = 'text';
            btn.innerHTML = eyeClosed;
            btn.setAttribute('aria-label', 'Hide password');
        } else {
            input.type = 'password';
            btn.innerHTML = eyeOpen;
            btn.setAttribute('aria-label', 'Show password');
        }
    });
}
