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

function initSmoothScroll() {
    new SmoothScroll();
}

window.initSmoothScroll = initSmoothScroll;
