// API Configuration for Cloudflare Pages
const CONFIG = {
    // Automatically detect API URL based on environment
    get API_URL() {
        // In development (local), use local API
        if (window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1') {
            return 'http://localhost:8788';
        }
        // In production, use same domain (Cloudflare Functions)
        return window.location.origin;
    }
};

// Global API wrapper
const api = {
    async fetch(url, options = {}) {
        // Ensure we're calling the correct API
        const fullUrl = url.startsWith('/') 
            ? CONFIG.API_URL + url 
            : url;
        
        // Set default options
        const defaultOptions = {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };
        
        const finalOptions = { ...defaultOptions, ...options };
        
        try {
            const response = await fetch(fullUrl, finalOptions);
            
            // Handle authentication errors
            if (response.status === 401) {
                window.location.href = '/login.html';
                return;
            }
            
            return response;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // Convenience methods
    async get(url) {
        return this.fetch(url, { method: 'GET' });
    },

    async post(url, data) {
        return this.fetch(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async put(url, data) {
        return this.fetch(url, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    async delete(url) {
        return this.fetch(url, { method: 'DELETE' });
    },

    // Form data submission (for login)
    async postForm(url, formData) {
        return this.fetch(url, {
            method: 'POST',
            body: formData,
            headers: {} // Don't set Content-Type for FormData
        });
    }
};

// Make available globally
window.api = api;
window.CONFIG = CONFIG;

// Update all static file paths to use /assets/
const updateAssetPaths = () => {
    // Update CSS links
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
        if (link.href.includes('/static/')) {
            link.href = link.href.replace('/static/', '/assets/');
        }
    });
    
    // Update script sources
    document.querySelectorAll('script[src]').forEach(script => {
        if (script.src.includes('/static/')) {
            script.src = script.src.replace('/static/', '/assets/');
        }
    });
    
    // Update image sources
    document.querySelectorAll('img[src]').forEach(img => {
        if (img.src.includes('/static/')) {
            img.src = img.src.replace('/static/', '/assets/');
        }
    });
};

// Run on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateAssetPaths);
} else {
    updateAssetPaths();
}