import { api } from '@/lib/axios'

export const useAuth = () => {
  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password })
      const { token } = response.data

      // Store token in localStorage
      localStorage.setItem('authToken', token)

      // Get user data
      const userResponse = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })

      localStorage.setItem('user', JSON.stringify(userResponse.data.data))
      
      return { success: true, user: userResponse.data.data, token }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Login failed',
      }
    }
  }

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await api.post('/auth/register', {
        name,
        email,
        password,
      })
      const { token, user } = response.data

      localStorage.setItem('authToken', token)
      localStorage.setItem('user', JSON.stringify(user))
      
      return { success: true, user, token }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Registration failed',
      }
    }
  }

  const logout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    window.location.href = '/login'
  }

  const getUser = () => {
    if (typeof window === 'undefined') return null
    const userStr = localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  }

  const getToken = () => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('authToken')
  }

  const isAuthenticated = () => {
    return !!getToken()
  }

  return {
    login,
    register,
    logout,
    getUser,
    getToken,
    isAuthenticated,
  }
}
