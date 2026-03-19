import { create } from 'zustand';
import { api } from '@/lib/axios';

export interface Activity {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  task: {
    _id: string;
    title: string;
    status: string;
  };
  type: 'comment' | 'update';
  content?: string;
  fieldChanged?: string;
  oldValue?: any;
  newValue?: any;
  isSystemGenerated: boolean;
  workspace: string;
  mentions?: string[];
  reactions?: any[];
  createdAt: string;
  updatedAt: string;
}

interface ActivityStore {
  activities: Activity[];
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchActivities: (params: { workspaceId?: string; spaceId?: string; listId?: string }) => Promise<void>;
  clearActivities: () => void;
}

export const useActivityStore = create<ActivityStore>((set, get) => ({
  activities: [],
  loading: false,
  error: null,

  fetchActivities: async (params) => {
    set({ loading: true, error: null });
    try {
      const queryParams = new URLSearchParams();
      if (params.workspaceId) queryParams.append('workspaceId', params.workspaceId);
      if (params.spaceId) queryParams.append('spaceId', params.spaceId);
      if (params.listId) queryParams.append('listId', params.listId);
      
      const response = await api.get(`/activities?${queryParams.toString()}`);
      const activitiesData = response.data.data || [];
      set({ activities: activitiesData, loading: false });
    } catch (error: any) {
      console.error('Failed to fetch activities:', error);
      set({ 
        error: error.response?.data?.message || 'Failed to fetch activities',
        loading: false,
        activities: []
      });
    }
  },

  clearActivities: () => set({ activities: [], error: null }),
}));
