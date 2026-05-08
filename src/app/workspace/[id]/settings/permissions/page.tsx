"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/axios';
import { usePermissions } from '@/store/useAuthStore';
import {
  ArrowLeft,
  Shield,
  Eye,
  Edit,
  Crown,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { Plan } from '@/types';
import { Button } from '@/components/ui/button';

interface Workspace {
  name: string;
  owner: string;
  logo?: string;
  subscription?: {
    plan: Plan;
  };
}

export default function PermissionsSettings() {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.id as string;
  const { isOwner } = usePermissions();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessControlTier, setAccessControlTier] = useState<'basic' | 'pro' | 'advanced'>('basic');

  useEffect(() => {
    if (!isOwner()) {
      toast.error('Only workspace owners can access permissions settings');
      router.push(`/workspace/${workspaceId}`);
      return;
    }

    fetchWorkspace();
  }, [workspaceId, isOwner, router]);

  const fetchWorkspace = async () => {
    try {
      const response = await api.get(`/workspaces/${workspaceId}`);
      const workspaceData = response.data?.data || response.data;
      setWorkspace(workspaceData);

      const tier = workspaceData?.subscription?.plan?.features?.accessControlTier || 'basic';
      setAccessControlTier(tier);
    } catch (error) {
      console.error('Error fetching workspace:', error);
      toast.error('Failed to load workspace settings');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = (feature: string) => {
    toast.info(`Upgrade to unlock ${feature}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  const isBasicTier = accessControlTier === 'basic';
  const isAdvancedTier = accessControlTier === 'advanced';

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-20">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/workspace/${workspaceId}/settings`)}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Workspace Settings</h1>
              <p className="text-sm text-muted-foreground">
                Manage roles and permissions for {workspace?.name}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex items-center gap-2 border-b border-border">
          <button
            onClick={() => router.push(`/workspace/${workspaceId}/settings`)}
            className="px-4 py-2 text-muted-foreground hover:text-foreground font-medium transition-colors"
          >
            General
          </button>
          <button
            onClick={() => router.push(`/workspace/${workspaceId}/settings/members`)}
            className="px-4 py-2 text-muted-foreground hover:text-foreground font-medium transition-colors"
          >
            Members
          </button>
          <button className="px-4 py-2 border-b-2 border-primary text-primary font-medium">Permissions</button>
        </div>

        <section className="p-4 rounded-xl border border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-foreground font-semibold">
                  {accessControlTier === 'basic' && 'Basic Access Control'}
                  {accessControlTier === 'pro' && 'Pro Access Control'}
                  {accessControlTier === 'advanced' && 'Advanced Access Control'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {accessControlTier === 'basic' && 'Members can be assigned "Full Access" to lists'}
                  {accessControlTier === 'pro' && 'Members can have "Full Access" or "Can Edit" permissions on lists'}
                  {accessControlTier === 'advanced' && 'Full control - assign "Full Access", "Can Edit", or "View Only" permissions'}
                </p>
              </div>
            </div>
            {accessControlTier !== 'advanced' && (
              <Button onClick={() => handleUpgrade('Advanced Access Control')} className="gap-2">
                <Sparkles className="w-4 h-4" />
                Upgrade
              </Button>
            )}
          </div>
        </section>

        <section className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center">
              <Edit className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className="text-foreground font-semibold">List Member Permissions</h3>
              <p className="text-sm text-muted-foreground">Control what members can do with tasks in specific lists</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/30 border border-border rounded-lg">
              <div className="flex items-center gap-3">
                <Crown className="w-5 h-5 text-purple-500" />
                <div>
                  <h4 className="text-foreground font-medium">Full Access</h4>
                  <p className="text-sm text-muted-foreground">Create, edit, and delete tasks</p>
                </div>
              </div>
              <div className="px-3 py-1 bg-green-500/20 text-green-600 text-xs font-medium rounded-full">
                Available
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/30 border border-border rounded-lg">
              <div className="flex items-center gap-3">
                <Edit className="w-5 h-5 text-blue-500" />
                <div>
                  <h4 className="text-foreground font-medium">Can Edit</h4>
                  <p className="text-sm text-muted-foreground">Can change task status only</p>
                </div>
              </div>
              <div className={`px-3 py-1 ${isBasicTier ? 'bg-purple-500/20 text-purple-600' : 'bg-green-500/20 text-green-600'} text-xs font-medium rounded-full`}>
                {isBasicTier ? 'Requires Pro' : 'Available'}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/30 border border-border rounded-lg">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-slate-500" />
                <div>
                  <h4 className="text-foreground font-medium">View Only</h4>
                  <p className="text-sm text-muted-foreground">Can view tasks but cannot edit</p>
                </div>
              </div>
              <div className={`px-3 py-1 ${!isAdvancedTier ? 'bg-purple-500/20 text-purple-600' : 'bg-green-500/20 text-green-600'} text-xs font-medium rounded-full`}>
                {!isAdvancedTier ? 'Requires Advanced' : 'Available'}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
