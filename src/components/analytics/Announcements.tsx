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
  isAdmin: boolean;
}

export function Announcements({ workspaceId, isAdmin }: AnnouncementsProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchAnnouncements = async () => {
    try {
      const res = await api.get(`/workspaces/${workspaceId}/announcements`);
      setAnnouncements(res.data.data || []);
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
      toast.error('Failed to load announcements');
    }
  };

  const handlePost = async () => {
    if (!text.trim()) {
      toast.error('Please enter an announcement');
      return;
    }

    try {
      setLoading(true);
      await api.post(`/workspaces/${workspaceId}/announcements`, { content: text });
      setText('');
      toast.success('Announcement posted');
      fetchAnnouncements();
    } catch (error: any) {
      console.error('Failed to post announcement:', error);
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
      console.error('Failed to delete announcement:', error);
      toast.error(error.response?.data?.message || 'Failed to delete announcement');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handlePost();
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [workspaceId]);

  return (
    <Card className="h-[400px] flex flex-col">
      <CardHeader className="flex flex-row items-center gap-2 pb-3">
        <Megaphone className="w-5 h-5 text-primary" />
        <CardTitle className="text-lg">Team Announcements</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-4 px-6 pb-6">
        {isAdmin && (
          <div className="flex gap-2 mb-4 sticky top-0 bg-background z-10 pb-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Broadcast to team..."
              disabled={loading}
            />
            <Button onClick={handlePost} disabled={loading || !text.trim()}>
              Post
            </Button>
          </div>
        )}
        
        {announcements.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Megaphone className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p>No announcements yet</p>
            {isAdmin && <p className="text-xs mt-1">Be the first to post!</p>}
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
                    <p className="text-sm font-medium mb-1">{announcement.content}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="font-medium">{announcement.author.name}</span>
                      <span>•</span>
                      <span>{new Date(announcement.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  {isAdmin && (
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
