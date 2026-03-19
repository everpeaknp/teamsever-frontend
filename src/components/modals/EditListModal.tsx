'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Hash } from 'lucide-react';
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

const editListSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
});

type EditListFormValues = z.infer<typeof editListSchema>;

export function EditListModal() {
  const { isOpen, type, parentId, closeModal, onSuccess } = useModalStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<EditListFormValues>({
    resolver: zodResolver(editListSchema),
    defaultValues: {
      name: '',
    },
  });

  useEffect(() => {
    if (isOpen && type === 'editList' && parentId) {
      fetchListData();
    }
  }, [isOpen, type, parentId]);

  const fetchListData = async () => {
    if (!parentId) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/lists/${parentId}`);
      const list = response.data.data;
      
      form.reset({
        name: list.name,
      });
    } catch (error) {
      console.error('Failed to fetch list data:', error);
      toast.error('Failed to load list data');
      closeModal();
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: EditListFormValues) => {
    if (!parentId) return;

    setIsSubmitting(true);

    try {
      await api.patch(`/lists/${parentId}`, {
        name: values.name,
      });

      toast.success('List renamed successfully!');
      
      closeModal();
      form.reset();
      
      if (onSuccess) {
        await onSuccess();
      }
    } catch (error: any) {
      console.error('Failed to update list:', error);
      
      form.setError('name', {
        type: 'manual',
        message: error.response?.data?.message || 'Failed to update list',
      });
      toast.error('Failed to update list');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (type !== 'editList') return null;

  return (
    <Dialog open={isOpen && type === 'editList'} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Hash className="h-5 w-5 text-slate-500" />
            <DialogTitle>Rename List</DialogTitle>
          </div>
          <DialogDescription>
            Update list name
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
                    <FormLabel>List Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter list name"
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
