'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Folder } from 'lucide-react';
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
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const editFolderSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
});

type EditFolderFormValues = z.infer<typeof editFolderSchema>;

export function EditFolderModal() {
  const { isOpen, type, parentId, closeModal, onSuccess } = useModalStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<EditFolderFormValues>({
    resolver: zodResolver(editFolderSchema),
    defaultValues: {
      name: '',
    },
  });

  useEffect(() => {
    if (isOpen && type === 'editFolder' && parentId) {
      fetchFolderData();
    }
  }, [isOpen, type, parentId]);

  const fetchFolderData = async () => {
    if (!parentId) {
      console.error('[EditFolderModal] No parentId provided');
      return;
    }
    
    console.log('[EditFolderModal] Fetching folder data for:', parentId);
    setLoading(true);
    try {
      const response = await api.get(`/folders/${parentId}`);
      console.log('[EditFolderModal] Folder data received:', response.data);
      const folder = response.data.data;
      
      form.reset({
        name: folder.name,
      });
    } catch (error: any) {
      console.error('[EditFolderModal] Failed to fetch folder data:', {
        error,
        response: error.response?.data,
        status: error.response?.status,
        parentId
      });
      toast.error(error.response?.data?.message || 'Failed to load folder data');
      closeModal();
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: EditFolderFormValues) => {
    if (!parentId) return;

    setIsSubmitting(true);

    try {
      const response = await api.put(`/folders/${parentId}`, {
        name: values.name,
      });

      toast.success('Folder renamed successfully!');
      
      closeModal();
      form.reset();
      
      if (onSuccess) {
        await onSuccess();
      }
    } catch (error: any) {
      console.error('Failed to update folder:', error);
      
      form.setError('name', {
        type: 'manual',
        message: error.response?.data?.message || 'Failed to update folder',
      });
      toast.error(error.response?.data?.message || 'Failed to update folder');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (type !== 'editFolder') return null;

  return (
    <Dialog open={isOpen && type === 'editFolder'} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Folder className="h-5 w-5 text-amber-500" />
            <DialogTitle>Rename Folder</DialogTitle>
          </div>
          <DialogDescription>
            Update folder name
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Folder Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter folder name"
                        autoFocus
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
