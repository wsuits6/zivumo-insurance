const API_BASE = (function() {
    const proto = window.location.protocol;
    const port = window.location.port;
    if (proto === 'file:' || port === '5500' || port === '5501' || port === '3000' || port === '8080') {
        return 'http://127.0.0.1:8000';
    }
    return '';
})();

function getAuthToken() {
    return localStorage.getItem('aves_token');
}

function setAuthToken(token) {
    if (token) {
        localStorage.setItem('aves_token', token);
    } else {
        localStorage.removeItem('aves_token');
    }
}

function apiRequest(path, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const token = getAuthToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const options = { method, headers, credentials: 'include' };
    if (body) {
        options.body = JSON.stringify(body);
    }

    return fetch(`${API_BASE}${path}`, options)
        .then((response) => {
            if (!response.ok && response.headers.get('content-type')?.includes('text/html')) {
                return { ok: false, message: 'Server error. Please try again later.' };
            }
            return response.json().then((data) => {
                if (data.token) {
                    setAuthToken(data.token);
                }
                return {
                    ...data,
                    ok: typeof data.ok === 'boolean' ? data.ok : response.ok,
                    status: response.status
                };
            });
        })
        .catch(() => ({ ok: false, message: 'Network error. Make sure the server is running on port 8000.' }));
}

window.apiRequest = apiRequest;
window.setAuthToken = setAuthToken;
window.getAuthToken = getAuthToken;
