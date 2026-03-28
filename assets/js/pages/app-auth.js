class AppAuth {
    constructor() {
        this.user = null;
    }

    async init() {
        await this.checkAuth();
        await this.loadUserData();
        await this.loadUserProfile();
        this.setupLogout();
    }

    async checkAuth() {
        const response = await apiRequest('/api/me', 'GET');
        if (!response.ok) {
            if (window.location.pathname.includes('dashboard.html') ||
                window.location.pathname.includes('account-settings.html') ||
                window.location.pathname.includes('policies.html') ||
                window.location.pathname.includes('policy-details.html') ||
                window.location.pathname.includes('policy-renew.html') ||
                window.location.pathname.includes('new-policy.html') ||
                window.location.pathname.includes('documents.html') ||
                window.location.pathname.includes('invoices.html') ||
                window.location.pathname.includes('payment-methods.html')) {
                window.location.href = 'login.html';
            }
            return;
        }
        this.user = response.data;
    }

    async loadUserData() {
        const userNameElement = document.getElementById('userName');
        if (userNameElement && this.user && this.user.name) {
            userNameElement.textContent = this.user.name;
        }
    }

    async loadUserProfile() {
        const profileName = document.getElementById('profileName');
        const profileEmail = document.getElementById('profileEmail');
        const profilePhone = document.getElementById('profilePhone');
        const profileAddress = document.getElementById('profileAddress');

        if (!profileName && !profileEmail && !profilePhone && !profileAddress) return;

        const response = await apiRequest('/api/account', 'GET');
        if (!response.ok) return;

        const { name, email, phone, address } = response.data;
        if (profileName) profileName.textContent = name || '--';
        if (profileEmail) profileEmail.textContent = email || '--';
        if (profilePhone) profilePhone.textContent = phone || '--';
        if (profileAddress) profileAddress.textContent = address || '--';
    }

    setupLogout() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                apiRequest('/api/logout', 'POST')
                    .finally(() => {
                        window.location.href = '../index.html';
                    });
            });
        }
    }
}

function initAppAuth() {
    const protectedPages = [
        'dashboard.html',
        'account-settings.html',
        'policies.html',
        'policy-details.html',
        'policy-renew.html',
        'new-policy.html',
        'documents.html',
        'invoices.html',
        'payment-methods.html',
        'security-review.html',
        'profile-photo.html'
    ];

    if (protectedPages.some((page) => window.location.pathname.includes(page))) {
        const auth = new AppAuth();
        auth.init();
    }
}

window.initAppAuth = initAppAuth;
