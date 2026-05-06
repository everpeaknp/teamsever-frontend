'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Github, CheckCircle2, Copy } from 'lucide-react';
import { useModalStore } from '@/store/useModalStore';
import { api } from '@/lib/axios';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Form schema
const webhookSchema = z.object({
  githubRepoName: z.string().min(1, 'Repository name is required').max(100, 'Name is too long'),
});

type WebhookFormValues = z.infer<typeof webhookSchema>;

export function GitHubWebhookModal() {
  const { isOpen, type, parentId, closeModal } = useModalStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [webhookData, setWebhookData] = useState<{ webhookUrl: string; secret: string } | null>(null);

  const form = useForm<WebhookFormValues>({
    resolver: zodResolver(webhookSchema),
    defaultValues: {
      githubRepoName: '',
    },
  });

  // Fetch current repo name and webhook details if they exist
  useEffect(() => {
    const fetchWebhookDetails = async () => {
      if (isOpen && type === 'githubWebhook' && parentId) {
        try {
          // Fetch existing webhook details
          const response = await api.get(`/spaces/${parentId}/webhook`);
          const data = response.data.data;
          
          if (data) {
            form.setValue('githubRepoName', data.githubRepoName || '');
            setWebhookData({
              webhookUrl: data.webhookUrl,
              secret: data.secret,
            });
          } else {
            // No webhook yet, fetch space details just for the repo name if needed
            const spaceResponse = await api.get(`/spaces/${parentId}`);
            const space = spaceResponse.data.data;
            if (space.githubRepoName) {
              form.setValue('githubRepoName', space.githubRepoName);
            }
          }
        } catch (error) {
          console.error('Failed to fetch webhook details:', error);
        }
      }
    };

    fetchWebhookDetails();
  }, [isOpen, type, parentId, form]);

  // Handle form submission
  const onSubmit = async (values: WebhookFormValues) => {
    if (!parentId) return;

    setIsSubmitting(true);

    try {
      const response = await api.post(`/spaces/${parentId}/webhook`, {
        githubRepoName: values.githubRepoName,
      });

      setWebhookData({
        webhookUrl: response.data.data.webhookUrl,
        secret: response.data.data.secret,
      });
      
      toast.success('Webhook generated successfully!');
    } catch (error: any) {
      console.error('Failed to generate webhook:', error);
      toast.error(error.response?.data?.message || 'Failed to generate webhook');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const handleClose = () => {
    closeModal();
    // Reset after a short delay so the animation looks smooth
    setTimeout(() => {
      setWebhookData(null);
      form.reset();
    }, 300);
  };

  // Only render if this is the webhook modal
  if (type !== 'githubWebhook') return null;

  return (
    <Dialog open={isOpen && type === 'githubWebhook'} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Github className="h-5 w-5 text-neutral-800 dark:text-neutral-200" />
            <DialogTitle>Connect GitHub Repository</DialogTitle>
          </div>
          <DialogDescription>
            {webhookData 
              ? "Your webhook has been generated! You can use this SAME URL and Secret in multiple repositories to track them all here." 
              : "Link one or more GitHub repositories to this space. You can use the same webhook URL in multiple repos."}
          </DialogDescription>
        </DialogHeader>

        {!webhookData ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="githubRepoName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GitHub Repository Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. everpeaknp/teamsever-backend"
                        autoFocus
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      This is just for your reference to remember which repository is linked.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    form.getValues('githubRepoName') ? 'Update Connection' : 'Generate Webhook'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <div className="space-y-6 py-2">
            <div className="flex items-center justify-center py-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-900">
              <CheckCircle2 className="h-10 w-10 text-green-500 mb-2" />
              <div className="ml-4 flex flex-col">
                <span className="font-semibold text-green-800 dark:text-green-300">Ready to connect!</span>
                <span className="text-sm text-green-600 dark:text-green-400">Go to your GitHub Repo Settings → Webhooks</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Payload URL</label>
                <div className="flex gap-2">
                  <Input readOnly value={webhookData.webhookUrl} className="font-mono text-xs bg-muted" />
                  <Button type="button" variant="outline" size="icon" onClick={() => handleCopy(webhookData.webhookUrl, 'URL')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Secret</label>
                <div className="flex gap-2">
                  <Input readOnly value={webhookData.secret} className="font-mono text-xs bg-muted" />
                  <Button type="button" variant="outline" size="icon" onClick={() => handleCopy(webhookData.secret, 'Secret')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button type="button" variant="ghost" onClick={() => setWebhookData(null)} className="w-full sm:w-auto text-muted-foreground text-xs">
                Regenerate Credentials
              </Button>
              <Button type="button" onClick={handleClose} className="w-full sm:flex-1">
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
