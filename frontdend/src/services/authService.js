import { USE_MOCK } from './config';
import { mockStore } from '../mocks/mockStore';
import { apiClient, clearSession } from './apiClient';
import { disablePush } from './pushService';

export async function login(credentials) {
  if (USE_MOCK) {
    await mockStore.delay();
    // Demo login accepts any non-empty username/password
    if (!credentials.username || !credentials.password) {
      throw new Error('Please enter username and password');
    }
    const token = 'mock_jwt_token_123';
    
    // Determine mock role based on username/email
    const isAdmin = credentials.username?.toLowerCase().includes('admin');
    const user = isAdmin 
      ? { id: 'ADM123', name: 'Admin User', role: 'admin' }
      : { id: 'STU12345', name: credentials.username, role: 'student' };
    
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('user', JSON.stringify(user));
    
    return { token, user };
  }

  const raw = await apiClient.post('/auth/login', credentials);
  sessionStorage.setItem('token', raw.token || raw.access_token);
  if (raw.refresh_token) {
    sessionStorage.setItem('refresh_token', raw.refresh_token);
  }
  sessionStorage.setItem('user', JSON.stringify(raw.user));
  return raw;
}

export async function logout() {
  if (USE_MOCK) {
    await mockStore.delay();
    clearSession();
    return;
  }

  // Stop this device getting the signed-out user's notifications (shared computers)
  await disablePush().catch(() => {});

  try {
    await apiClient.post('/auth/logout');
  } catch (err) {
    console.error('Logout error', err);
  } finally {
    clearSession();
  }
}

export function getCurrentUser() {
  const userStr = sessionStorage.getItem('user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export async function signup(credentials) {
  if (USE_MOCK) {
    await mockStore.delay();
    return { message: "Signup successful. Check your email to verify your account." };
  }
  return apiClient.post('/auth/signup', {
    email: credentials.email,
    password: credentials.password,
    name: credentials.name,
    accepted_privacy: credentials.acceptedPrivacy === true,
  });
}

export async function resetPassword(email) {
  if (USE_MOCK) {
    await mockStore.delay();
    return { message: "If your email is registered, a reset link has been sent." };
  }
  return apiClient.post('/auth/reset-password', { email });
}

export async function updatePassword(password, access_token, refresh_token) {
  if (USE_MOCK) {
    await mockStore.delay();
    return { message: "Password updated successfully" };
  }
  return apiClient.post('/auth/update-password', { password, access_token, refresh_token });
}
