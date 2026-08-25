class FormValidator {
    constructor(formId) {
        this.form = document.getElementById(formId);
        if (this.form) {
            this.init();
        }
    }

    init() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    handleSubmit(e) {
        e.preventDefault();

        const formData = new FormData(this.form);
        const data = Object.fromEntries(formData.entries());

        if (this.form.id === 'loginForm') {
            this.handleLogin(data);
        } else if (this.form.id === 'signupForm') {
            this.handleSignup(data);
        } else if (this.form.id === 'addPaymentMethodForm') {
            this.handlePaymentMethod(data);
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

        localStorage.setItem('aves_user_email', data.email);

        apiRequest('/api/login', 'POST', payload)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(response.message || 'Login failed');
                }
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
                this.showMessage('Account created! Login to the main site to view your dashboard.', 'success');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);
            })
            .catch((error) => {
                this.showMessage(error.message, 'error');
            });
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    isValidLast4(last4) {
        return /^\d{4}$/.test(String(last4));
    }

    isValidExpiry(expiry) {
        return /^(0[1-9]|1[0-2])\/\d{2}$/.test(String(expiry).trim());
    }

    handlePaymentMethod(data) {
        if (!data.brand || !data.brand.trim()) {
            this.showMessage('Please enter the card brand', 'error');
            return;
        }

        const last4 = String(data.cardNumber || '').replace(/\D/g, '').slice(-4);
        if (!this.isValidLast4(last4)) {
            this.showMessage('Card number must end with 4 digits', 'error');
            return;
        }

        if (!this.isValidExpiry(data.expiry)) {
            this.showMessage('Expiry must be in MM/YY format (e.g. 08/27)', 'error');
            return;
        }

        const payload = {
            brand: data.brand.trim(),
            cardNumber: String(data.cardNumber || '').trim(),
            expiry: String(data.expiry || '').trim(),
            isDefault: Boolean(data.isDefault)
        };

        apiRequest('/api/payment-methods', 'POST', payload)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(response.message || 'Unable to add payment method');
                }
                this.showMessage(response.message || 'Payment method added.', 'success');
                this.form.reset();
                if (window.loadPaymentsMethods) window.loadPaymentsMethods();
            })
            .catch((error) => {
                this.showMessage(error.message, 'error');
            });
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

function initAuthForms() {
    new FormValidator('loginForm');
    new FormValidator('signupForm');
    new FormValidator('addPaymentMethodForm');
}

window.initAuthForms = initAuthForms;
