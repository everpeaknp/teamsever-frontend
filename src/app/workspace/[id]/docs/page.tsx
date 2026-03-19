'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/axios';
import { Plus, Loader2, FileText, Folder, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ListPageSkeleton } from '@/components/skeletons/PageSkeleton';

interface Document {
  _id: string;
  title: string;
  icon: string;
  owner: {
    name: string;
    email: string;
  };
  parentId?: string;
  children?: Document[];
  createdAt: string;
  updatedAt: string;
}

export default function DocumentsPage() {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.id as string;

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, [workspaceId]);

  const fetchDocuments = async () => {
    try {
      // Only show loading on initial load
      if (!documents.length) setLoading(true);
      setError(null);
      
      const response = await api.get(`/docs/workspace/${workspaceId}/hierarchy`);
      setDocuments(response.data.data);
    } catch (error: any) {
      console.error('Failed to fetch documents:', error);
      setError(error.response?.data?.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDocument = async () => {
    try {
      setCreating(true);
      const response = await api.post('/docs', {
        title: 'Untitled',
        workspaceId,
      });
      const newDoc = response.data.data;
      router.push(`/workspace/${workspaceId}/docs/${newDoc._id}`);
    } catch (error: any) {
      console.error('Failed to create document:', error);
      toast.error(error.response?.data?.message || 'Failed to create document');
    } finally {
      setCreating(false);
    }
  };

  const renderDocumentTree = (docs: Document[], level = 0) => {
    return docs.map((doc) => (
      <div key={doc._id} style={{ marginLeft: `${level * 20}px` }}>
        <div
          onClick={() => router.push(`/workspace/${workspaceId}/docs/${doc._id}`)}
          className="flex items-center gap-3 p-3 hover:bg-accent rounded-lg cursor-pointer transition-colors group"
        >
          {doc.children && doc.children.length > 0 && (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="text-2xl">{doc.icon}</span>
          <div className="flex-1">
            <h3 className="font-medium text-foreground group-hover:text-primary">
              {doc.title}
            </h3>
            <p className="text-sm text-muted-foreground">
              Updated {new Date(doc.updatedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        {doc.children && doc.children.length > 0 && renderDocumentTree(doc.children, level + 1)}
      </div>
    ));
  };

  if (loading) {
    return <ListPageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Documents</h1>
              <p className="text-sm text-muted-foreground">{documents.length} documents</p>
            </div>
            <Button
              onClick={handleCreateDocument}
              disabled={creating}
              className="flex items-center gap-2"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  New Document
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {documents.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-xl border-2 border-dashed border-border">
            <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No documents yet</h3>
            <p className="text-muted-foreground mb-4">Create your first document to get started</p>
            <Button onClick={handleCreateDocument} disabled={creating}>
              <Plus className="w-4 h-4 mr-2" />
              Create Document
            </Button>
          </div>
        ) : (
          <div className="bg-card rounded-xl shadow-sm border border-border p-4">
            {renderDocumentTree(documents)}
          </div>
        )}
      </main>
    </div>
  );
}
