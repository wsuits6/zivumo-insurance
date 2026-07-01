document.addEventListener('DOMContentLoaded', () => {
    if (window.initTheme) initTheme();
    if (window.initSmoothScroll) initSmoothScroll();
    if (window.initNavToggle) initNavToggle();
    if (window.initCardAnimations) initCardAnimations();

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

    if (path.includes('payment-methods.html') && window.loadPaymentMethodsPage) {
        loadPaymentMethodsPage();
    }

    if (path.includes('admin-login.html') && window.setupAdminLogin) {
        setupAdminLogin();
    }

    if (path.includes('admin-dashboard.html') && window.loadAdminDashboard) {
        loadAdminDashboard();
        if (window.setupAdminActions) setupAdminActions();
    }
});
