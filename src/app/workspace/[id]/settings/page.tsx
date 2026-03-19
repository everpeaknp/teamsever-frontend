'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/axios';
import { usePermissions } from '@/store/useAuthStore';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Loader2,
  Trash2,
  Settings as SettingsIcon,
  Upload,
  Image as ImageIcon,
  Save,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

export default function GeneralSettingsPage() {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.id as string;
  const { isOwner } = usePermissions();

  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceLogo, setWorkspaceLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [isDeletingSession, setIsDeletingSession] = useState(false);
  const [isFinalDeleting, setIsFinalDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  useEffect(() => {
    fetchWorkspace();
  }, [workspaceId]);

  const fetchWorkspace = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/workspaces/${workspaceId}`);
      const workspace = response.data.data;
      setWorkspaceName(workspace.name);
      setWorkspaceLogo(workspace.logo || null);
    } catch (error: any) {
      console.error('Failed to fetch workspace:', error);
      toast.error('Failed to load workspace settings');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim()) return;

    try {
      setSaving(true);
      await api.put(`/workspaces/${workspaceId}`, {
        name: workspaceName.trim(),
      });
      toast.success('Workspace updated successfully');
      window.dispatchEvent(new CustomEvent('workspace-updated'));
    } catch (error: any) {
      console.error('Failed to update workspace:', error);
      toast.error(error.response?.data?.message || 'Failed to update workspace');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    try {
      setUploadingLogo(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.patch(`/workspaces/${workspaceId}/logo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const newLogo = response.data.data.logo;
      setWorkspaceLogo(newLogo);
      toast.success('Workspace logo updated successfully');
      window.dispatchEvent(new CustomEvent('workspace-updated'));
    } catch (error: any) {
      console.error('Failed to upload logo:', error);
      toast.error(error.response?.data?.message || 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (deleteConfirm !== workspaceName) {
      toast.error('Please type the workspace name exactly to confirm');
      return;
    }

    try {
      setIsFinalDeleting(true);
      await api.delete(`/workspaces/${workspaceId}`);
      toast.success('Workspace deleted successfully');
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Failed to delete workspace:', error);
      toast.error(error.response?.data?.message || 'Failed to delete workspace');
    } finally {
      setIsFinalDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isOwner()) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center px-4">
        <SettingsIcon className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground max-w-sm">
          Only the workspace owner can manage general settings and branding.
        </p>
        <Button variant="outline" className="mt-6" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Workspace Settings</h1>
              <p className="text-sm text-muted-foreground">General settings, branding and management</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex items-center gap-2 border-b border-border">
          <button className="px-4 py-2 border-b-2 border-primary text-primary font-medium">General</button>
          <button 
            onClick={() => router.push(`/workspace/${workspaceId}/settings/members`)}
            className="px-4 py-2 text-muted-foreground hover:text-foreground font-medium transition-colors"
          >
            Members
          </button>
          <button 
            onClick={() => router.push(`/workspace/${workspaceId}/settings/permissions`)}
            className="px-4 py-2 text-muted-foreground hover:text-foreground font-medium transition-colors"
          >
            Permissions
          </button>
        </div>

        {/* Branding Section */}
        <section className="bg-card rounded-xl shadow-sm border border-border p-6 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <ImageIcon className="w-24 h-24" />
          </div>
          
          <h3 className="text-lg font-semibold mb-6">Workspace Branding</h3>
          
          <div className="flex flex-col sm:flex-row items-center gap-8 relative z-10">
            <div className="relative group">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-2 border-dashed border-border flex items-center justify-center overflow-hidden shadow-inner">
                {workspaceLogo ? (
                  <img src={workspaceLogo} alt="Workspace Logo" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-3xl font-bold text-muted-foreground/30">
                    {workspaceName.charAt(0) || 'W'}
                  </div>
                )}
                
                {uploadingLogo && (
                  <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                )}
              </div>
              
              <label className="absolute -bottom-2 -right-2 p-2 bg-primary text-primary-foreground rounded-full shadow-lg cursor-pointer hover:scale-110 transition-transform">
                <Upload className="w-4 h-4" />
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo}
                />
              </label>
            </div>

            <div className="flex-1 space-y-1">
              <h4 className="font-medium">Logo</h4>
              <p className="text-sm text-muted-foreground pb-4">
                Recommended: Square image, max 5MB. This logo will appear in the sidebar and dashboard.
              </p>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-[10px] uppercase">PNG</Badge>
                <Badge variant="outline" className="text-[10px] uppercase">JPG</Badge>
                <Badge variant="outline" className="text-[10px] uppercase">GIF</Badge>
              </div>
            </div>
          </div>
        </section>

        {/* General Details Section */}
        <section className="bg-card rounded-xl shadow-sm border border-border p-6">
          <h3 className="text-lg font-semibold mb-6">General Details</h3>
          
          <form onSubmit={handleUpdateWorkspace} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="name">Workspace Name</Label>
              <Input
                id="name"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="Enter workspace name"
                required
                className="min-h-[44px]"
              />
            </div>
            
            <Button type="submit" disabled={saving || !workspaceName.trim()} className="min-h-[44px]">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </form>
        </section>

        {/* Danger Zone Section */}
        <section className="bg-card rounded-xl shadow-sm border border-destructive/20 p-6">
          <div className="flex items-center gap-2 text-destructive mb-6">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="text-lg font-semibold">Danger Zone</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-destructive/5 border border-destructive/10">
              <div className="space-y-1">
                <h4 className="font-bold text-destructive">Delete Workspace</h4>
                <p className="text-sm text-muted-foreground max-w-lg">
                  Once you delete a workspace, there is no going back. All spaces, lists, tasks, and data will be permanently removed.
                </p>
              </div>
              <Button 
                variant="destructive" 
                onClick={() => setIsDeletingSession(!isDeletingSession)}
                className="min-h-[44px]"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Workspace
              </Button>
            </div>

            {isDeletingSession && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-lg border border-destructive/20 bg-destructive/5 space-y-4 mt-4"
              >
                <p className="text-sm font-medium">To confirm deletion, please type <span className="font-bold underline">"{workspaceName}"</span> below:</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input 
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder={workspaceName}
                    className="flex-1 min-h-[44px]"
                  />
                  <Button 
                    variant="destructive" 
                    disabled={deleteConfirm !== workspaceName || isFinalDeleting}
                    onClick={handleDeleteWorkspace}
                    className="px-8 min-h-[44px]"
                  >
                    {isFinalDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Confirm Delete
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
