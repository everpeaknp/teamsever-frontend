'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/axios';
import { Editor } from '@/components/docs/Editor';
import { ArrowLeft, Loader2, Save, MoreVertical, Trash2, Archive } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import debounce from 'lodash.debounce';
import { DocumentPatch, DocumentSaveQueue } from '@/lib/documentSaveQueue';

interface Document {
  _id: string;
  title: string;
  content: any;
  icon: string;
  coverImage?: string;
  owner: {
    _id: string;
    name: string;
    email: string;
  };
  workspace?: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
  capabilities: {
    canEdit: boolean;
    canArchive: boolean;
  };
}

export default function DocumentPage() {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.id as string;
  const docId = params.docId as string;

  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('📄');
  const saveQueue = useRef<DocumentSaveQueue | null>(null);

  const writeDocument = useCallback(async (patch: DocumentPatch, expectedRevision: number) => {
    setSaving(true);
    setSaveError(null);
    try {
      const response = await api.patch(`/docs/${docId}`, { ...patch, expectedRevision });
      const updated = response.data.data as Document;
      setDocument((current) => current ? { ...current, ...updated } : updated);
      return updated.revision;
    } catch (requestError: any) {
      const isConflict = requestError.response?.status === 409;
      setSaveError(isConflict
        ? 'This document changed elsewhere. Reload before saving again.'
        : requestError.response?.data?.message || 'Changes could not be saved.');
      throw requestError;
    } finally {
      setSaving(false);
    }
  }, [docId]);

  const flushPending = useCallback(async () => {
    saveDebounced.flush();
    await saveQueue.current?.flush();
  // saveDebounced is stable for the lifetime of writeDocument.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [writeDocument]);

  const saveDebounced = useMemo(() => debounce(() => {
    void saveQueue.current?.flush().catch(() => undefined);
  }, 700), [writeDocument]);

  const enqueuePatch = useCallback((patch: DocumentPatch) => {
    if (!document?.capabilities.canEdit) return;
    saveQueue.current?.enqueue(patch);
    setSaving(true);
    setSaveError(null);
    saveDebounced();
  }, [document?.capabilities.canEdit, saveDebounced]);

  useEffect(() => {
    fetchDocument();
  }, [docId]);

  const fetchDocument = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/docs/${docId}`);
      const doc = response.data.data;
      setDocument(doc);
      saveQueue.current = new DocumentSaveQueue(doc.revision || 1, writeDocument);
      setTitle(doc.title);
      setIcon(doc.icon);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    enqueuePatch({ title: newTitle });
  };

  const handleIconChange = () => {
    const newIcon = window.prompt('Enter an emoji:', icon);
    if (newIcon) {
      setIcon(newIcon);
      enqueuePatch({ icon: newIcon });
    }
  };

  const handleArchive = async () => {
    if (!confirm('Archive this document?')) return;
    try {
      await flushPending();
      await api.delete(`/docs/${docId}`);
      router.push(`/workspace/${workspaceId}/docs`);
    } catch (requestError: any) {
      setSaveError(requestError.response?.data?.message || 'Failed to archive document');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await api.delete(`/docs/${docId}`);
      router.push(`/workspace/${workspaceId}/docs`);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete document');
    }
  };

  useEffect(() => {
    const warnAboutPendingChanges = (event: BeforeUnloadEvent) => {
      if (!saveQueue.current?.hasPendingChanges) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnAboutPendingChanges);
    return () => {
      window.removeEventListener('beforeunload', warnAboutPendingChanges);
      saveDebounced.flush();
      void saveQueue.current?.flush().catch(() => undefined);
      saveDebounced.cancel();
    };
  }, [saveDebounced]);

  const handleBack = async () => {
    try {
      await flushPending();
      router.back();
    } catch {
      // Keep the editor open so the user can retry instead of losing changes.
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Failed to Load Document</h2>
          <p className="text-gray-600 mb-6">{error || 'Unknown error'}</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {saveError ? (
                  <button className="text-red-600" onClick={() => flushPending().catch(() => undefined)}>
                    Save failed · Retry
                  </button>
                ) : saving ? (
                  <>
                    <Save className="w-4 h-4 animate-pulse" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Saved</span>
                )}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleArchive} disabled={!document.capabilities.canArchive}>
                  <Archive className="w-4 h-4 mr-2" />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Document Content */}
      <main className="mx-auto min-w-0 max-w-5xl">
        {/* Cover Image */}
        {document.coverImage && (
          <div className="w-full h-64 overflow-hidden">
            <img
              src={document.coverImage}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Title Section */}
        <div className="min-w-0 px-3 pt-8 pb-4 sm:px-8 sm:pt-12">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={handleIconChange}
              className="text-6xl hover:bg-gray-100 rounded-lg p-2 transition-colors"
              title="Change icon"
            >
              {icon}
            </button>
          </div>

          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            disabled={!document.capabilities.canEdit}
            className="min-w-0 w-full border-none bg-transparent text-3xl font-bold outline-none placeholder-gray-300 sm:text-5xl"
            placeholder="Untitled"
          />

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 break-words text-sm text-gray-500">
            <span className="break-all">By {document.owner.name}</span>
            <span>•</span>
            <span>Last edited {new Date(document.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Editor */}
        <Editor
          documentId={docId}
          initialContent={document.content}
          onChange={(content) => enqueuePatch({ content })}
          editable={document.capabilities.canEdit}
        />
      </main>
    </div>
  );
}
