/* ===================================
   ZIVUMO INSURANCE - MAIN JAVASCRIPT
   Theme toggle, form handling, and interactivity
   =================================== */

// === THEME MANAGEMENT ===
class ThemeManager {
    constructor() {
        this.themeToggle = document.getElementById('themeToggle');
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.init();
    }

    init() {
        this.setTheme(this.currentTheme);

        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', () => this.toggleTheme());
        }
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.currentTheme = theme;
        localStorage.setItem('theme', theme);

        if (this.themeToggle) {
            const label = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
            this.themeToggle.setAttribute('aria-label', label);
        }
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }
}

// === FORM VALIDATION ===
class FormValidator {
    constructor(formId) {
        this.form = document.getElementById(formId);
        if (this.form) {
            this.init();
        }
    }

    init() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.setupDemoLogin();
    }

    setupDemoLogin() {
        if (this.form.id !== 'loginForm') return;

        const demoLoginBtn = document.getElementById('demoLoginBtn');
        if (!demoLoginBtn) return;

        demoLoginBtn.addEventListener('click', () => {
            const emailInput = this.form.querySelector('#email');
            const passwordInput = this.form.querySelector('#password');
            if (emailInput) emailInput.value = 'demo@zivumo.com';
            if (passwordInput) passwordInput.value = 'Zivumo123!';
            this.showMessage('Signing you in with demo account...', 'success');
            localStorage.setItem('user', JSON.stringify({
                id: 1,
                name: 'Demo User',
                email: 'demo@zivumo.com'
            }));
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 800);
        });
    }

    handleSubmit(e) {
        e.preventDefault();

        const formData = new FormData(this.form);
        const data = Object.fromEntries(formData.entries());

        if (this.form.id === 'loginForm') {
            this.handleLogin(data);
        } else if (this.form.id === 'signupForm') {
            this.handleSignup(data);
        }
    }

    handleLogin(data) {
        if (!data.email || !data.password) {
            this.showMessage('Please fill in all fields', 'error');
            return;
        }

        if (!this.isValidEmail(data.email)) {
            this.showMessage('Please enter a valid email address', 'error');
            return;
        }

        const payload = { email: data.email, password: data.password };
        this.showMessage('Signing you in...', 'success');

        apiRequest('/api/login', 'POST', payload)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(response.message || 'Login failed');
                }
                localStorage.setItem('user', JSON.stringify(response.data));
                this.showMessage('Login successful! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
            })
            .catch((error) => {
                this.showMessage(error.message, 'error');
            });
    }

    handleSignup(data) {
        if (!data.fullName || !data.email || !data.password || !data.confirmPassword) {
            this.showMessage('Please fill in all fields', 'error');
            return;
        }

        if (!this.isValidEmail(data.email)) {
            this.showMessage('Please enter a valid email address', 'error');
            return;
        }

        if (data.password.length < 8) {
            this.showMessage('Password must be at least 8 characters', 'error');
            return;
        }

        if (data.password !== data.confirmPassword) {
            this.showMessage('Passwords do not match', 'error');
            return;
        }

        if (!data.terms) {
            this.showMessage('Please accept the Terms of Service', 'error');
            return;
        }

        const payload = {
            name: data.fullName,
            email: data.email,
            password: data.password
        };

        this.showMessage('Creating your account...', 'success');

        apiRequest('/api/signup', 'POST', payload)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(response.message || 'Signup failed');
                }
                this.showMessage('Account created! Redirecting to login...', 'success');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1200);
            })
            .catch((error) => {
                this.showMessage(error.message, 'error');
            });
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    showMessage(message, type) {
        const existingMessage = document.querySelector('.form-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `form-message form-message-${type}`;
        messageDiv.textContent = message;

        messageDiv.style.padding = '1rem';
        messageDiv.style.borderRadius = '10px';
        messageDiv.style.marginBottom = '1rem';
        messageDiv.style.textAlign = 'center';
        messageDiv.style.fontWeight = '600';

        if (type === 'success') {
            messageDiv.style.backgroundColor = 'rgba(15, 163, 177, 0.15)';
            messageDiv.style.color = '#0FA3B1';
        } else {
            messageDiv.style.backgroundColor = 'rgba(230, 57, 70, 0.15)';
            messageDiv.style.color = '#E63946';
        }

        this.form.insertBefore(messageDiv, this.form.firstChild);

        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }
}

// === DASHBOARD MANAGEMENT ===
class Dashboard {
    constructor() {
        this.checkAuth();
        this.loadUserData();
        this.setupLogout();
        this.loadOverview();
        this.loadPolicies();
        this.loadClaims();
        this.loadPayments();
        this.loadDocuments();
        this.loadNotifications();
    }

