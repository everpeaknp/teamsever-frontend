'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Square, AlertTriangle } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

// Form schema
const editSpaceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  status: z.enum(['active', 'inactive']),
});

type EditSpaceFormValues = z.infer<typeof editSpaceSchema>;

export function EditSpaceModal() {
  const { isOpen, type, parentId, closeModal, onSuccess } = useModalStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [spaceData, setSpaceData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<EditSpaceFormValues>({
    resolver: zodResolver(editSpaceSchema),
    defaultValues: {
      name: '',
      status: 'active',
    },
  });

  // Fetch space data when modal opens
  useEffect(() => {
    if (isOpen && type === 'editSpace' && parentId) {
      fetchSpaceData();
    }
  }, [isOpen, type, parentId]);

  const fetchSpaceData = async () => {
    if (!parentId) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/spaces/${parentId}`);
      const space = response.data.data;
      setSpaceData(space);
      
      form.reset({
        name: space.name,
        status: space.status || 'active',
      });
    } catch (error) {
      console.error('Failed to fetch space data:', error);
      toast.error('Failed to load space data');
      closeModal();
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission
  const onSubmit = async (values: EditSpaceFormValues) => {
    if (!parentId) return;

    setIsSubmitting(true);

    try {
      const response = await api.patch(`/spaces/${parentId}`, {
        name: values.name,
        status: values.status,
      });

      toast.success('Space updated successfully!');
      
      // Close modal
      closeModal();
      form.reset();
      
      // Call success callback to refresh sidebar
      if (onSuccess) {
        await onSuccess();
      }
    } catch (error: any) {
      console.error('Failed to update space:', error);
      
      form.setError('name', {
        type: 'manual',
        message: error.response?.data?.message || 'Failed to update space',
      });
      toast.error('Failed to update space');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Only render if this is an editSpace modal
  if (type !== 'editSpace') return null;

  return (
    <Dialog open={isOpen && type === 'editSpace'} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Square className="h-5 w-5 text-blue-500" />
            <DialogTitle>Edit Space</DialogTitle>
          </div>
          <DialogDescription>
            Update space name and status
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Name Field */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Space Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter space name"
                        autoFocus
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Status Toggle */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Space Status</FormLabel>
                      <FormDescription>
                        {field.value === 'active' 
                          ? 'Space is active and accessible to members' 
                          : 'Space is inactive and hidden from members'}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value === 'active'}
                        onCheckedChange={(checked) => 
                          field.onChange(checked ? 'active' : 'inactive')
                        }
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Warning for inactive status */}
              {form.watch('status') === 'inactive' && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                      Inactivating this space
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      Members will not be able to access this space or its contents. Lists and tasks will be hidden.
                    </p>
                  </div>
                </div>
              )}

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
