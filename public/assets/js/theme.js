// Theme management
(function() {
    'use strict';
    
    // Initialize theme on page load
    function initTheme() {
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            enableDarkTheme();
        } else {
            enableLightTheme();
        }
        
        createThemeToggle();
    }
    
    function enableDarkTheme() {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
        updateToggleButton();
    }
    
    function enableLightTheme() {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        updateToggleButton();
    }
    
    function toggleTheme() {
        if (document.documentElement.classList.contains('dark')) {
            enableLightTheme();
        } else {
            enableDarkTheme();
        }
    }
    
    function createThemeToggle() {
        const toggle = document.createElement('button');
        toggle.id = 'theme-toggle';
        toggle.className = 'theme-toggle';
        toggle.setAttribute('aria-label', 'Toggle dark mode');
        toggle.onclick = toggleTheme;
        
        document.body.appendChild(toggle);
        updateToggleButton();
    }
    
    function updateToggleButton() {
        const toggle = document.getElementById('theme-toggle');
        if (toggle) {
            const isDark = document.documentElement.classList.contains('dark');
            toggle.innerHTML = isDark ? '☀️ Chiaro' : '🌙 Scuro';
            toggle.setAttribute('aria-label', isDark ? 'Attiva tema chiaro' : 'Attiva tema scuro');
        }
    }
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            if (e.matches) {
                enableDarkTheme();
            } else {
                enableLightTheme();
            }
        }
    });
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTheme);
    } else {
        initTheme();
    }
    
    // Expose functions globally if needed
    window.themeManager = {
        toggle: toggleTheme,
        enableDark: enableDarkTheme,
        enableLight: enableLightTheme
    };
})();