import { useState, useEffect } from 'react';
import { api } from '@/lib/axios';

interface SubscriptionInfo {
  isPaid: boolean;
  status: 'free' | 'active' | 'expired';
  daysRemaining: number;
  subscriptionExpired: boolean;
  expiresAt: string | null;
  memberCount: number | null;
  billingCycle: 'monthly' | 'annual' | null;
  plan: {
    _id: string;
    name: string;
    price: number;
    features: {
      maxWorkspaces: number;
      maxAdmins: number;
      maxSpaces: number;
      maxLists: number;
      maxFolders: number;
      maxTasks: number;
      hasAccessControl: boolean;
      hasGroupChat: boolean;
      messageLimit: number;
      announcementCooldown: number;
      accessControlTier: string;
    };
  } | null;
  usage: {
    workspaces: number;
    spaces: number;
    lists: number;
    folders: number;
    tasks: number;
  };
}

interface NextPlanInfo {
  hasNextPlan: boolean;
  nextPlan: {
    _id: string;
    name: string;
    price: number;
    features: any;
  } | null;
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [nextPlan, setNextPlan] = useState<NextPlanInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = async () => {
    try {
      // Check if user is authenticated before fetching
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');
        if (!token || token === 'undefined' || token === 'null') {
          // User not authenticated, skip fetch
          setLoading(false);
          return;
        }
      }
      
      setLoading(true);
      const response = await api.get('/subscription/info');
      setSubscription(response.data.data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch subscription:', err);
      setError(err.response?.data?.message || 'Failed to load subscription info');
    } finally {
      setLoading(false);
    }
  };

  const fetchNextPlan = async () => {
    try {
      // Check if user is authenticated before fetching
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');
        if (!token || token === 'undefined' || token === 'null') {
          // User not authenticated, skip fetch
          setNextPlan({ hasNextPlan: false, nextPlan: null });
          return;
        }
      }
      
      const response = await api.get('/subscription/next-plan');
      setNextPlan(response.data.data);
    } catch (err: any) {
      // Silently fail - next plan is optional feature
      // Only log if it's not a 404/403/401/500 error (which are expected)
      if (err.response?.status !== 404 && err.response?.status !== 403 && err.response?.status !== 401 && err.response?.status !== 500) {
        console.error('Unexpected error fetching next plan:', err);
      }
      setNextPlan({ hasNextPlan: false, nextPlan: null });
    }
  };

  useEffect(() => {
    fetchSubscription();
    fetchNextPlan();
  }, []);

  const canCreateWorkspace = () => {
    if (!subscription || !subscription.plan) return true; // Free plan
    const maxWorkspaces = subscription.plan.features.maxWorkspaces;
    return maxWorkspaces === -1 || subscription.usage.workspaces < maxWorkspaces;
  };

  const canInviteMember = (currentMemberCount: number) => {
    if (!subscription) {
      return currentMemberCount < 5; // Free plan default
    }
    
    // Use purchased member count if available (paid users)
    if (subscription.isPaid && subscription.memberCount) {
      return subscription.memberCount === -1 || currentMemberCount < subscription.memberCount;
    }
    
    // Free users: default to 5 members
    return currentMemberCount < 5;
  };

  const hasAccessControl = () => {
    if (!subscription || !subscription.plan) return false;
    return subscription.plan.features.hasAccessControl;
  };

  return {
    subscription,
    nextPlan,
    loading,
    error,
    refetch: fetchSubscription,
    canCreateWorkspace,
    canInviteMember,
    hasAccessControl
  };
}
