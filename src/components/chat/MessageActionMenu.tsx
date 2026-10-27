'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Clipboard, Reply, Trash2 } from 'lucide-react';
import { QUICK_EMOJIS } from './MessageReactionsBar';

interface MessageActionMenuProps {
  children: ReactNode;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onCopy: () => void;
  onDelete?: () => void;
}

export function MessageActionMenu({ children, onReact, onReply, onCopy, onDelete }: MessageActionMenuProps) {
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openAt = (x: number, y: number) => {
    setAnchor({
      x: Math.max(8, Math.min(x, window.innerWidth - 276)),
      y: Math.max(8, Math.min(y, window.innerHeight - 300)),
    });
  };

  const clearHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
  };

  useEffect(() => clearHold, []);

  return (
    <div
      onContextMenu={event => {
        event.preventDefault();
        openAt(event.clientX, event.clientY);
      }}
      onTouchStart={event => {
        clearHold();
        const touch = event.touches[0];
        holdTimer.current = setTimeout(() => openAt(touch.clientX, touch.clientY), 480);
      }}
      onTouchMove={clearHold}
      onTouchEnd={clearHold}
      onTouchCancel={clearHold}
      onKeyDown={event => {
        if ((event.shiftKey && event.key === 'F10') || event.key === 'ContextMenu') {
          event.preventDefault();
          const rect = event.currentTarget.getBoundingClientRect();
          openAt(rect.left, rect.bottom);
        }
      }}
      tabIndex={0}
      className="outline-none"
    >
      {children}
      {anchor && typeof document !== 'undefined' && createPortal(
        <>
          <button aria-label="Close message actions" className="fixed inset-0 z-[100] cursor-default" onClick={() => setAnchor(null)} />
          <div
            role="menu"
            aria-label="Message actions"
            style={{ left: anchor.x, top: anchor.y }}
            className="fixed z-[101] w-[268px] rounded-2xl border border-border bg-popover p-2 text-popover-foreground shadow-2xl"
          >
            <div className="flex items-center justify-between gap-1 border-b border-border/60 px-1 pb-2">
              {QUICK_EMOJIS.map(item => (
                <button
                  key={item.name}
                  type="button"
                  role="menuitem"
                  aria-label={`React ${item.name}`}
                  title={item.name}
                  onClick={() => { onReact(item.emoji); setAnchor(null); }}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-xl transition hover:scale-110 hover:bg-accent"
                >{item.emoji}</button>
              ))}
            </div>
            <div className="grid gap-1 pt-2">
              <Action label="Reply" icon={<Reply className="h-4 w-4" />} onClick={() => { onReply(); setAnchor(null); }} />
              <Action label="Copy text" icon={<Clipboard className="h-4 w-4" />} onClick={() => { onCopy(); setAnchor(null); }} />
              {onDelete && <Action label="Unsend" destructive icon={<Trash2 className="h-4 w-4" />} onClick={() => { onDelete(); setAnchor(null); }} />}
            </div>
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}

function Action({ label, icon, onClick, destructive = false }: { label: string; icon: ReactNode; onClick: () => void; destructive?: boolean }) {
  return <button type="button" role="menuitem" onClick={onClick} className={`flex h-10 items-center gap-3 rounded-lg px-3 text-left text-sm transition hover:bg-accent ${destructive ? 'text-destructive' : ''}`}>
    {icon}<span>{label}</span>
  </button>;
}
