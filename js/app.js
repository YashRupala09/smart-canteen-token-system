class App {
    constructor() {
        this.init();
    }

    async init() {
        // Init Database
        if (window.dbService) {
            await window.dbService.init();
            console.log("Database initialized");
        }

        this.initTheme();
        this.bindEvents();
        this.registerServiceWorker();

        // Dispatch an event so page-specific JS knows app is ready
        document.dispatchEvent(new Event('appReady'));
    }

    initTheme() {
        const themeToggle = document.getElementById('themeToggle');
        if (!themeToggle) return;

        // Check local storage for theme preference
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        themeToggle.innerHTML = savedTheme === 'dark' ? '☀️ Light' : '🌙 Dark';

        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);

            themeToggle.innerHTML = newTheme === 'dark' ? '☀️ Light' : '🌙 Dark';
        });
    }

    bindEvents() {
        // Mobile sidebar toggle
        const menuBtn = document.getElementById('mobileMenuBtn');
        const sidebar = document.querySelector('.sidebar');
        if (menuBtn && sidebar) {
            menuBtn.addEventListener('click', () => {
                sidebar.classList.toggle('open');
            });
        }

        // Active state for navigation based on current URL path
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        document.querySelectorAll('.nav-item').forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPath) {
                link.classList.add('active');
            }
        });

        // Global hotkeys (e.g., F1 for token counter, etc.)
        document.addEventListener('keydown', (e) => {
            // Check if user is typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if (e.key === 'F1') {
                e.preventDefault();
                window.location.href = 'token-counter.html';
            } else if (e.key === 'F2') {
                e.preventDefault();
                window.location.href = 'kitchen.html';
            } else if (e.key === 'F3') {
                e.preventDefault();
                window.location.href = 'display-board.html';
            }
        });
    }

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./service-worker.js')
                    .then(registration => {
                        console.log('SW registered: ', registration.scope);
                    })
                    .catch(err => {
                        console.log('SW registration failed: ', err);
                    });
            });
        }
    }
}

// Global App Instance
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
