'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Square, Folder, Hash, Palette } from 'lucide-react';
import { useModalStore } from '@/store/useModalStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useSpaceStore } from '@/store/useSpaceStore';
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
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Form schema
const createItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  color: z.string().optional(),
});

type CreateItemFormValues = z.infer<typeof createItemSchema>;

// Color options
const COLORS = [
  { name: 'Blue', value: '#3B82F6', class: 'bg-blue-500' },
  { name: 'Purple', value: '#8B5CF6', class: 'bg-purple-500' },
  { name: 'Pink', value: '#EC4899', class: 'bg-pink-500' },
  { name: 'Red', value: '#EF4444', class: 'bg-red-500' },
  { name: 'Orange', value: '#F97316', class: 'bg-orange-500' },
  { name: 'Amber', value: '#F59E0B', class: 'bg-amber-500' },
  { name: 'Green', value: '#10B981', class: 'bg-green-500' },
  { name: 'Teal', value: '#14B8A6', class: 'bg-teal-500' },
  { name: 'Cyan', value: '#06B6D4', class: 'bg-cyan-500' },
  { name: 'Slate', value: '#64748B', class: 'bg-slate-500' },
];

export function CreateItemModal() {
  const { isOpen, type, parentId, parentType, parentName, spaceId, closeModal, onSuccess } = useModalStore();
  const { addSpace, addFolder, addList } = useWorkspaceStore();
  const spaceStore = useSpaceStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedColor, setSelectedColor] = useState(COLORS[0].value);

  const form = useForm<CreateItemFormValues>({
    resolver: zodResolver(createItemSchema),
    defaultValues: {
      name: '',
      color: COLORS[0].value,
    },
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: '',
        color: COLORS[0].value,
      });
      setSelectedColor(COLORS[0].value);
    }
  }, [isOpen, form]);

  // Get modal title and description
  const getModalContent = () => {
    switch (type) {
      case 'space':
        return {
          title: 'Create new Space',
          description: parentName
            ? `Create a new space in ${parentName}`
            : 'Create a new space in your workspace',
          icon: <Square className="h-5 w-5 text-blue-500" />,
          placeholder: 'Space name',
        };
      case 'folder':
        return {
          title: 'Create new Folder',
          description: parentName
            ? `Create a new folder in ${parentName}`
            : 'Create a new folder',
          icon: <Folder className="h-5 w-5 text-amber-500" />,
          placeholder: 'Folder name',
        };
      case 'list':
        return {
          title: 'Create new List',
          description: parentName
            ? `Create a new list in ${parentName}`
            : 'Create a new list',
          icon: <Hash className="h-5 w-5 text-slate-500" />,
          placeholder: 'List name',
        };
      default:
        return {
          title: 'Create new item',
          description: 'Create a new item',
          icon: null,
          placeholder: 'Item name',
        };
    }
  };

  // Get API endpoint
  const getEndpoint = () => {
    switch (type) {
      case 'space':
        return `/workspaces/${parentId}/spaces`;
      case 'folder':
        return `/spaces/${parentId}/folders`;
      case 'list':
        // Lists are always created at the space level
        if (parentType === 'space') {
          return `/spaces/${parentId}/lists`;
        } else if (parentType === 'folder') {
          // Use spaceId from modal store
          return `/spaces/${spaceId}/lists`;
        }
        return `/spaces/${parentId}/lists`;
      default:
        return '';
    }
  };

  // Handle form submission
  const onSubmit = async (values: CreateItemFormValues) => {
    if (!parentId || !type) return;

    setIsSubmitting(true);

    try {
      const endpoint = getEndpoint();
      const payload: any = {
        name: values.name,
        ...(values.color && { color: selectedColor }),
      };

      // If creating a list inside a folder, add folderId to payload
      if (type === 'list' && parentType === 'folder') {
        payload.folderId = parentId;
      }

      const response = await api.post(endpoint, payload);
      const createdItem = response.data.data;

      // Optimistic update to global store
      if (type === 'space') {
        addSpace({
          ...createdItem,
          type: 'space',
          folders: [],
          listsWithoutFolder: [],
        });
        toast.success('Space created successfully!');
      } else if (type === 'folder') {
        addFolder(parentId, {
          ...createdItem,
          type: 'folder',
          lists: [],
        });
        toast.success('Folder created successfully!');
      } else if (type === 'list') {
        const folderId = parentType === 'folder' ? parentId : undefined;
        const spaceIdForList = parentType === 'space' ? parentId : createdItem.space;
        
        console.log('[CreateItemModal] Creating list with:', {
          parentType,
          parentId,
          folderId,
          createdItem
        });
        
        // Ensure the list object has the folderId
        const listWithFolder = {
          ...createdItem,
          type: 'list',
          folderId: folderId, // Explicitly add folderId
        };
        
        console.log('[CreateItemModal] List with folder:', listWithFolder);
        
        // Update workspace store (for sidebar)
        addList(spaceIdForList, listWithFolder, folderId);
        
        // Also update space store (for space page instant display)
        console.log('[CreateItemModal] Calling spaceStore.addListOptimistic');
        spaceStore.addListOptimistic(listWithFolder);
        
        toast.success('List created successfully!');
      }

      // Success - close modal
      closeModal();
      form.reset();
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error(`Failed to create ${type}:`, error);
      
      // Check for limit errors
      const errorCode = error.response?.data?.code;
      const errorMessage = error.response?.data?.message;
      
      if (errorCode === 'SPACE_LIMIT_REACHED' || 
          errorCode === 'LIST_LIMIT_REACHED' || 
          errorCode === 'FOLDER_LIMIT_REACHED') {
        toast.error(errorMessage || `You've reached your ${type} limit. Please upgrade your plan.`);
      } else {
        toast.error(errorMessage || `Failed to create ${type}`);
      }
      
      // Set form error
      form.setError('name', {
        type: 'manual',
        message: errorMessage || `Failed to create ${type}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = getModalContent();

  // Only render for create types, not edit types
  if (type !== 'space' && type !== 'folder' && type !== 'list') {
    return null;
  }

  return (
    <Dialog open={isOpen && (type === 'space' || type === 'folder' || type === 'list')} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {modalContent.icon}
            <DialogTitle>{modalContent.title}</DialogTitle>
          </div>
          <DialogDescription>{modalContent.description}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Name Field */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={modalContent.placeholder}
                      autoFocus
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Color Picker - Only show for folders */}
            {type === 'folder' && (
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Color (Optional)
                    </FormLabel>
                    <FormControl>
                      <div className="flex flex-wrap gap-2">
                        {COLORS.map((color) => (
                          <button
                            key={color.value}
                            type="button"
                            onClick={() => {
                              setSelectedColor(color.value);
                              field.onChange(color.value);
                            }}
                            className={cn(
                              'h-8 w-8 rounded-md transition-all',
                              color.class,
                              selectedColor === color.value
                                ? 'ring-2 ring-offset-2 ring-slate-900 scale-110'
                                : 'hover:scale-105'
                            )}
                            title={color.name}
                          />
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                    Creating...
                  </>
                ) : (
                  `Create ${type}`
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
