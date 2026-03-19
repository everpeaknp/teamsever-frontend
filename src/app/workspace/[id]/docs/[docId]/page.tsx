'use client';

import { useEffect, useState } from 'react';
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
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('📄');

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
      setTitle(doc.title);
      setIcon(doc.icon);
    } catch (error: any) {
      console.error('Failed to fetch document:', error);
      setError(error.response?.data?.message || 'Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const handleTitleChange = async (newTitle: string) => {
    setTitle(newTitle);
    try {
      await api.patch(`/docs/${docId}`, { title: newTitle });
    } catch (error) {
      console.error('Failed to update title:', error);
    }
  };

  const handleIconChange = () => {
    const newIcon = window.prompt('Enter an emoji:', icon);
    if (newIcon) {
      setIcon(newIcon);
      api.patch(`/docs/${docId}`, { icon: newIcon }).catch(console.error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await api.delete(`/docs/${docId}`);
      router.push(`/workspace/${workspaceId}/docs`);
    } catch (error: any) {
      console.error('Failed to delete document:', error);
      alert(error.response?.data?.message || 'Failed to delete document');
    }
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => setSaving(false), 1000);
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
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {saving ? (
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
                <DropdownMenuItem>
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
      <main className="max-w-5xl mx-auto">
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
        <div className="px-8 pt-12 pb-4">
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
            className="text-5xl font-bold w-full border-none outline-none bg-transparent placeholder-gray-300"
            placeholder="Untitled"
          />

          <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
            <span>By {document.owner.name}</span>
            <span>•</span>
            <span>Last edited {new Date(document.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Editor */}
        <Editor
          documentId={docId}
          initialContent={document.content}
          onSave={handleSave}
        />
      </main>
    </div>
  );
}
