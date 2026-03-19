import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      // Skip token validation for auth endpoints (login, register, google)
      const isAuthEndpoint =
        config.url?.includes('/auth/login') ||
        config.url?.includes('/auth/register') ||
        config.url?.includes('/auth/google') ||
        config.url?.includes('/auth/forgot-password') ||
        config.url?.includes('/auth/reset-password');
      
      if (isAuthEndpoint) {
        // Allow auth requests to proceed without token
        return config;
      }
      
      // Try both 'token' and 'authToken' for backwards compatibility
      let token = localStorage.getItem('token');
      if (!token || token === 'undefined' || token === 'null') {
        token = localStorage.getItem('authToken');
      }
      
      // STRICT VALIDATION: Block request if token is invalid
      // This prevents "jwt malformed" errors on backend
      if (!token || 
          token === 'undefined' || 
          token === 'null' || 
          token.trim() === '' ||
          token === 'Bearer undefined' ||
          token === 'Bearer null') {
        
        // Clear ALL invalid tokens silently
        localStorage.removeItem('token');
        localStorage.removeItem('authToken');
        localStorage.removeItem('userId');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
        
        // DON'T redirect during payment verification - let the page handle it
        const currentPath = window.location.pathname;
        const isPaymentPage = currentPath.includes('/payment/success') || currentPath.includes('/payment/failure');
        const isPublicPage =
          currentPath.includes('/login') ||
          currentPath.includes('/register') ||
          currentPath.includes('/auth/forgot-password') ||
          currentPath.includes('/auth/reset-password') ||
          currentPath === '/';
        
        if (!isPaymentPage && !isPublicPage) {
          window.location.href = '/login';
        }
        
        // Reject the request silently
        return Promise.reject(new Error('No valid authentication token'));
      }
      
      // Add valid token to headers
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized errors
    if (error.response?.status === 401) {
      // Don't log for expected 401s on super-admin endpoints
      const isExpectedUnauth = 
        error.config?.url?.includes('/super-admin/settings') ||
        error.config?.url?.includes('/subscription/next-plan');
      
      // Clear all auth data from localStorage only if not on expected endpoints
      if (typeof window !== 'undefined' && !isExpectedUnauth) {
        localStorage.removeItem('token');
        localStorage.removeItem('authToken');
        localStorage.removeItem('userId');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
        
        // DON'T redirect during payment verification - let the page handle it
        const currentPath = window.location.pathname;
        const isPaymentPage = currentPath.includes('/payment/success') || currentPath.includes('/payment/failure');
        const isPublicPage =
          currentPath.includes('/login') ||
          currentPath.includes('/register') ||
          currentPath.includes('/auth/forgot-password') ||
          currentPath.includes('/auth/reset-password') ||
          currentPath === '/';
        
        if (!isPaymentPage && !isPublicPage) {
          window.location.href = '/login';
        }
      }
      
      // DO NOT retry the request - reject immediately
      return Promise.reject(error);
    }
    
    // Don't log expected errors or auth token errors
    const isExpectedError = 
      error.message === 'No valid authentication token' ||
      error.config?.url?.includes('/super-admin/settings') ||
      error.config?.url?.includes('/subscription/next-plan') ||
      (error.response?.status === 403 && error.config?.url?.includes('/super-admin/')) ||
      (error.response?.status === 500 && (
        error.config?.url?.includes('/super-admin/settings') ||
        error.config?.url?.includes('/subscription/next-plan')
      ));
    
    // DO NOT retry on 4xx errors (client errors)
    if (error.response?.status >= 400 && error.response?.status < 500) {
      return Promise.reject(error);
    }
    
    return Promise.reject(error);
  }
)
