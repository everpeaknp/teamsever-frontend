'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  Eye,
  Folder,
  Globe,
  Hash,
  LayoutGrid,
  List
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

interface Space {
  _id: string;
  name: string;
  icon?: string;
  color?: string;
}

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
  space?: string;
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
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<WorkspaceFile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [viewLayout, setViewLayout] = useState<'grid' | 'list'>('list');
  
  // Sidebar Resize Logic
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isResizingRef = useRef(false);

  const MIN_SIDEBAR_WIDTH = 200;
  const MAX_SIDEBAR_WIDTH = 450;

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const stopResizing = useCallback(() => {
    if (!isResizingRef.current) return;
    isResizingRef.current = false;
    setIsResizing(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    localStorage.setItem(`files_sidebar_width_${workspaceId}`, String(sidebarWidth));
  }, [workspaceId, sidebarWidth]);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizingRef.current) return;
    const containerLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
    const nextWidth = Math.max(
      MIN_SIDEBAR_WIDTH,
      Math.min(MAX_SIDEBAR_WIDTH, e.clientX - containerLeft)
    );
    setSidebarWidth(nextWidth);
  }, []);

  const resetSidebarWidth = useCallback(() => {
    setSidebarWidth(260);
    localStorage.setItem(`files_sidebar_width_${workspaceId}`, '260');
  }, [workspaceId]);

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [onMouseMove, stopResizing]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedWidth = localStorage.getItem(`files_sidebar_width_${workspaceId}`);
      if (savedWidth) setSidebarWidth(Number(savedWidth));
      
      const savedLayout = localStorage.getItem('files_view_layout') as 'grid' | 'list';
      if (savedLayout) setViewLayout(savedLayout);
    }
  }, [workspaceId]);

  const handleLayoutChange = (layout: 'grid' | 'list') => {
    setViewLayout(layout);
    localStorage.setItem('files_view_layout', layout);
  };
  
  // Preview Modal State
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<WorkspaceFile | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUserId(localStorage.getItem('userId'));
    }
    fetchSpaces();
    fetchFiles();
  }, [workspaceId, activeSpaceId]);

  const fetchSpaces = async () => {
    try {
      const response = await api.get(`/workspaces/${workspaceId}/hierarchy`);
      // Hierarchy returns an object { spaces: [...] }. We need to extract spaces array.
      setSpaces(response.data.data?.spaces || []);
    } catch (error) {
      console.error('Failed to fetch spaces:', error);
    }
  };

  const fetchFiles = async () => {
    try {
      // Don't show loading on search, only on initial load
      if (!files.length) setLoading(true);
      
      const response = await api.get(`/workspaces/${workspaceId}/files`, {
        params: { 
          search: searchQuery || undefined,
          spaceId: activeSpaceId || 'null' // 'null' string tells backend to look for space: null
        },
      });
      setFiles(response.data.data || []);
    } catch (error: any) {
      console.error('Failed to fetch files:', error);
      toast.error(error.response?.data?.message || 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFiles();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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
      
      // Force raw upload for documents/archives to avoid Cloudinary security blocks
      const rawExtensions = ['.pdf', '.zip', '.xlsx', '.xls', '.docx', '.doc', '.pptx', '.ppt', '.rar', '.7z', '.md', '.txt', '.sql'];
      const isRaw = file.type === 'application/pdf' || rawExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
      const uploadResourceType = isRaw ? 'raw' : 'auto';

      const cloudinaryRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/${uploadResourceType}/upload`,
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
      const fileExt = file.name.split('.').pop() || 'raw';
      
      await api.post(`/workspaces/${workspaceId}/files/confirm`, {
        secure_url: cloudinaryData.secure_url,
        public_id: cloudinaryData.public_id,
        resource_type: cloudinaryData.resource_type,
        format: cloudinaryData.format || fileExt,
        bytes: cloudinaryData.bytes,
        fileName: file.name,
        fileType: file.type,
        spaceId: activeSpaceId, // Upload to the current active space
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

  const toggleFileSelection = (fileId: string) => {
    setSelectedFileIds(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId) 
        : [...prev, fileId]
    );
  };

  const handleBatchDelete = async () => {
    if (!selectedFileIds.length) return;
    
    try {
      setDeleting(true);
      // We'll delete them one by one for now to ensure all hooks/permissions trigger correctly
      // In a production app, a dedicated batch API endpoint is better
      await Promise.all(selectedFileIds.map(id => api.delete(`/workspace-files/${id}`)));
      
      toast.success(`Successfully deleted ${selectedFileIds.length} files`);
      setSelectedFileIds([]);
      fetchFiles();
    } catch (error: any) {
      console.error('Batch delete failed:', error);
      toast.error('Failed to delete some files. You might not have permission.');
    } finally {
      setDeleting(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedFileIds.length === files.length) {
      setSelectedFileIds([]);
    } else {
      setSelectedFileIds(files.map(f => f._id));
    }
  };

  const openPreview = async (file: WorkspaceFile) => {
    setPreviewFile(file);
    setTextContent(null);
    setPreviewModalOpen(true);

    // If it's a text file, fetch the content natively
    const textFormats = ['md', 'txt', 'sql', 'json', 'js', 'ts', 'css', 'html'];
    if (textFormats.includes(file.format.toLowerCase())) {
      try {
        setLoadingText(true);
        const response = await fetch(file.cloudinaryUrl);
        if (response.ok) {
          const text = await response.text();
          setTextContent(text);
        } else {
          setTextContent('Failed to load file content.');
        }
      } catch (error) {
        console.error('Failed to fetch text content:', error);
        setTextContent('Error loading file content. This might be due to CORS restrictions on your browser.');
      } finally {
        setLoadingText(false);
      }
    }
  };

  const handleDownload = (file: WorkspaceFile) => {
    // Only use fl_attachment for image resources to bypass browser opening them inline
    let downloadUrl = file.cloudinaryUrl;
    if (file.resourceType === 'image' && downloadUrl.includes('/upload/')) {
      downloadUrl = downloadUrl.replace('/upload/', '/upload/fl_attachment/');
    }
    window.open(downloadUrl, '_blank');
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
    <div className="flex-1 flex bg-background h-screen overflow-hidden">
      {/* Space Folders Sidebar */}
      <div 
        ref={sidebarRef}
        className={cn(
          "border-r border-border flex flex-col flex-shrink-0 relative bg-background",
          !isResizing && "transition-[width] duration-300"
        )}
        style={{ width: `${sidebarWidth}px` }}
      >
        {/* Resizer Handle */}
        <div
          className="absolute top-0 -right-1 h-full w-1.5 cursor-col-resize z-50 hover:bg-primary/30 transition-colors"
          onMouseDown={startResizing}
          onDoubleClick={resetSidebarWidth}
        />

        <div className="p-4 border-b border-border/50 h-[73px] flex items-center">
          <h2 className="text-lg font-bold text-foreground">File Library</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 chat-scrollbar space-y-6">
          {/* Main Section */}
          <div className="space-y-0.5">
            <p className="px-3 py-2 text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wider">
              GENERAL
            </p>
            <button
              onClick={() => setActiveSpaceId(null)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group",
                activeSpaceId === null 
                  ? "bg-primary text-white shadow-sm" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Globe className={cn(
                "w-4 h-4",
                activeSpaceId === null ? "text-white" : "text-primary/60"
              )} />
              Global Files
            </button>
          </div>
          
          {/* Spaces Section */}
          <div className="space-y-0.5">
            <p className="px-3 py-2 text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wider">
              SPACES
            </p>
            <div className="space-y-0.5">
              {spaces.map((space) => (
                <button
                  key={space._id}
                  onClick={() => setActiveSpaceId(space._id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group",
                    activeSpaceId === space._id 
                      ? "bg-primary text-white shadow-sm" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Hash className={cn(
                    "w-4 h-4 transition-colors",
                    activeSpaceId === space._id ? "text-white" : "text-muted-foreground/60 group-hover:text-foreground"
                  )} />
                  <span className="truncate flex-1 text-left">{space.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-8 py-5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                  {activeSpaceId ? (
                    <>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: spaces.find(s => s._id === activeSpaceId)?.color || 'currentColor' }} />
                      {spaces.find(s => s._id === activeSpaceId)?.name}
                    </>
                  ) : (
                    <>
                      <Globe className="w-5 h-5 text-primary/60" />
                      Global
                    </>
                  )}
                </h1>
                <p className="text-[11px] font-medium text-muted-foreground mt-0.5 opacity-60">
                  {activeSpaceId ? "Space-specific storage" : "Shared workspace files"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {files.length > 0 && (
                <div className="flex items-center gap-1 bg-muted/20 p-1 rounded-xl mr-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-7 w-7 rounded-lg",
                      viewLayout === 'grid' ? "bg-background shadow-sm text-primary" : "text-muted-foreground"
                    )}
                    onClick={() => handleLayoutChange('grid')}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-7 w-7 rounded-lg",
                      viewLayout === 'list' ? "bg-background shadow-sm text-primary" : "text-muted-foreground"
                    )}
                    onClick={() => handleLayoutChange('list')}
                  >
                    <List className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}

              <div className="relative group">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="Find a file..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-56 h-9 pl-9 bg-muted/20 border-transparent focus:border-primary/20 focus:bg-white dark:focus:bg-muted/40 transition-all rounded-xl text-xs"
                />
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
                variant="outline"
                className="gap-2 h-9 rounded-xl px-4 border-primary/10 hover:border-primary/30 hover:bg-primary/5 transition-all text-xs font-semibold"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {uploadProgress}%
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5 text-primary" />
                    Upload
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {files.length > 0 && (
            <div className="mt-4 flex items-center justify-between border-t border-border/30 pt-4">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground hover:text-primary h-auto py-1 px-2"
                onClick={handleSelectAll}
              >
                {selectedFileIds.length === files.length ? "Deselect All" : `Select All (${files.length})`}
              </Button>
              
              {selectedFileIds.length > 0 && (
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">
                  {selectedFileIds.length} item{selectedFileIds.length > 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-[#fcfcfc] dark:bg-transparent relative">
          {loading ? (
            <CardGridSkeleton count={12} />
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
              <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-6">
                <File className="w-8 h-8 text-muted-foreground/30" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">
                No files yet
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                {activeSpaceId ? "This space folder is currently empty." : "General files shared with the workspace will appear here."}
              </p>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="rounded-full px-6">
                <Upload className="w-4 h-4 mr-2" />
                Upload File
              </Button>
            </div>
          ) : viewLayout === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              {files.map((file) => {
                const isSelected = selectedFileIds.includes(file._id);
                return (
                  <div
                    key={file._id}
                    className={cn(
                      "group relative flex flex-col p-4 rounded-2xl transition-all duration-300 border border-transparent",
                      isSelected 
                        ? "bg-primary/5 dark:bg-primary/10 border-primary/20 shadow-md ring-1 ring-primary/20" 
                        : "bg-white dark:bg-muted/20 hover:bg-white dark:hover:bg-muted/30 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-border/50"
                    )}
                  >
                    {/* Select Checkbox */}
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFileSelection(file._id);
                      }}
                      className={cn(
                        "absolute top-3 right-3 z-10 w-5 h-5 rounded-md border transition-all cursor-pointer flex items-center justify-center",
                        isSelected 
                          ? "bg-primary border-primary text-white scale-110" 
                          : "bg-white/80 dark:bg-muted/80 border-border opacity-0 group-hover:opacity-100"
                      )}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>

                    <div className="flex items-start gap-3 mb-4" onClick={() => openPreview(file)}>
                      <div
                        className={cn(
                          'w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 cursor-pointer shadow-inner',
                          'bg-slate-900 text-slate-100'
                        )}
                      >
                        {getFileIcon(file.fileType, file.resourceType)}
                      </div>
                      
                      <div className="flex-1 min-w-0 pt-0.5">
                        <h3
                          className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors cursor-pointer"
                          title={file.fileName}
                        >
                          {file.fileName}
                        </h3>
                        <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-tight mt-0.5">
                          {file.format} <span className="mx-1">•</span> {formatFileSize(file.fileSize)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/10">
                      <div className="flex items-center gap-2">
                        <UserAvatar user={file.uploadedBy} className="h-5 w-5 border border-white dark:border-muted shadow-sm" />
                        <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[80px]">
                          {file.uploadedBy.name}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary opacity-0 group-hover:opacity-100 transition-all"
                          onClick={() => openPreview(file)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary opacity-0 group-hover:opacity-100 transition-all"
                          onClick={() => handleDownload(file)}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                        {canDelete(file) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                            onClick={() => openDeleteModal(file)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {files.map((file) => {
                const isSelected = selectedFileIds.includes(file._id);
                return (
                  <div
                    key={file._id}
                    className={cn(
                      "group flex items-center gap-4 p-3 rounded-2xl transition-all duration-200 border border-transparent",
                      isSelected 
                        ? "bg-primary/5 border-primary/20 shadow-sm" 
                        : "hover:bg-white dark:hover:bg-muted/40 hover:border-border/40 hover:shadow-sm"
                    )}
                  >
                    <div 
                      onClick={() => toggleFileSelection(file._id)}
                      className={cn(
                        "w-5 h-5 rounded-md border transition-all cursor-pointer flex items-center justify-center",
                        isSelected 
                          ? "bg-primary border-primary text-white" 
                          : "bg-background dark:bg-muted/50 border-border opacity-40 group-hover:opacity-100"
                      )}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>

                    <div
                      onClick={() => openPreview(file)}
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 cursor-pointer shadow-sm transition-transform group-hover:scale-105',
                        'bg-slate-900 text-slate-100'
                      )}
                    >
                      {getFileIcon(file.fileType, file.resourceType)}
                    </div>

                    <div className="flex-1 min-w-0 grid grid-cols-12 gap-4 items-center" onClick={() => openPreview(file)}>
                      <div className="col-span-5 truncate">
                        <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors cursor-pointer">{file.fileName}</span>
                      </div>
                      <div className="col-span-2 text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">{file.format}</div>
                      <div className="col-span-2 text-xs font-medium text-muted-foreground/60">{formatFileSize(file.fileSize)}</div>
                      <div className="col-span-3 flex items-center gap-2">
                        <UserAvatar user={file.uploadedBy} className="h-6 w-6 border-2 border-white dark:border-muted shadow-sm" />
                        <span className="text-xs font-semibold text-muted-foreground/80 truncate">{file.uploadedBy.name}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary" onClick={() => openPreview(file)}><Eye className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary" onClick={() => handleDownload(file)}><Download className="w-4 h-4" /></Button>
                      {canDelete(file) && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive" onClick={() => openDeleteModal(file)}><Trash2 className="w-4 h-4" /></Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Floating Batch Action Bar */}
          {selectedFileIds.length > 0 && (
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="bg-foreground text-background dark:bg-background dark:text-foreground shadow-2xl rounded-2xl px-6 py-4 flex items-center gap-8 border border-border/50 backdrop-blur-xl">
                <div className="flex flex-col">
                  <span className="text-sm font-bold">{selectedFileIds.length} files selected</span>
                  <span className="text-[10px] opacity-60 uppercase tracking-widest font-bold">Manage selection</span>
                </div>
                
                <div className="h-8 w-[1px] bg-border/20" />
                
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs font-bold hover:bg-muted/10 transition-colors h-9 px-4 rounded-xl"
                    onClick={() => setSelectedFileIds([])}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-9 px-6 rounded-xl font-bold shadow-lg shadow-destructive/20"
                    disabled={deleting}
                    onClick={handleBatchDelete}
                  >
                    {deleting ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    Delete Permanent
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
        <DialogContent className={cn(
          "max-w-4xl flex flex-col p-0 overflow-hidden border-none shadow-2xl transition-all duration-300",
          (previewFile?.fileType.includes('pdf') || ['md', 'txt', 'sql', 'pptx', 'docx', 'xlsx', 'ppt', 'doc', 'xls'].includes(previewFile?.format?.toLowerCase() || ''))
            ? "h-[90vh] w-[95vw] max-w-[1200px]" 
            : "max-h-[90vh] w-auto"
        )}>
          <DialogHeader className="p-4 border-b bg-card">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-lg truncate">
                  {previewFile?.fileName}
                </DialogTitle>
                <DialogDescription className="truncate">
                  {previewFile && formatFileSize(previewFile.fileSize)} • Uploaded by {previewFile?.uploadedBy.name}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8"
                  onClick={() => previewFile && handleDownload(previewFile)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPreviewModalOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex-1 bg-[#0f0f0f] flex items-center justify-center overflow-hidden">
            {textContent !== null || loadingText ? (
              <div className="w-full h-full bg-[#0d1117] p-8 overflow-auto">
                {loadingText ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-muted-foreground text-sm">Reading file content...</p>
                  </div>
                ) : (
                  <pre className="text-slate-300 font-mono text-sm leading-relaxed whitespace-pre-wrap max-w-4xl mx-auto selection:bg-primary/30">
                    {textContent || 'No content found in this file.'}
                  </pre>
                )}
              </div>
            ) : (previewFile?.resourceType === 'image' && !['pdf', 'md', 'txt', 'sql'].includes(previewFile?.format?.toLowerCase() || '')) ? (
              <div className="p-4 w-full h-full flex items-center justify-center">
                <img 
                  src={previewFile.cloudinaryUrl} 
                  alt={previewFile.fileName}
                  className="max-w-full max-h-full object-contain shadow-2xl"
                />
              </div>
            ) : (previewFile?.format?.toLowerCase() === 'pdf' || previewFile?.fileType.includes('pdf')) ? (
              <iframe 
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(previewFile?.cloudinaryUrl || '')}&embedded=true`}
                className="w-full h-full border-none bg-white"
                title={previewFile?.fileName}
                sandbox="allow-scripts allow-same-origin allow-forms"
              />
            ) : (['md', 'txt', 'sql'].includes(previewFile?.format || '')) ? (
              <iframe 
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(previewFile?.cloudinaryUrl || '')}&embedded=true`}
                className="w-full h-full border-none bg-white"
                title={previewFile?.fileName}
                sandbox="allow-scripts allow-same-origin allow-forms"
              />
            ) : (['pptx', 'docx', 'xlsx', 'ppt', 'doc', 'xls'].includes(previewFile?.format || '')) ? (
              <iframe 
                src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewFile?.cloudinaryUrl || '')}`}
                className="w-full h-full border-none bg-white"
                title={previewFile?.fileName}
              />
            ) : (
              <div className="text-center p-12 bg-background w-full h-full flex flex-col items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
                  {previewFile && getFileIcon(previewFile.fileType, previewFile.resourceType)}
                </div>
                <h3 className="text-xl font-semibold">No Preview Available</h3>
                <p className="text-muted-foreground mt-2 max-w-xs">
                  This file type ({previewFile?.format}) cannot be previewed inside the browser. 
                </p>
                <Button 
                  variant="default" 
                  className="mt-8 px-8"
                  onClick={() => previewFile && handleDownload(previewFile)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download File
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
