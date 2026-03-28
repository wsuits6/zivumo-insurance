function initNavToggle() {
    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    if (navToggle && navLinks) {
        navToggle.addEventListener('click', () => {
            navLinks.classList.toggle('nav-open');
            const expanded = navLinks.classList.contains('nav-open');
            navToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        });
    }
}

window.initNavToggle = initNavToggle;
