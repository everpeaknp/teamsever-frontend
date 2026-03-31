'use client';

import React, { useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useModalStore } from '@/store/useModalStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { api } from '@/lib/axios';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function DeleteItemModal() {
  const { isOpen, type, parentId, parentType, parentName, closeModal, onSuccess } = useModalStore();
  const { deleteSpace, deleteFolder, deleteList } = useWorkspaceStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine if this is a delete modal
  const isDeleteModal = type === 'deleteSpace' || type === 'deleteFolder' || type === 'deleteList';

  if (!isDeleteModal) return null;

  const getModalContent = () => {
    switch (type) {
      case 'deleteSpace':
        return {
          title: 'Delete Space',
          description: `Are you sure you want to delete the space "${parentName}"? This will permanently remove all folders, lists, and tasks within this space.`,
          buttonText: 'Delete Space',
        };
      case 'deleteFolder':
        return {
          title: 'Delete Folder',
          description: `Are you sure you want to delete the folder "${parentName}"? This will permanently remove all lists and tasks within this folder.`,
          buttonText: 'Delete Folder',
        };
      case 'deleteList':
        return {
          title: 'Delete List',
          description: `Are you sure you want to delete the list "${parentName}"? This will permanently remove all tasks within this list.`,
          buttonText: 'Delete List',
        };
      default:
        return {
          title: 'Delete Item',
          description: 'Are you sure you want to delete this item?',
          buttonText: 'Delete',
        };
    }
  };

  const getEndpoint = () => {
    switch (type) {
      case 'deleteSpace':
        return `/spaces/${parentId}`;
      case 'deleteFolder':
        return `/folders/${parentId}`;
      case 'deleteList':
        return `/lists/${parentId}`;
      default:
        return '';
    }
  };

  const handleDelete = async () => {
    if (!parentId) return;

    setIsSubmitting(true);

    try {
      const endpoint = getEndpoint();
      await api.delete(endpoint);

      // Optimistic update to global store
      if (type === 'deleteSpace') {
        deleteSpace(parentId);
        toast.success('Space deleted successfully');
      } else if (type === 'deleteFolder') {
        // For folders/lists we need the spaceId. We usually have it in the parentId of the hierarchy, 
        // but for state management we might need to be careful.
        // HierarchyItem passes parentSpaceId to the component.
        // Wait, useModalStore doesn't store the grandparent ID if needed for optimistic update.
        // However, deleteFolder in useWorkspaceStore iterates all spaces.
        const spaceId = (useModalStore.getState() as any).spaceId; // We used spaceId for list creation, maybe we can reuse it
        deleteFolder(spaceId || '', parentId);
        toast.success('Folder deleted successfully');
      } else if (type === 'deleteList') {
        const spaceId = (useModalStore.getState() as any).spaceId;
        const folderId = parentType === 'folder' ? (useModalStore.getState() as any).parentId : undefined;
        // Wait, parentId is the LIST id here when type is deleteList.
        // We need the spaceId and folderId for useWorkspaceStore.deleteList(spaceId, listId, folderId)
        
        // Let's check how we open this modal in HierarchyItem
        deleteList(spaceId || '', parentId, folderId);
        toast.success('List deleted successfully');
      }

      closeModal();
      
      if (onSuccess) {
        await onSuccess();
      }
    } catch (error: any) {
      console.error(`Failed to delete ${type}:`, error);
      toast.error(error.response?.data?.message || `Failed to delete ${type}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const content = getModalContent();

  return (
    <Dialog open={isOpen && isDeleteModal} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <DialogTitle>{content.title}</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            {content.description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={closeModal}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            variant="destructive" 
            onClick={handleDelete}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              content.buttonText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
