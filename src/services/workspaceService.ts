import { api } from '@/lib/axios'

export const workspaceService = {
  // Get all workspaces
  getWorkspaces: async () => {
    const response = await api.get('/workspaces')
    return response.data
  },

  // Get single workspace
  getWorkspace: async (id: string) => {
    const response = await api.get(`/workspaces/${id}`)
    return response.data
  },

  // Create workspace
  createWorkspace: async (name: string) => {
    const response = await api.post('/workspaces', { name })
    return response.data
  },

  // Update workspace
  updateWorkspace: async (id: string, name: string) => {
    const response = await api.put(`/workspaces/${id}`, { name })
    return response.data
  },

  // Delete workspace
  deleteWorkspace: async (id: string) => {
    const response = await api.delete(`/workspaces/${id}`)
    return response.data
  },

  // Send invitation
  sendInvitation: async (workspaceId: string, email: string, role: string) => {
    const response = await api.post(`/workspaces/${workspaceId}/invites`, {
      email,
      role,
    })
    return response.data
  },

  // Get workspace invitations
  getInvitations: async (workspaceId: string) => {
    const response = await api.get(`/workspaces/${workspaceId}/invites`)
    return response.data
  },
}
