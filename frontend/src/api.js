// frontend/src/api.js
import axios from 'axios';

// Helper: Get CSRF token from cookie
function getCSRFToken() {
    const name = 'csrftoken';
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

const API = axios.create({
    baseURL: '/api/',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor: Add CSRF token
API.interceptors.request.use((config) => {
    const csrfToken = getCSRFToken();
    if (csrfToken) {
        config.headers['X-CSRFToken'] = csrfToken;
    }
    return config;
});

// Response interceptor: Handle 401/403 (merged, single interceptor)
API.interceptors.response.use(
    (response) => response,
    (error) => {
        // A 403 means the session is valid but the account lacks endpoint access.
        // Only an expired/missing session should send the user back to login.
        const isLoginPage = window.location.pathname === '/login';
        if (!isLoginPage && error.response && error.response.status === 401) {
            // Clear invalid user data and redirect to login
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default API;