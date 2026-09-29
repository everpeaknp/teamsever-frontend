'use client';

import { useState } from 'react';
import { Smile, Plus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// The 5 Core Emojis requested by the user: Fire, Pulse, Kudos, Love, Like
export const QUICK_EMOJIS = [
  { emoji: '🔥', name: 'Fire' },
  { emoji: '⚡', name: 'Pulse' },
  { emoji: '🏆', name: 'Kudos' },
  { emoji: '❤️', name: 'Love' },
  { emoji: '👍', name: 'Like' },
];

export const EXTENDED_EMOJIS = [
  '🎉', '👏', '🚀', '💯', '✨', '🙌',
  '💡', '👀', '🤝', '💪', '🎯', '⭐',
  '😀', '😂', '😎', '🥳', '🤔', '🙏',
];

interface MessageReactionsBarProps {
  reactions?: Array<{
    emoji: string;
    users: string[];
    count: number;
  }>;
  currentUserId: string;
  onReact: (emoji: string) => void;
  className?: string;
}

export function MessageReactionsBar({
  reactions = [],
  currentUserId,
  onReact,
  className,
}: MessageReactionsBarProps) {
  return (
    <div className={cn('flex items-center flex-wrap gap-1 mt-1.5', className)}>
      {reactions.map((r) => {
        const hasReacted = r.users?.some((u) => u === currentUserId);
        return (
          <button
            key={r.emoji}
            type="button"
            onClick={() => onReact(r.emoji)}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-all duration-150 select-none',
              hasReacted
                ? 'bg-primary/15 border-primary/40 text-primary shadow-sm scale-105'
                : 'bg-muted/40 hover:bg-muted/80 border-border/40 text-muted-foreground hover:text-foreground'
            )}
            title={`${r.count} reaction${r.count > 1 ? 's' : ''}`}
          >
            <span>{r.emoji}</span>
            <span className="text-[11px] font-semibold">{r.count}</span>
          </button>
        );
      })}

      {/* Keep one reaction picker in the same row, even before the first reaction. */}
      <MessageReactionTrigger onReact={onReact} />
    </div>
  );
}

/**
 * Click-only Reaction Trigger Button & Popover for Messages.
 * Only opens when clicked (never automatically on hover).
 */
export function MessageReactionTrigger({
  onReact,
  align = 'center',
  className,
}: {
  onReact: (emoji: string) => void;
  align?: 'start' | 'center' | 'end';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [showExtended, setShowExtended] = useState(false);

  return (
    <Popover
      open={open}
      onOpenChange={(val) => {
        setOpen(val);
        if (!val) setShowExtended(false);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center justify-center h-6 w-6 rounded-full bg-muted/40 hover:bg-muted text-muted-foreground/80 hover:text-foreground border border-border/40 shadow-sm transition-all hover:scale-110 active:scale-95',
            className
          )}
          title="React with emoji"
        >
          <Smile className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align={align}
        sideOffset={6}
        className={cn(
          'p-1.5 bg-card/95 backdrop-blur-md border border-border shadow-xl z-30 transition-all duration-150',
          showExtended ? 'rounded-2xl w-auto' : 'rounded-full w-auto'
        )}
      >
        <div className="flex items-center gap-1">
          {QUICK_EMOJIS.map((item) => (
            <button
              key={item.name}
              type="button"
              onClick={() => {
                onReact(item.emoji);
                setOpen(false);
              }}
              className="h-8 w-8 flex items-center justify-center text-lg rounded-full hover:bg-muted hover:scale-125 transition-transform"
              title={item.name}
            >
              {item.emoji}
            </button>
          ))}
          <div className="w-[1px] h-5 bg-border/60 mx-0.5" />
          <button
            type="button"
            onClick={() => setShowExtended(!showExtended)}
            className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-xs"
            title={showExtended ? 'Show less' : 'More emojis'}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {showExtended && (
          <div className="grid grid-cols-6 gap-1 pt-2 mt-2 border-t border-border/40">
            {EXTENDED_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onReact(emoji);
                  setOpen(false);
                }}
                className="h-7 w-7 flex items-center justify-center text-base rounded-md hover:bg-muted hover:scale-120 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/**
 * Quick Emoji Popover for the Chat Input Bar.
 * Allows inserting emojis into the message or sending directly.
 */
export function InputEmojiPicker({
  onSelectEmoji,
  onQuickSend,
  className,
}: {
  onSelectEmoji: (emoji: string) => void;
  onQuickSend?: (emoji: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'p-1.5 hover:bg-muted/80 rounded-full transition-colors text-muted-foreground/70 hover:text-foreground',
            className
          )}
          title="Add emoji"
        >
          <Smile className="h-5 w-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={8}
        className="w-72 p-3 bg-card/95 backdrop-blur-md border border-border shadow-xl rounded-2xl space-y-3 z-30"
      >
        {/* Quick Emojis (Fire, Pulse, Kudos, Love, Like) */}
        <div>
          <div className="text-[11px] font-semibold text-muted-foreground mb-1.5 px-1 flex items-center justify-between">
            <span>Quick Emojis</span>
            <span className="text-[10px] text-muted-foreground/60">Click to insert</span>
          </div>
          <div className="flex items-center justify-between gap-1 p-1.5 bg-muted/40 rounded-xl border border-border/40">
            {QUICK_EMOJIS.map((item) => (
              <button
                key={item.name}
                type="button"
                onClick={() => onSelectEmoji(item.emoji)}
                className="h-9 w-9 flex items-center justify-center text-xl rounded-lg hover:bg-background/80 hover:scale-125 transition-all active:scale-95"
                title={`${item.name} (${item.emoji})`}
              >
                {item.emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Extended Popular Emojis */}
        <div>
          <div className="text-[11px] font-semibold text-muted-foreground mb-1.5 px-1">
            Popular Emojis
          </div>
          <div className="grid grid-cols-6 gap-1 p-1 bg-muted/20 rounded-xl border border-border/20">
            {EXTENDED_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onSelectEmoji(emoji)}
                className="h-8 w-8 flex items-center justify-center text-base rounded-md hover:bg-background hover:scale-120 transition-all active:scale-95"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* 1-Click Send Directly */}
        {onQuickSend && (
          <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground/70 font-medium">Send alone:</span>
            <div className="flex items-center gap-1">
              {QUICK_EMOJIS.map((item) => (
                <button
                  key={`send-${item.name}`}
                  type="button"
                  onClick={() => {
                    onQuickSend(item.emoji);
                    setOpen(false);
                  }}
                  className="px-1.5 py-0.5 rounded text-sm hover:bg-primary/15 hover:text-primary transition-all font-medium active:scale-95"
                  title={`Send ${item.name} immediately`}
                >
                  {item.emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
