/**
 * @module core/api
 * Fetch wrapper for Algo backend API calls.
 */

const API_BASE_URL = 'http://localhost:3000';

/**
 * Make an authenticated API request.
 * @param {string} method - HTTP method
 * @param {string} path - API path (e.g. '/api/auth/login')
 * @param {Object} [body] - Request body (will be JSON-stringified)
 * @returns {Promise<{data?: any, error?: string}>}
 */
export async function apiFetch(method, path, body) {
  const token = localStorage.getItem('algo_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem('algo_token');
        localStorage.removeItem('algo_username');
      }
      return { error: data.error || 'Request failed' };
    }
    return { data };
  } catch (err) {
    return { error: 'Backend unreachable' };
  }
}

/**
 * Check if user is logged in (has a stored token).
 */
export function isLoggedIn() {
  return !!localStorage.getItem('algo_token');
}

/**
 * Get the stored username.
 */
export function getUsername() {
  return localStorage.getItem('algo_username') || '';
}

/**
 * Store auth data after login/signup.
 */
export function setAuth(token, username) {
  localStorage.setItem('algo_token', token);
  localStorage.setItem('algo_username', username);
}

/**
 * Clear auth data on logout.
 */
export function clearAuth() {
  localStorage.removeItem('algo_token');
  localStorage.removeItem('algo_username');
}