    checkAuth() {
        const user = localStorage.getItem('user');

        if (window.location.pathname.includes('dashboard.html') && !user) {
            window.location.href = 'login.html';
        }
    }

    loadUserData() {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const userNameElement = document.getElementById('userName');

        if (userNameElement && user.name) {
            userNameElement.textContent = user.name;
        }
    }

    setupLogout() {
        const logoutBtn = document.getElementById('logoutBtn');

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                apiRequest('/api/logout', 'POST')
                    .finally(() => {
                        localStorage.removeItem('user');
                        alert('You have been logged out successfully');
                        window.location.href = '../index.html';
                    });
            });
        }
    }

    loadOverview() {
        apiRequest('/api/overview', 'GET')
            .then((response) => {
                if (!response.ok || !response.data) return;
                const { totalPolicies, activePolicies, pendingRenewals, notifications } = response.data;
                setText('totalPolicies', totalPolicies);
                setText('activePolicies', activePolicies);
                setText('pendingRenewals', pendingRenewals);
                setText('notifications', notifications);
            });
    }

    loadPolicies() {
        const policiesGrid = document.getElementById('policiesGrid');
        if (!policiesGrid) return;

        apiRequest('/api/policies', 'GET')
            .then((response) => {
                if (!response.ok || !Array.isArray(response.data)) return;
                policiesGrid.innerHTML = response.data.map((policy) => renderPolicyCard(policy)).join('');
            });
    }

    loadClaims() {
        const claimsList = document.getElementById('claimsList');
        if (!claimsList) return;

        apiRequest('/api/claims', 'GET')
            .then((response) => {
                if (!response.ok || !Array.isArray(response.data)) return;
                claimsList.innerHTML = response.data.slice(0, 3).map((claim) => `
                    <div class="list-item">
                        <div class="list-meta">
                            <strong>${escapeHtml(claim.title)}</strong>
                            <span class="section-subtitle">Claim #${escapeHtml(claim.reference)} · Filed ${escapeHtml(claim.filed_at)}</span>
                        </div>
                        <span class="status-pill ${statusClass(claim.status)}">${escapeHtml(claim.status)}</span>
                    </div>
                `).join('');
            });
    }

    loadPayments() {
        const paymentsList = document.getElementById('paymentsList');
        if (!paymentsList) return;

        apiRequest('/api/payments', 'GET')
            .then((response) => {
                if (!response.ok || !Array.isArray(response.data)) return;
                paymentsList.innerHTML = response.data.slice(0, 3).map((payment) => `
                    <div class="list-item">
                        <div class="list-meta">
                            <strong>${escapeHtml(payment.label)}</strong>
                            <span class="section-subtitle">Due ${escapeHtml(payment.due_date)}</span>
                        </div>
                        <span class="status-pill info">${escapeHtml(payment.amount)}</span>
                    </div>
                `).join('');
            });
    }

    loadDocuments() {
        const documentsList = document.getElementById('documentsList');
        if (!documentsList) return;

        apiRequest('/api/documents', 'GET')
            .then((response) => {
                if (!response.ok || !Array.isArray(response.data)) return;
                documentsList.innerHTML = response.data.slice(0, 3).map((doc) => `
                    <div class="list-item">
                        <div class="list-meta">
                            <strong>${escapeHtml(doc.title)}</strong>
                            <span class="section-subtitle">${escapeHtml(doc.type)} · Updated ${escapeHtml(doc.updated_at)}</span>
                        </div>
                        <button class="btn btn-secondary btn-sm" data-action="download">Download</button>
                    </div>
                `).join('');
            });
    }

    loadNotifications() {
        const notificationsList = document.getElementById('notificationsList');
        if (!notificationsList) return;

        apiRequest('/api/notifications', 'GET')
            .then((response) => {
                if (!response.ok || !Array.isArray(response.data)) return;
                notificationsList.innerHTML = response.data.slice(0, 3).map((note) => `
                    <div class="list-item">
                        <div class="list-meta">
                            <strong>${escapeHtml(note.title)}</strong>
                            <span class="section-subtitle">${escapeHtml(note.detail)}</span>
                        </div>
                        <span class="status-pill ${note.read ? 'success' : 'pending'}">${note.read ? 'Done' : 'Action'}</span>
                    </div>
                `).join('');
            });
    }
}

// === POLICY INTERACTIONS ===
class PolicyManager {
    constructor() {
        this.setupPolicyButtons();
        this.setupQuickActions();
    }

