'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import {
  Upload,
  File,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  Download,
  Trash2,
  Search,
  Loader2,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { UserAvatar } from '@/components/ui/user-avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { api } from '@/lib/axios';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { CardGridSkeleton } from '@/components/skeletons/PageSkeleton';

interface WorkspaceFile {
  _id: string;
  fileName: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  cloudinaryUrl: string;
  cloudinaryPublicId: string;
  resourceType: string;
  format: string;
  uploadedBy: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  createdAt: string;
}

export default function FilesPage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<WorkspaceFile | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUserId(localStorage.getItem('userId'));
    }
    fetchFiles();
  }, [workspaceId]);

  const fetchFiles = async () => {
    try {
      // Don't show loading on search, only on initial load
      if (!files.length) setLoading(true);
      
      const response = await api.get(`/workspaces/${workspaceId}/files`, {
        params: { search: searchQuery || undefined },
      });
      setFiles(response.data.data || []);
    } catch (error: any) {
      console.error('Failed to fetch files:', error);
      toast.error(error.response?.data?.message || 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchFiles();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const file = selectedFiles[0];

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File size exceeds 10MB limit');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      console.log('[FileUpload] Starting upload for:', file.name);

      // Step 1: Get upload signature
      console.log('[FileUpload] Step 1: Getting upload signature...');
      const signatureRes = await api.post(
        `/workspaces/${workspaceId}/files/init-upload`
      );
      const { signature, timestamp, cloudName, apiKey, folder } =
        signatureRes.data.data;

      console.log('[FileUpload] Signature received:', { cloudName, folder });
      setUploadProgress(20);

      // Step 2: Upload to Cloudinary
      console.log('[FileUpload] Step 2: Uploading to Cloudinary...');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('signature', signature);
      formData.append('timestamp', timestamp.toString());
      formData.append('api_key', apiKey);
      formData.append('folder', folder);
      // Don't add resource_type - it's not in the signature

      const cloudinaryRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!cloudinaryRes.ok) {
        const errorData = await cloudinaryRes.json();
        console.error('[FileUpload] Cloudinary error:', errorData);
        throw new Error(errorData.error?.message || 'Failed to upload to Cloudinary');
      }

      const cloudinaryData = await cloudinaryRes.json();
      console.log('[FileUpload] Cloudinary upload successful:', cloudinaryData.public_id);
      setUploadProgress(70);

      // Step 3: Confirm upload
      console.log('[FileUpload] Step 3: Confirming upload with backend...');
      await api.post(`/workspaces/${workspaceId}/files/confirm`, {
        secure_url: cloudinaryData.secure_url,
        public_id: cloudinaryData.public_id,
        resource_type: cloudinaryData.resource_type,
        format: cloudinaryData.format,
        bytes: cloudinaryData.bytes,
        fileName: file.name,
        fileType: file.type,
      });

      console.log('[FileUpload] Upload complete!');
      setUploadProgress(100);
      toast.success('File uploaded successfully');
      fetchFiles();
    } catch (error: any) {
      console.error('[FileUpload] Upload failed:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to upload file';
      toast.error(errorMessage);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (fileId: string) => {
    try {
      setDeleting(true);
      await api.delete(`/workspace-files/${fileId}`);
      toast.success('File deleted successfully');
      setDeleteModalOpen(false);
      setFileToDelete(null);
      fetchFiles();
    } catch (error: any) {
      console.error('Delete failed:', error);
      toast.error(error.response?.data?.message || 'Failed to delete file');
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteModal = (file: WorkspaceFile) => {
    setFileToDelete(file);
    setDeleteModalOpen(true);
  };

  const getFileIcon = (fileType: string, resourceType: string) => {
    if (resourceType === 'image') return <ImageIcon className="w-5 h-5" />;
    if (resourceType === 'video') return <Video className="w-5 h-5" />;
    if (fileType.includes('pdf')) return <FileText className="w-5 h-5" />;
    if (fileType.includes('zip') || fileType.includes('rar'))
      return <Archive className="w-5 h-5" />;
    if (fileType.includes('audio')) return <Music className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const canDelete = (file: WorkspaceFile) => {
    return file.uploadedBy._id === currentUserId;
  };

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-background md:min-h-0 md:h-screen overflow-hidden">
      {/* Header */}
      <div className="border-b border-border px-4 sm:px-6 py-4 flex-shrink-0">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Files</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {files.length} file{files.length !== 1 ? 's' : ''} in workspace
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full sm:w-64"
              />
              <Button variant="outline" size="icon" onClick={handleSearch}>
                <Search className="w-4 h-4" />
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              disabled={uploading}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading... {uploadProgress}%
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload File
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {loading ? (
          <CardGridSkeleton count={8} />
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <File className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No files yet
            </h3>
            <p className="text-muted-foreground mb-4">
              Upload your first file to get started
            </p>
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              Upload File
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {files.map((file) => (
              <Card
                key={file._id}
                className="p-4 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-lg flex items-center justify-center',
                      file.resourceType === 'image'
                        ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : file.resourceType === 'video'
                        ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    )}
                  >
                    {getFileIcon(file.fileType, file.resourceType)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => window.open(file.cloudinaryUrl, '_blank')}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    {canDelete(file) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => openDeleteModal(file)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3
                    className="font-medium text-sm text-foreground truncate"
                    title={file.fileName}
                  >
                    {file.fileName}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.fileSize)}
                  </p>

                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <UserAvatar user={file.uploadedBy} className="h-6 w-6" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground truncate">
                        {file.uploadedBy.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(file.createdAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this file? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {fileToDelete && (
            <div className="py-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <div
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                    fileToDelete.resourceType === 'image'
                      ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : fileToDelete.resourceType === 'video'
                      ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  )}
                >
                  {getFileIcon(fileToDelete.fileType, fileToDelete.resourceType)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{fileToDelete.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(fileToDelete.fileSize)} • {format(new Date(fileToDelete.createdAt), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteModalOpen(false);
                setFileToDelete(null);
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => fileToDelete && handleDelete(fileToDelete._id)}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete File
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
