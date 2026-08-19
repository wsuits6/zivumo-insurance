function setupHelpCenter() {
    const form = document.getElementById('helpForm');
    if (!form) return;

    const typeSelect = document.getElementById('helpPolicyType');
    const emailInput = document.getElementById('helpEmail');

    if (typeSelect && window.POLICY_TYPES) {
        for (const type in window.POLICY_TYPES) {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            typeSelect.appendChild(option);
        }
    }

    const loggedInEmail = localStorage.getItem('aves_user_email');
    if (loggedInEmail && emailInput) {
        emailInput.value = loggedInEmail;
        emailInput.readOnly = true;
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const msgEl = document.getElementById('helpFormMessage');
        const username = document.getElementById('helpUsername').value.trim();
        const email = emailInput.value.trim();
        const policyType = document.getElementById('helpPolicyType').value;
        const message = document.getElementById('helpMessage').value.trim();

        if (!username || !email || !policyType || !message) {
            msgEl.textContent = 'Please fill in all fields.';
            msgEl.classList.add('form-message-error');
            return;
        }

        window.NotificationStore.createHelpMessage(username, email, policyType, message);

        msgEl.classList.remove('form-message-error');
        msgEl.textContent = 'Your message has been sent successfully. Our team will get back to you shortly.';
        form.reset();

        if (loggedInEmail && emailInput) {
            emailInput.value = loggedInEmail;
        }
    });
}

window.setupHelpCenter = setupHelpCenter;
