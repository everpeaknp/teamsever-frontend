import { api } from './axios';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * Standardized auth response handler
 * Handles multiple backend response formats to prevent future breakage
 */
interface AuthResponse {
  token: string;
  user: {
    _id: string;
    name: string;
    email: string;
    isSuperUser?: boolean;
    profilePicture?: string;
    avatar?: string;
  };
}

/**
 * Normalize auth response from backend
 * Handles both flat and nested response structures
 */
function normalizeAuthResponse(data: any): AuthResponse {
  console.log('🔍 Normalizing auth response:', data);
  
  // Format 1: { token, user: { _id, name, email } } - Current login format
  if (data.token && data.user) {
    console.log('✅ Format 1 detected: token + user object');
    return {
      token: data.token,
      user: {
        _id: data.user._id,
        name: data.user.name,
        email: data.user.email,
        isSuperUser: data.user.isSuperUser || false,
        profilePicture: data.user.profilePicture,
        avatar: data.user.avatar,
      },
    };
  }

  // Format 2: { _id, name, email, token } - Old register format
  if (data.token && data._id && data.name && data.email) {
    console.log('✅ Format 2 detected: flat structure');
    return {
      token: data.token,
      user: {
        _id: data._id,
        name: data.name,
        email: data.email,
      },
    };
  }

  // Format 3: Nested in data property
  if (data.data) {
    console.log('✅ Format 3 detected: nested in data property');
    return normalizeAuthResponse(data.data);
  }

  // If we can't normalize, throw error
  console.error('❌ Could not normalize auth response. Data:', data);
  throw new Error('Invalid auth response format');
}

/**
 * Store auth data in localStorage
 */
function storeAuthData(authData: AuthResponse): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem('authToken', authData.token);
  localStorage.setItem('userId', authData.user._id);
  localStorage.setItem('userName', authData.user.name);
  localStorage.setItem('userEmail', authData.user.email);
  localStorage.setItem('isSuperUser', String(authData.user.isSuperUser || false));
  // Store profile picture so it survives page refresh
  if (authData.user.profilePicture || authData.user.avatar) {
    localStorage.setItem('userAvatar', (authData.user.profilePicture || authData.user.avatar) as string);
  }
  
  // Clean up legacy token keys
  localStorage.removeItem('token');
  
  // Also update the Zustand auth store so components get live user data
  try {
    const setUser = useAuthStore.getState().setUser;
    setUser({
      _id: authData.user._id,
      name: authData.user.name,
      email: authData.user.email,
      profilePicture: authData.user.profilePicture,
      avatar: authData.user.avatar,
    });
  } catch (e) {
    // Non-critical - store will rehydrate from localStorage persist on next render
  }

  // Dispatch custom event to notify socket context
  window.dispatchEvent(new CustomEvent('auth-token-updated', { 
    detail: { token: authData.token } 
  }));
}

/**
 * Clear auth data from localStorage
 */
export function clearAuthData(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem('authToken');
  localStorage.removeItem('userId');
  localStorage.removeItem('userName');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('isSuperUser');
  localStorage.removeItem('token');
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('authToken');
}

/**
 * Get current user data from localStorage
 */
export function getCurrentUser() {
  if (typeof window === 'undefined') return null;

  const token = localStorage.getItem('authToken');
  if (!token) return null;

  return {
    id: localStorage.getItem('userId'),
    name: localStorage.getItem('userName'),
    email: localStorage.getItem('userEmail'),
    isSuperUser: localStorage.getItem('isSuperUser') === 'true',
  };
}

/**
 * Register a new user
 */
export async function register(name: string, email: string, password: string): Promise<void> {
  try {
    const response = await api.post('/auth/register', { name, email, password });
    const authData = normalizeAuthResponse(response.data);
    storeAuthData(authData);
  } catch (error: any) {
    console.error('Registration error:', error);
    throw new Error(error.response?.data?.message || 'Registration failed');
  }
}

/**
 * Login an existing user
 */
export async function login(email: string, password: string): Promise<void> {
  try {
    console.log('🔐 Attempting login...');
    const response = await api.post('/auth/login', { email, password });
    console.log('✅ Login response received:', response.data);
    
    const authData = normalizeAuthResponse(response.data);
    console.log('✅ Auth data normalized:', authData);
    
    storeAuthData(authData);
    console.log('✅ Auth data stored in localStorage');
  } catch (error: any) {
    console.error('❌ Login error:', error);
    console.error('❌ Error response:', error.response?.data);
    console.error('❌ Error status:', error.response?.status);
    throw new Error(error.response?.data?.message || 'Login failed');
  }
}

/**
 * Login with Google
 */
export async function loginWithGoogle(idToken: string): Promise<void> {
  try {
    console.log('🔐 Attempting Google login...');
    console.log('📝 ID Token length:', idToken.length);
    console.log('📝 ID Token preview:', idToken.substring(0, 50) + '...');
    
    const response = await api.post('/auth/google', { idToken });
    console.log('✅ Google login response received:', response.data);
    
    const authData = normalizeAuthResponse(response.data);
    console.log('✅ Auth data normalized:', authData);
    
    storeAuthData(authData);
    console.log('✅ Auth data stored in localStorage');
  } catch (error: any) {
    console.error('❌ Google login error:', error);
    console.error('❌ Error response:', error.response?.data);
    console.error('❌ Error status:', error.response?.status);
    console.error('❌ Error message:', error.response?.data?.message);
    console.error('❌ Full error object:', JSON.stringify(error.response?.data, null, 2));
    
    // Show the actual backend error message
    const backendMessage = error.response?.data?.message || error.response?.data?.error || 'Google login failed';
    throw new Error(backendMessage);
  }
}

/**
 * Request a password reset email for the given address.
 * The backend should respond with 200 regardless of whether the email exists.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  try {
    await api.post('/auth/forgot-password', { email });
  } catch (error: any) {
    const status = error.response?.status;
    const data = error.response?.data;

    if (
      status === 404 &&
      typeof data === 'string' &&
      data.includes('Cannot POST') &&
      data.includes('/api/auth/forgot-password')
    ) {
      throw new Error('Password reset is not implemented on the backend (missing POST /api/auth/forgot-password).');
    }

    throw new Error(error.response?.data?.message || 'Failed to send reset email');
  }
}

export async function resetPassword(token: string, password: string): Promise<void> {
  try {
    await api.post('/auth/reset-password', { token, password });
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to reset password');
  }
}

/**
 * Logout the current user
 */
export function logout(): void {
  clearAuthData();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}
