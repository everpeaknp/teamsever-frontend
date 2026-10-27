'use client';

import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Download, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ChatImageGrid({ images, onOpen, className }: { images: string[]; onOpen: (index: number) => void; className?: string }) {
  if (!images.length) return null;
  if (images.length === 1) return <button type="button" onClick={() => onOpen(0)} aria-label="Open image 1 of 1" className={cn('block max-w-full overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', className)} style={{ maxWidth: 'min(72vw, 24rem)' }}>
    <img src={images[0]} alt="Shared image 1" className="block h-auto w-auto object-contain" style={{ maxWidth: 'min(72vw, 24rem)', maxHeight: 'min(60vh, 22rem)' }} />
  </button>;

  return <div className={cn('grid w-[min(72vw,24rem)] grid-cols-2 gap-1 rounded-xl', className)}>
    {images.map((src, index) => <button key={`${src}-${index}`} type="button" onClick={() => onOpen(index)} aria-label={`Open image ${index + 1} of ${images.length}`} className="flex min-h-40 items-center justify-center overflow-hidden rounded-lg bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      <img src={src} alt={`Shared image ${index + 1}`} className="block h-auto w-full" style={{ maxHeight: '15rem', objectFit: 'contain' }} />
    </button>)}
  </div>;
}

export function ChatImageViewer({ images, index, onClose, onIndexChange, onDownload }: {
  images: string[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  onDownload?: (url: string) => void;
}) {
  const touchStartX = useRef<number | null>(null);
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Image preview" className="fixed inset-0 z-[100] flex h-[100dvh] w-screen flex-col overflow-hidden bg-black/95 text-white" onClick={onClose} onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null; }} onTouchEnd={(event) => {
      const start = touchStartX.current;
      const end = event.changedTouches[0]?.clientX;
      touchStartX.current = null;
      if (start === null || end === undefined || Math.abs(end - start) < 45) return;
      onIndexChange(Math.max(0, Math.min(images.length - 1, index + (end < start ? 1 : -1))));
    }}>
      <div className="flex h-14 shrink-0 items-center justify-between px-4" onClick={(event) => event.stopPropagation()}>
        <button type="button" aria-label="Close image preview" onClick={onClose} className="rounded-full p-2 hover:bg-white/10"><X className="h-5 w-5" /></button>
        <span className="text-sm text-white/80">{index + 1} / {images.length}</span>
        <button type="button" aria-label="Save image to device" onClick={() => onDownload?.(images[index])} className="rounded-full p-2 hover:bg-white/10"><Download className="h-5 w-5" /></button>
      </div>
      <div className="relative flex min-h-0 w-full flex-1 items-center justify-center px-10 pb-4" onClick={(event) => event.stopPropagation()}>
        {index > 0 && <button type="button" aria-label="Previous image" onClick={() => onIndexChange(index - 1)} className="absolute left-3 z-10 rounded-full bg-black/45 p-2 hover:bg-black/70"><ChevronLeft className="h-6 w-6" /></button>}
        <img src={images[index]} alt={`Image ${index + 1} of ${images.length}`} className="block h-auto w-auto shrink select-none" style={{ maxWidth: 'calc(100vw - 5rem)', maxHeight: 'calc(100dvh - 5rem)', objectFit: 'contain' }} />
        {index < images.length - 1 && <button type="button" aria-label="Next image" onClick={() => onIndexChange(index + 1)} className="absolute right-3 z-10 rounded-full bg-black/45 p-2 hover:bg-black/70"><ChevronRight className="h-6 w-6" /></button>}
      </div>
    </div>,
    document.body,
  );
}
