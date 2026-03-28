const API_BASE = window.location.port === '5500'
    ? 'http://127.0.0.1:8000'
    : '';

function apiRequest(path, method = 'GET', body = null) {
    const options = { method, headers: { 'Content-Type': 'application/json' }, credentials: 'include' };
    if (body) {
        options.body = JSON.stringify(body);
    }

    return fetch(`${API_BASE}${path}`, options)
        .then((response) =>
            response.json().then((data) => ({
                ...data,
                ok: typeof data.ok === 'boolean' ? data.ok : response.ok,
                status: response.status
            }))
        )
        .catch(() => ({ ok: false, message: 'Network error' }));
}

window.apiRequest = apiRequest;
