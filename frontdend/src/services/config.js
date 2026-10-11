export const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true';
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
export const API_TIMEOUT_MS = parseInt(import.meta.env.VITE_API_TIMEOUT_MS || '10000', 10);
export const POLL_INTERVAL_MS = parseInt(import.meta.env.VITE_POLL_INTERVAL_MS || '10000', 10);
