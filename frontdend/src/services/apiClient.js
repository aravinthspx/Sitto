import { API_BASE_URL, API_TIMEOUT_MS } from './config';

class ApiError extends Error {
  constructor(message, status, data, isNetworkError = false) {
    super(message);
    this.status = status;
    this.data = data;
    this.isNetworkError = isNetworkError;
  }
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // TODO: Add auth token here when authService is implemented
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
      if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
        const refreshToken = sessionStorage.getItem('refresh_token');
        if (refreshToken) {
          try {
            const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refresh_token: refreshToken })
            });
            if (refreshRes.ok) {
              const refreshData = await refreshRes.json();
              sessionStorage.setItem('token', refreshData.token);
              sessionStorage.setItem('refresh_token', refreshData.refresh_token);
              
              // Retry original request
              return await request(endpoint, options);
            }
          } catch (e) {
            // Refresh failed, fall through to logout
          }
        }
        
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('refresh_token');
        sessionStorage.removeItem('user');
        window.dispatchEvent(new Event('auth-expired'));
      }
      
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { message: response.statusText || '' };
      }
      
      let message = errorData.message || 'An error occurred';
      if (response.status === 401 && !endpoint.includes('/auth/login')) message = 'Authentication expired';
      if (response.status === 403) message = 'Access denied';
      if (response.status === 404) message = 'Reservation not found';

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
    throw new ApiError('Backend unreachable', 0, null, true);
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
