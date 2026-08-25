(function () {
    if (window.__avesTourLoaded) return;
    window.__avesTourLoaded = true;

    /* localStorage keys: tour_step, tour_completed */
    var STEP_KEY = 'tour_step';
    var DONE_KEY = 'tour_completed';

    function getStep() {
        var n = parseInt(localStorage.getItem(STEP_KEY), 10);
        return isNaN(n) || n < 0 ? 0 : n;
    }

    function setStep(n) {
        localStorage.setItem(STEP_KEY, String(n));
    }

    function isCompleted() {
        return localStorage.getItem(DONE_KEY) === '1';
    }

    function markCompleted() {
        localStorage.setItem(DONE_KEY, '1');
    }

    /* ---------- Curriculum: route-based tips ---------- */
    var CURRICULUM = [
        {
            key: null,
            route: null,
            text: 'Welcome to Aves Insurance! I am your personal tour guide. Click "Next Tip" to walk through everything you can do here, or just type a question like "how do I renew my policy?" at any time.'
        },
        {
            key: 'dashboard',
            route: /dashboard\.html$/i,
            text: 'The Dashboard is your home base: your profile details, quick stats about your policies, shortcuts to notifications and account settings all live here.'
        },
        {
            key: 'policies',
            route: /(policy-details|policy-renew)\.html$/i,
            text: 'My Policies lists every plan you hold with its policy number, coverage window, premium and live status. Open any policy to see full coverage details or start a renewal.'
        },
        {
            key: 'new-policy',
            route: null,
            text: 'Applying for a new plan is easy: pick a policy type, set your start and end dates and we calculate the premium for you automatically before you submit.'
        },
        {
            key: 'documents',
            route: null,
            text: 'Documents stores your certificates and policy schedules. Everything issued to you is kept here, ready to view or download whenever you need proof of cover.'
        },
        {
            key: 'payment-methods',
            route: null,
            text: 'Under payment methods you can securely save cards and mobile money details, making renewals and future premiums a one-click affair.'
        },
        {
            key: 'complaints',
            route: null,
            text: 'Something wrong? File a complaint and our support team replies right inside your complaint thread - open it any time to read their feedback and track the status.'
        },
        {
            key: null,
            route: null,
            text: 'That completes the quick tour! You can reopen me anytime with the button in the bottom-right corner and ask about policies, renewals, premiums, documents, payments or complaints.'
        }
    ];

    /* ---------- Keyword-based FAQ fallback ---------- */
    var FAQ = [
        { keywords: ['hello', 'hi ', 'hey', 'good day'], answer: 'Hello! Ask me about policies, renewals, premiums, documents, payments or complaints.' },
        {
            keywords: ['renew', 'renewal', 'expire', 'extension'],
            answer: 'To renew: open My Policies, choose the policy that is due, press "Renew" and confirm the dates. The new premium is calculated automatically.'
        },
        {
            keywords: ['premium', 'cost', 'price', 'charge', 'fee', 'expensive'],
            answer: 'Premiums depend on the policy type and duration - roughly GHS 100 per year of cover. The exact amount is calculated for you when applying or renewing.'
        },
        {
            keywords: ['policy', 'coverage', 'cover', 'plan'],
            answer: 'A policy is your insurance contract. Open My Policies to see each plan\'s number, coverage details, start and end dates, status and premium.'
        },
        {
            keywords: ['document', 'certificate', 'schedule', 'download', 'pdf'],
            answer: 'All your certificates and policy schedules are under Documents. Click any item to view or download it.'
        },
        {
            keywords: ['payment', 'pay', 'momo', 'mobile money', 'card', 'method', 'billing'],
            answer: 'Manage how you pay under Payment Methods: add a card or mobile money wallet and it will be available for renewals and premiums.'
        },
        {
            keywords: ['complaint', 'complain', 'feedback', 'support ticket', 'not happy', 'problem', 'issue'],
            answer: 'Head to Complaints, describe your issue and submit it. Admins reply directly in the thread and you will see the status move from Open to In Progress to Resolved.'
        },
        {
            keywords: ['claim', 'compensation', 'accident'],
            answer: 'For claims, first make sure your policy is active, then send us a complaint describing the incident - our team will guide you through the claim process.'
        },
        {
            keywords: ['password', 'security', 'mfa', 'two factor', 'login problem'],
            answer: 'You can change your password and manage security options like MFA under Account Settings.'
        },
        {
            keywords: ['notification', 'alert', 'message'],
            answer: 'Notifications show renewal reminders and messages from our team - check the bell area of your dashboard or the Notifications page.'
        },
        {
            keywords: ['sign up', 'signup', 'register', 'create account'],
            answer: 'New here? Click Sign Up on the landing page, provide your name, email and a password of at least 8 characters, and you are in.'
        },
        {
            keywords: ['thank', 'thanks', 'great', 'nice'],
            answer: 'You are very welcome! I am here whenever you need guidance.'
        }
    ];

    function findFaqAnswer(text) {
        var normalized = ' ' + String(text).toLowerCase() + ' ';
        var best = null;
        var bestScore = 0;
        FAQ.forEach((entry) => {
            var score = 0;
            entry.keywords.forEach((kw) => {
                if (normalized.indexOf(kw.toLowerCase()) !== -1) score += kw.length;
            });
            if (score > bestScore) {
                bestScore = score;
                best = entry;
            }
        });
        return best ? best.answer : null;
    }

    /* ---------- Injected styles (built from existing CSS variables) ---------- */
    function injectStyles() {
        if (document.getElementById('tour-guide-styles')) return;
        var css = [
            '.tour-fab{position:fixed;bottom:1.25rem;right:1.25rem;width:56px;height:56px;border-radius:var(--radius-pill);',
            'border:none;background:linear-gradient(120deg,var(--primary-color),var(--accent-color));color:#fff;cursor:pointer;',
            'box-shadow:var(--shadow-lg);display:flex;align-items:center;justify-content:center;z-index:3000;transition:var(--transition);}',
            '.tour-fab:hover{transform:translateY(-3px) scale(1.05);}',
            '.tour-fab svg{width:26px;height:26px;}',
            '.tour-widget{position:fixed;bottom:6rem;right:1.25rem;width:min(340px,calc(100vw - 2rem));max-height:min(520px,calc(100vh - 8rem));',
            'display:none;flex-direction:column;background:var(--bg-secondary);border:1px solid var(--border-color);',
            'border-radius:var(--radius-lg);box-shadow:var(--shadow-lg);overflow:hidden;z-index:3000;}',
            '.tour-widget.open{display:flex;}',
            '.tour-header{display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding:.85rem 1rem;',
            'background:linear-gradient(120deg,var(--primary-color),var(--accent-color));color:#fff;}',
            '.tour-header-title{display:flex;align-items:center;gap:.6rem;}',
            '.tour-header-title strong{display:block;font-size:.95rem;line-height:1.2;font-family:var(--font-heading);}',
            '.tour-header-title small{font-size:.72rem;opacity:.85;}',
            '.tour-close{background:rgba(255,255,255,.15);border:none;color:#fff;width:28px;height:28px;border-radius:50%;',
            'cursor:pointer;font-size:1.1rem;line-height:1;display:flex;align-items:center;justify-content:center;flex-shrink:0;}',
            '.tour-close:hover{background:rgba(255,255,255,.3);}',
            '.tour-messages{flex:1;overflow-y:auto;padding:var(--spacing-sm);display:flex;flex-direction:column;gap:.6rem;background:var(--bg-primary);}',
            '.tour-msg{max-width:88%;padding:.6rem .8rem;border-radius:var(--radius-md);font-size:.85rem;line-height:1.55;word-break:break-word;}',
            '.tour-msg-bot{align-self:flex-start;background:var(--bg-tertiary);color:var(--text-primary);border-bottom-left-radius:4px;}',
            '.tour-msg-user{align-self:flex-end;background:var(--primary-color);color:#fff;border-bottom-right-radius:4px;}',
            '[data-theme="dark"] .tour-msg-user{color:#0B1B1F;}',
            '.tour-caret::after{content:"▌";margin-left:1px;opacity:.7;animation:tourCaret .8s steps(1) infinite;}',
            '@keyframes tourCaret{50%{opacity:0;}}',
            '.tour-controls{display:flex;gap:.5rem;padding:0 var(--spacing-sm) .6rem;background:var(--bg-primary);}',
            '.tour-btn{flex:1;padding:.5rem .75rem;border-radius:var(--radius-sm);border:1px solid var(--border-color);',
            'cursor:pointer;font-size:.82rem;font-weight:600;font-family:inherit;transition:var(--transition);white-space:nowrap;}',
            '.tour-btn-primary{background:var(--primary-color);border-color:var(--primary-color);color:#fff;}',
            '[data-theme="dark"] .tour-btn-primary{color:#0B1B1F;}',
            '.tour-btn-primary:hover{filter:brightness(1.08);}',
            '.tour-btn-secondary{background:var(--bg-secondary);color:var(--text-secondary);}',
            '.tour-btn-secondary:hover{color:var(--error-color);border-color:var(--error-color);}',
            '.tour-input-row{display:flex;gap:.5rem;padding:.6rem var(--spacing-sm) var(--spacing-sm);background:var(--bg-primary);border-top:1px solid var(--border-color);}',
            '.tour-input-row input{flex:1;min-width:0;padding:.5rem .75rem;border-radius:var(--radius-sm);border:1px solid var(--border-color);',
            'font-size:.85rem;font-family:inherit;background:var(--bg-secondary);color:var(--text-primary);}',
            '.tour-input-row input:focus{outline:none;border-color:var(--primary-color);box-shadow:0 0 0 3px rgba(11,110,110,.12);}',
            '.tour-input-row .tour-btn{flex:0 0 auto;}',
            '.tour-highlight{animation:tourGlow 1.5s ease-in-out infinite;border-radius:var(--radius-md);}',
            '@keyframes tourGlow{',
            '0%,100%{box-shadow:0 0 0 3px var(--primary-color),0 0 16px 4px rgba(11,110,110,.35);}',
            '50%{box-shadow:0 0 0 3px var(--accent-color),0 0 26px 8px rgba(31,58,147,.4);}}'
        ].join('');
        var style = document.createElement('style');
        style.id = 'tour-guide-styles';
        style.textContent = css;
        document.head.appendChild(style);
    }

    /* ---------- Widget UI ---------- */
    var els = {};

    function buildWidget() {
        if (els.widget) return;

        var fab = document.createElement('button');
        fab.className = 'tour-fab';
        fab.id = 'tourFab';
        fab.setAttribute('aria-label', 'Open AI Tour Guide');
        fab.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<rect x="4" y="7" width="16" height="12" rx="3"></rect>' +
            '<path d="M12 7V4M9 4h6"></path>' +
            '<circle cx="9" cy="13" r="1"></circle><circle cx="15" cy="13" r="1"></circle>' +
            '<path d="M9.5 16.5h5"></path></svg>';

        var widget = document.createElement('div');
        widget.className = 'tour-widget';
        widget.id = 'tourWidget';
        widget.setAttribute('role', 'dialog');
        widget.innerHTML =
            '<div class="tour-header">' +
                '<div class="tour-header-title">' +
                    '<strong>Aves Tour Guide</strong>' +
                    '<small>Rule-based assistant - no internet required</small>' +
                '</div>' +
                '<button class="tour-close" id="tourMinimize" aria-label="Minimize tour guide">&times;</button>' +
            '</div>' +
            '<div class="tour-messages" id="tourMessages"></div>' +
            '<div class="tour-controls">' +
                '<button class="tour-btn tour-btn-primary" id="tourNextTip">Next Tip</button>' +
                '<button class="tour-btn tour-btn-secondary" id="tourEndTour">End Tour</button>' +
            '</div>' +
            '<form class="tour-input-row" id="tourAskForm">' +
                '<input type="text" id="tourAskInput" placeholder="Ask me anything... e.g. renew policy" autocomplete="off">' +
                '<button type="submit" class="tour-btn tour-btn-primary">Send</button>' +
            '</form>';

        document.body.appendChild(fab);
        document.body.appendChild(widget);

        els.fab = fab;
        els.widget = widget;
        els.messages = widget.querySelector('#tourMessages');
        els.nextBtn = widget.querySelector('#tourNextTip');
        els.endBtn = widget.querySelector('#tourEndTour');
        els.form = widget.querySelector('#tourAskForm');
        els.input = widget.querySelector('#tourAskInput');

        fab.addEventListener('click', toggleWidget);
        widget.querySelector('#tourMinimize').addEventListener('click', closeWidget);
        els.nextBtn.addEventListener('click', nextTip);
        els.endBtn.addEventListener('click', endTour);
        els.form.addEventListener('submit', function (e) {
            e.preventDefault();
            var text = els.input.value.trim();
            if (!text) return;
            els.input.value = '';
            addUserMsg(text);
            var answer = findFaqAnswer(text);
            speak(answer || 'I am not sure about that one. Try asking about policies, renewals, premiums, documents, payment methods, complaints, claims or account security.');
        });
    }

    function openWidget() {
        buildWidget();
        els.widget.classList.add('open');
    }

    function closeWidget() {
        if (!els.widget) return;
        els.widget.classList.remove('open');
        clearHighlight();
    }

    function toggleWidget() {
        if (!els.widget) return;
        if (els.widget.classList.contains('open')) {
            closeWidget();
        } else {
            openWidget();
        }
    }

    /* ---------- Messages & typewriter ---------- */
    var queue = Promise.resolve();

    function scrollToEnd() {
        els.messages.scrollTop = els.messages.scrollHeight;
    }

    function addUserMsg(text) {
        buildWidget();
        var div = document.createElement('div');
        div.className = 'tour-msg tour-msg-user';
        div.textContent = text;
        els.messages.appendChild(div);
        scrollToEnd();
    }

    function speak(text) {
        queue = queue.then(function () {
            if (!els.widget || !els.widget.classList.contains('open')) return;
            return new Promise(function (resolve) {
                var div = document.createElement('div');
                div.className = 'tour-msg tour-msg-bot tour-caret';
                els.messages.appendChild(div);
                var i = 0;
                var timer = setInterval(function () {
                    div.textContent = text.slice(0, i + 1);
                    i += 1;
                    scrollToEnd();
                    if (i >= text.length) {
                        clearInterval(timer);
                        div.classList.remove('tour-caret');
                        resolve();
                    }
                }, 14);
            });
        });
        return queue;
    }

    /* ---------- Highlighting ---------- */
    function clearHighlight() {
        document.querySelectorAll('.tour-highlight').forEach(function (el) {
            el.classList.remove('tour-highlight');
        });
    }

    function highlightTarget(key) {
        clearHighlight();
        if (!key) return;
        var el = document.querySelector('[data-tour-target="' + key + '"]');
        if (!el) return;
        el.classList.add('tour-highlight');
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    /* ---------- Tour flow ---------- */
    function deliverStep(index) {
        var step = CURRICULUM[index];
        if (!step) return;
        speak(step.text).then(function () {
            highlightTarget(step.key);
        });
    }

    function nextTip() {
        var step = getStep();
        if (isCompleted()) {
            speak('You have already completed the tour! Ask me any question below, or use End Tour anytime - the guide stays available in the bottom-right corner.');
            return;
        }
        var next = step + 1;
        if (next >= CURRICULUM.length) {
            markCompleted();
            clearHighlight();
            speak('That is the end of the tour - you are all set! This guide stays in the bottom-right corner whenever you need help.');
            return;
        }
        setStep(next);
        clearHighlight();
        deliverStep(next);
    }

    function endTour() {
        markCompleted();
        clearHighlight();
        setStep(CURRICULUM.length);
        speak('Tour ended. No worries - you can reopen this guide anytime from the button in the bottom-right corner and ask me anything.');
    }

    function greetReturningUser() {
        speak('Welcome back! We left off partway through your tour - here is your next tip.');
        deliverStep(getStep());
    }

    function init() {
        injectStyles();
        buildWidget();

        if (!isCompleted()) {
            setTimeout(function () {
                openWidget();
                if (getStep() === 0) {
                    deliverStep(0);
                } else {
                    greetReturningUser();
                }
            }, 900);
        }
    }

    window.initTour = init;
})();
