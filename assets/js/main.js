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
        // Set initial theme
        this.setTheme(this.currentTheme);
        
        // Add event listener to theme toggle button
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
        
        // Validate based on form type
        if (this.form.id === 'loginForm') {
            this.handleLogin(data);
        } else if (this.form.id === 'signupForm') {
            this.handleSignup(data);
        }
    }

    handleLogin(data) {
        // Basic validation
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
        // Validation
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
        // Remove existing message if any
        const existingMessage = document.querySelector('.form-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Create message element
        const messageDiv = document.createElement('div');
        messageDiv.className = `form-message form-message-${type}`;
        messageDiv.textContent = message;
        
        // Add styles
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

        // Insert message at the top of the form
        this.form.insertBefore(messageDiv, this.form.firstChild);

        // Remove message after 5 seconds
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
    }

    checkAuth() {
        // Check if user is logged in (simulation)
        const user = localStorage.getItem('user');
        
        // If on dashboard page and not logged in, redirect to login
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
}

// === POLICY INTERACTIONS ===
class PolicyManager {
    constructor() {
        this.setupPolicyButtons();
    }

    setupPolicyButtons() {
        // View Details buttons
        const viewButtons = document.querySelectorAll('.policy-footer .btn-secondary');
        viewButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const policyCard = e.target.closest('.policy-card');
                const policyName = policyCard.querySelector('h3').textContent;
                alert(`Viewing details for: ${policyName}\n\nThis feature will show complete policy information, coverage details, and documentation.`);
            });
        });

        // Renew buttons
        const renewButtons = document.querySelectorAll('.policy-footer .btn-primary, .policy-footer .btn-alert');
        renewButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const policyCard = e.target.closest('.policy-card');
                const policyName = policyCard.querySelector('h3').textContent;
                const isUrgent = e.target.classList.contains('btn-alert');
                
                const message = isUrgent 
                    ? `URGENT RENEWAL\n\nPolicy: ${policyName}\n\nThis policy is expiring soon. Would you like to proceed with renewal?`
                    : `Policy Renewal\n\nPolicy: ${policyName}\n\nWould you like to renew this policy?`;
                
                const confirmed = confirm(message);
                
                if (confirmed) {
                    // Simulate renewal process
                    this.showRenewalSuccess(policyCard, policyName);
                }
            });
        });

        // Add New Policy button
        const addPolicyBtn = document.querySelector('.section-title .btn-primary');
        if (addPolicyBtn) {
            addPolicyBtn.addEventListener('click', () => {
                alert('Add New Policy\n\nThis feature will guide you through adding a new insurance policy to your account.');
            });
        }
    }

    showRenewalSuccess(policyCard, policyName) {
        // Update badge to success
        const badge = policyCard.querySelector('.badge');
        badge.className = 'badge badge-success';
        badge.textContent = 'Active';

        // Update timeline to 100%
        const timeline = policyCard.querySelector('.timeline-progress');
        timeline.style.width = '100%';
        timeline.classList.remove('warning');

        // Update timeline text
        const timelineText = policyCard.querySelector('.timeline-text');
        timelineText.textContent = '365 days remaining';

        // Show success message
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
                
                // Only handle hash links
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

// === INITIALIZE APPLICATION ===
document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme manager
    new ThemeManager();

    // Initialize smooth scroll
    new SmoothScroll();

    // Initialize form validators
    new FormValidator('loginForm');
    new FormValidator('signupForm');

    // Initialize dashboard (if on dashboard page)
    if (window.location.pathname.includes('dashboard.html') || window.location.pathname.includes('account-settings.html')) {
        new Dashboard();
        new PolicyManager();
    }

    // Load and submit account settings
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

    // Mobile nav toggle
    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    if (navToggle && navLinks) {
        navToggle.addEventListener('click', () => {
            navLinks.classList.toggle('nav-open');
            const expanded = navLinks.classList.contains('nav-open');
            navToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        });
    }

    // Add animation to cards on scroll
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

    // Observe feature cards and policy cards
    const cards = document.querySelectorAll('.feature-card, .policy-card, .stat-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = `all 0.5s ease ${index * 0.1}s`;
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
    // Format date
    formatDate(date) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(date).toLocaleDateString('en-US', options);
    },

    // Calculate days between dates
    daysBetween(date1, date2) {
        const oneDay = 24 * 60 * 60 * 1000;
        const firstDate = new Date(date1);
        const secondDate = new Date(date2);
        return Math.round(Math.abs((firstDate - secondDate) / oneDay));
    },

    // Format currency
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }
};

// Export utils for use in other scripts
window.ZivumoUtils = utils;