    setupPolicyButtons() {
        document.addEventListener('click', (event) => {
            const button = event.target.closest('[data-policy-action]');
            if (!button) return;

            const policyCard = button.closest('.policy-card');
            const policyName = policyCard?.querySelector('h3')?.textContent || 'Policy';
            const policyId = policyCard?.getAttribute('data-policy-id');

            if (button.dataset.policyAction === 'details') {
                alert(`Viewing details for: ${policyName}\n\nThis feature will show complete policy information, coverage details, and documentation.`);
            }

            if (button.dataset.policyAction === 'renew') {
                const confirmed = confirm(`Policy Renewal\n\nPolicy: ${policyName}\n\nWould you like to renew this policy?`);
                if (confirmed) {
                    if (policyId) {
                        apiRequest(`/api/policies/${policyId}/renew`, 'POST')
                            .then(() => this.showRenewalSuccess(policyCard, policyName));
                    } else {
                        this.showRenewalSuccess(policyCard, policyName);
                    }
                }
            }
        });

        const addPolicyBtn = document.getElementById('addPolicyBtn');
        if (addPolicyBtn) {
            addPolicyBtn.addEventListener('click', () => {
                alert('Add New Policy\n\nThis feature will guide you through adding a new insurance policy to your account.');
            });
        }
    }

    setupQuickActions() {
        document.querySelectorAll('.action-card').forEach((card) => {
            card.addEventListener('click', () => {
                const action = card.dataset.action;
                if (action === 'new-claim') {
                    alert('Start a new claim in minutes. We will guide you through each step.');
                }
                if (action === 'add-policy') {
                    alert('Add a policy to keep coverage aligned.');
                }
                if (action === 'payment') {
                    alert('Your next invoice is ready to pay.');
                }
                if (action === 'documents') {
                    alert('Downloading your latest policy pack.');
                }
            });
        });
    }

    showRenewalSuccess(policyCard, policyName) {
        if (!policyCard) return;

        const badge = policyCard.querySelector('.badge');
        if (badge) {
            badge.className = 'badge badge-success';
            badge.textContent = 'Active';
        }

        const timeline = policyCard.querySelector('.timeline-progress');
        if (timeline) {
            timeline.style.width = '100%';
            timeline.classList.remove('warning');
        }

        const timelineText = policyCard.querySelector('.timeline-text');
        if (timelineText) {
            timelineText.textContent = '365 days remaining';
        }

        alert(`Renewal Successful!\n\n${policyName} has been renewed for another year.`);
    }
}

// === SMOOTH SCROLL FOR NAVIGATION ===
class SmoothScroll {
    constructor() {
        this.init();
    }

    init() {
        const links = document.querySelectorAll('a[href^="#"]');

        links.forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');

                if (href !== '#' && href.startsWith('#')) {
                    e.preventDefault();
                    const target = document.querySelector(href);

                    if (target) {
                        target.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                }
            });
        });
    }
}

// === FAQ ===
function initFaq() {
    document.querySelectorAll('.faq-question').forEach((button) => {
        button.addEventListener('click', () => {
            const item = button.closest('.faq-item');
            if (item) {
                item.classList.toggle('open');
            }
        });
    });
}

function initLandingContent() {
    const plansGrid = document.getElementById('plansGrid');
    if (plansGrid) {
        apiRequest('/api/plans', 'GET')
            .then((response) => {
                if (!response.ok || !Array.isArray(response.data)) return;
                plansGrid.innerHTML = response.data.map((plan, index) => `
                    <div class="plan-card ${index === 1 ? 'highlight' : ''}">
                        <span class="pill">${escapeHtml(plan.tag || '')}</span>
                        <h3>${escapeHtml(plan.name)}</h3>
                        <p class="plan-price">${escapeHtml(plan.price)}</p>
                        <div class="plan-features">
                            ${(plan.features || []).map((feature) => `
                                <span><span class="tag">Included</span> ${escapeHtml(feature)}</span>
                            `).join('')}
                        </div>
                        <a href="pages/signup.html" class="btn ${index === 1 ? 'btn-primary' : 'btn-secondary'}">Choose Plan</a>
                    </div>
                `).join('');
            });
    }

    const testimonialsGrid = document.getElementById('testimonialsGrid');
    if (testimonialsGrid) {
        apiRequest('/api/testimonials', 'GET')
            .then((response) => {
                if (!response.ok || !Array.isArray(response.data)) return;
                testimonialsGrid.innerHTML = response.data.map((item) => `
                    <div class="testimonial-card">
                        <span class="pill">${escapeHtml(item.role)}</span>
                        <p>“${escapeHtml(item.quote)}”</p>
                        <strong>— ${escapeHtml(item.author)}</strong>
                    </div>
                `).join('');
            });
    }

    const faqList = document.getElementById('faqList');
    if (faqList) {
        apiRequest('/api/faqs', 'GET')
            .then((response) => {
                if (!response.ok || !Array.isArray(response.data)) return;
                faqList.innerHTML = response.data.map((item) => `
                    <div class="faq-item">
                        <button class="faq-question" type="button">
                            ${escapeHtml(item.question)}
                            <span class="pill">Info</span>
                        </button>
                        <div class="faq-answer">${escapeHtml(item.answer)}</div>
                    </div>
                `).join('');
                initFaq();
            });
    }
}

