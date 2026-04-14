'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StickyNote } from 'lucide-react';

interface StickyNotesProps {
  workspaceId: string;
  userId: string;
  initialContent?: string;
}

export function StickyNotes({ workspaceId, userId, initialContent }: StickyNotesProps) {
  const [content, setContent] = useState('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);
  const isFirstLoad = useRef(true);

  const storageKey = `notes_${workspaceId}_${userId}`;

  // Load from API (via initialContent) or local storage
  useEffect(() => {
    if (isLoadingRef.current) return;
    
    try {
      isLoadingRef.current = true;
      
      // Prioritize API content if available
      if (initialContent !== undefined && isFirstLoad.current) {
        setContent(initialContent);
        if (editorRef.current && editorRef.current.textContent !== initialContent) {
          editorRef.current.textContent = initialContent;
        }
        isFirstLoad.current = false;
        return;
      }

      // Fallback to local storage only if it's the first load and no initialContent
      if (isFirstLoad.current) {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          setContent(saved);
          if (editorRef.current && editorRef.current.textContent !== saved) {
            editorRef.current.textContent = saved;
          }
        }
        isFirstLoad.current = false;
      }
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      isLoadingRef.current = false;
    }
  }, [storageKey, initialContent]);

  const saveToAPI = async (newContent: string) => {
    try {
      const { api } = await import('@/lib/axios');
      await api.patch(`/workspaces/${workspaceId}/sticky-note`, { content: newContent });
      console.log('[StickyNotes] Saved to API');
    } catch (error) {
      console.error('[StickyNotes] Failed to save to API:', error);
    }
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const newContent = e.currentTarget.textContent || '';
    setContent(newContent);

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save to localStorage and API
    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, newContent);
        saveToAPI(newContent);
      } catch (error) {
        console.error('Failed to auto-save notes:', error);
      }
    }, 1000); // 1s debounce for API calls
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    // Prevent pasting formatted text, only allow plain text
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  // Save immediately when component unmounts
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Save current content immediately on unmount
      if (editorRef.current) {
        const currentContent = editorRef.current.textContent || '';
        try {
          localStorage.setItem(storageKey, currentContent);
        } catch (error) {
          console.error('Failed to save notes on unmount:', error);
        }
      }
    };
  }, [storageKey]);

  return (
    <Card className="h-[400px] flex flex-col bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <StickyNote className="w-5 h-5 text-amber-500" />
          <CardTitle className="text-lg">My Sticky Notes</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto px-6 pb-6">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onPaste={handlePaste}
          onBlur={() => {
            // Save immediately when user clicks away
            if (editorRef.current) {
              const currentContent = editorRef.current.textContent || '';
              try {
                localStorage.setItem(storageKey, currentContent);
                saveToAPI(currentContent);
              } catch (error) {
                console.error('Failed to save notes on blur:', error);
              }
            }
          }}
          className="w-full h-full outline-none text-sm break-words whitespace-pre-wrap text-gray-800 dark:text-gray-200 empty:before:content-['Start_typing_your_notes_here...'] empty:before:text-gray-400 empty:before:dark:text-gray-500"
          style={{ minHeight: '100%' }}
        />
      </CardContent>
    </Card>
  );
}
