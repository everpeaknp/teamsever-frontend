'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Megaphone, Trash2 } from 'lucide-react';
import { api } from '@/lib/axios';
import { toast } from 'sonner';

interface Announcement {
  _id: string;
  subject?: string;
  body?: string;
  content: string;
  author: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  createdAt: string;
}

interface AnnouncementsProps {
  workspaceId: string;
  canCreateAnnouncement: boolean;
  canDeleteAnnouncement: boolean;
  initialAnnouncements?: Announcement[];
  managedByParent?: boolean;
}

export function Announcements({
  workspaceId,
  canCreateAnnouncement,
  canDeleteAnnouncement,
  initialAnnouncements = [],
  managedByParent = false,
}: AnnouncementsProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchAnnouncements = async () => {
    try {
      const res = await api.get(`/v2/workspaces/${workspaceId}/analytics/announcements?page=1&limit=20`);
      setAnnouncements(res.data?.data?.items || []);
    } catch (error) {
      toast.error('Failed to load announcements');
    }
  };

  const handlePost = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error('Please enter a subject and body');
      return;
    }

    try {
      setLoading(true);
      await api.post(`/workspaces/${workspaceId}/announcements`, {
        subject: subject.trim(),
        body: body.trim(),
      });
      setSubject('');
      setBody('');
      setComposerOpen(false);
      toast.success('Announcement posted');
      fetchAnnouncements();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to post announcement');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (announcementId: string) => {
    try {
      await api.delete(`/workspaces/${workspaceId}/announcements/${announcementId}`);
      toast.success('Announcement deleted');
      fetchAnnouncements();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete announcement');
    }
  };

  useEffect(() => {
    if (managedByParent) {
      setAnnouncements(initialAnnouncements);
      return;
    }
    if (initialAnnouncements.length > 0) {
      setAnnouncements(initialAnnouncements);
      return;
    }
    fetchAnnouncements();
  }, [workspaceId, initialAnnouncements]);

  return (
    <Card className="h-[400px] flex flex-col">
      <CardHeader className="flex flex-row items-center gap-2 pb-3">
        <Megaphone className="w-5 h-5 text-primary" />
        <CardTitle className="text-lg">Team Announcements</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-4 px-6 pb-6">
        {canCreateAnnouncement && (
          <div className="mb-4 sticky top-0 bg-background z-10 pb-2">
            <Button onClick={() => setComposerOpen(true)} disabled={loading}>
              New announcement
            </Button>
          </div>
        )}

        {composerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-lg bg-background p-6 shadow-xl">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-semibold">New announcement</h2>
                <Button
                  variant="ghost"
                  onClick={() => setComposerOpen(false)}
                  disabled={loading}
                >
                  Close
                </Button>
              </div>
              <div className="space-y-4">
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject"
                  disabled={loading}
                />
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write the announcement body..."
                  disabled={loading}
                  rows={8}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setComposerOpen(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePost}
                  disabled={loading || !subject.trim() || !body.trim()}
                >
                  {loading ? 'Posting...' : 'Post announcement'}
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {announcements.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Megaphone className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p>No announcements yet</p>
            {canCreateAnnouncement && <p className="text-xs mt-1">Be the first to post!</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((announcement) => (
              <div
                key={announcement._id}
                className="group relative p-3 bg-muted rounded-lg border-l-4 border-primary"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    {announcement.subject?.trim() && (
                      <p className="text-sm font-semibold mb-1">{announcement.subject}</p>
                    )}
                    <p className="text-sm font-medium mb-1">
                      {announcement.body || announcement.content}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="font-medium">{announcement.author.name}</span>
                      <span>•</span>
                      <span>{new Date(announcement.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  {canDeleteAnnouncement && (
                    <button
                      onClick={() => handleDelete(announcement._id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded"
                      title="Delete announcement"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
