import { API_BASE_URL, API_TIMEOUT_MS } from './config';

class ApiError extends Error {
  constructor(message, status, data, isNetworkError = false) {
    super(message);
    this.status = status;
    this.data = data;
    this.isNetworkError = isNetworkError;
  }
}

const SERVER_UNREACHABLE = "Can't reach the SITTO server. Check that the backend is running and try again.";

export function clearSession() {
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('refresh_token');
  sessionStorage.removeItem('user');
}

// Supabase rotates the refresh token on every use, so concurrent refreshes would
// invalidate each other. All requests that hit a 401 share one in-flight refresh.
let refreshPromise = null;

function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = sessionStorage.getItem('refresh_token');
      if (!refreshToken) return false;
      try {
        const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (!res.ok) return false;
        const data = await res.json();
        sessionStorage.setItem('token', data.token);
        sessionStorage.setItem('refresh_token', data.refresh_token);
        return true;
      } catch {
        return false;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function request(endpoint, options = {}, isRetry = false) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const token = sessionStorage.getItem('token');
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      signal: controller.signal,
    });
    
    clearTimeout(id);

    if (!response.ok) {
      if (response.status === 401 && !isRetry && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
        // Another request may already have refreshed the session while this one was in flight
        const refreshed = sessionStorage.getItem('token') !== token || await refreshSession();
        if (refreshed) {
          return await request(endpoint, options, true);
        }
        clearSession();
        window.dispatchEvent(new Event('auth-expired'));
      } else if (response.status === 401 && isRetry) {
        clearSession();
        window.dispatchEvent(new Event('auth-expired'));
      }

      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { message: response.statusText || '' };
      }
      
      let message = errorData.message || 'Something went wrong. Please try again.';
      if (response.status === 401 && !endpoint.includes('/auth/')) message = 'Your session has expired. Please sign in again.';
      if (response.status === 403 && !errorData.message) message = 'Access denied';
      if (response.status === 404 && !errorData.message) message = 'Not found';
      if (response.status >= 502 && response.status <= 504) message = SERVER_UNREACHABLE;

      throw new ApiError(message, response.status, errorData);
    }

    // Handle 204 No Content
    if (response.status === 204) return null;

    return await response.json();
  } catch (error) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new ApiError('Request timed out', 408, null, true);
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(SERVER_UNREACHABLE, 0, null, true);
  }
}

export const apiClient = {
  get: (endpoint, params) => {
    let url = endpoint;
    if (params) {
      const cleanParams = {};
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) cleanParams[k] = v;
      }
      const qs = new URLSearchParams(cleanParams).toString();
      if (qs) url += `?${qs}`;
    }
    return request(url, { method: 'GET' });
  },
  post: (endpoint, body) => request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body) => request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
};
