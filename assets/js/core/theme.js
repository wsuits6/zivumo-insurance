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

function initTheme() {
    new ThemeManager();
}

window.initTheme = initTheme;