// === SUPPORT FORM ===
function initSupportForm() {
    const supportForm = document.getElementById('supportForm');
    if (!supportForm) return;

    supportForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(supportForm);
        const payload = Object.fromEntries(formData.entries());

        apiRequest('/api/support', 'POST', payload)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(response.message || 'Unable to send request');
                }
                alert('Your request has been sent. A support advisor will respond shortly.');
                supportForm.reset();
            })
            .catch((error) => alert(error.message));
    });
}

// === INITIALIZE APPLICATION ===
document.addEventListener('DOMContentLoaded', () => {
    new ThemeManager();
    new SmoothScroll();
    initFaq();
    initSupportForm();
    initLandingContent();

    new FormValidator('loginForm');
    new FormValidator('signupForm');

    if (window.location.pathname.includes('dashboard.html') || window.location.pathname.includes('account-settings.html')) {
        new Dashboard();
        new PolicyManager();
    }

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

    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    if (navToggle && navLinks) {
        navToggle.addEventListener('click', () => {
            navLinks.classList.toggle('nav-open');
            const expanded = navLinks.classList.contains('nav-open');
            navToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        });
    }

    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    const cards = document.querySelectorAll('.feature-card, .policy-card, .stat-card, .plan-card, .testimonial-card, .action-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = `all 0.5s ease ${index * 0.08}s`;
        observer.observe(card);
    });
});

// === API CLIENT ===
const API_BASE = window.location.port === '5500'
    ? 'http://127.0.0.1:8000'
    : '/backend/public/index.php';

function apiRequest(path, method = 'GET', body = null) {
    const options = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) {
        options.body = JSON.stringify(body);
    }

    return fetch(`${API_BASE}${path}`, options)
        .then((response) =>
            response.json().then((data) => ({
                ...data,
                ok: typeof data.ok === 'boolean' ? data.ok : response.ok,
                status: response.status
            }))
        )
        .catch(() => ({ ok: false, message: 'Network error' }));
}

// === UTILITY FUNCTIONS ===
const utils = {
    formatDate(date) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(date).toLocaleDateString('en-US', options);
    },

    daysBetween(date1, date2) {
        const oneDay = 24 * 60 * 60 * 1000;
        const firstDate = new Date(date1);
        const secondDate = new Date(date2);
        return Math.round(Math.abs((firstDate - secondDate) / oneDay));
    },

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }
};

function setText(id, value) {
    const el = document.getElementById(id);
    if (el && value !== undefined && value !== null) {
        el.textContent = value;
    }
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function statusClass(status) {
    const normalized = String(status || '').toLowerCase();
    if (normalized.includes('approved') || normalized.includes('paid') || normalized.includes('complete')) return 'success';
    if (normalized.includes('review') || normalized.includes('pending')) return 'pending';
    return 'info';
}

function renderPolicyCard(policy) {
    return `
        <div class="policy-card" data-policy-id="${escapeHtml(policy.id)}">
            <div class="policy-header">
                <div class="policy-type">
                    <div class="icon-wrap">
                        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M12 3l7 4v5c0 5-3 9-7 11-4-2-7-6-7-11V7l7-4z"></path>
                        </svg>
                    </div>
                    <div>
                        <h3>${escapeHtml(policy.name)}</h3>
                        <p class="policy-number">Policy #${escapeHtml(policy.number)}</p>
                    </div>
                </div>
                <span class="badge badge-${policy.status === 'Active' ? 'success' : 'warning'}">${escapeHtml(policy.status)}</span>
            </div>
            <div class="policy-body">
                <div class="policy-detail">
                    <span class="detail-label">Coverage</span>
                    <span class="detail-value">${escapeHtml(policy.coverage)}</span>
                </div>
                <div class="policy-detail">
                    <span class="detail-label">Start Date</span>
                    <span class="detail-value">${escapeHtml(policy.start_date)}</span>
                </div>
                <div class="policy-detail">
                    <span class="detail-label">Expiration Date</span>
                    <span class="detail-value">${escapeHtml(policy.end_date)}</span>
                </div>
                <div class="policy-timeline">
                    <div class="timeline-bar">
                        <div class="timeline-progress" style="width: ${escapeHtml(policy.progress)}%"></div>
                    </div>
                    <span class="timeline-text">${escapeHtml(policy.remaining)} days remaining</span>
                </div>
            </div>
            <div class="policy-footer">
                <button class="btn btn-secondary btn-sm" data-policy-action="details">View Details</button>
                <button class="btn btn-primary btn-sm" data-policy-action="renew">Renew Policy</button>
            </div>
        </div>
    `;
}

window.ZivumoUtils = utils;
