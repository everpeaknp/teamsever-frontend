'use client';

import { motion } from 'framer-motion';
import { CheckCheck, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/user-avatar';
import { ChatMessage } from '@/hooks/useChat';
import { format, isToday, isYesterday } from 'date-fns';

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  showAvatar: boolean;
  onRetry?: () => void;
  isSystemMessage?: boolean;
}

export const MessageBubble = ({ message, isOwn, showAvatar, onRetry, isSystemMessage }: MessageBubbleProps) => {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return format(date, 'h:mm a');
    if (isYesterday(date)) return `Yesterday ${format(date, 'h:mm a')}`;
    return format(date, 'MMM d, h:mm a');
  };

  if (isSystemMessage) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-center my-4"
      >
        <div className="text-[11px] font-medium text-muted-foreground bg-muted/50 border border-border/50 px-4 py-1.5 rounded-full shadow-sm">
          {message.content}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'flex gap-3 w-full group mb-1.5',
        isOwn ? 'flex-row-reverse' : 'flex-row',
        !showAvatar && (isOwn ? 'pr-11' : 'pl-11')
      )}
    >
      {/* Avatar */}
      {showAvatar ? (
        <div className="flex-shrink-0 flex flex-col justify-end mb-1">
          <UserAvatar user={message.sender} className="h-8 w-8 ring-1 ring-border/50 shadow-sm transition-transform hover:scale-105" />
        </div>
      ) : (
        <div className="w-8 flex-shrink-0" />
      )}

      {/* Message Content */}
      <div className={cn(
        'flex flex-col max-w-[75%] md:max-w-[65%]',
        isOwn ? 'items-end' : 'items-start'
      )}>
        {showAvatar && (
          <div className={cn(
            'flex items-baseline gap-2 mb-1.5 px-1',
            isOwn ? 'flex-row-reverse' : 'flex-row'
          )}>
            <span className="text-[12px] font-semibold text-foreground/90 tracking-tight">
              {isOwn ? 'You' : message.sender.name}
            </span>
            <span className="text-[10px] text-muted-foreground/60 font-medium">
              {formatTime(message.createdAt)}
            </span>
          </div>
        )}

        <div className="relative group/bubble flex flex-col">
          <div className={cn(
            'px-4 py-2.5 text-[15px] whitespace-pre-wrap break-words leading-relaxed shadow-sm transition-all duration-200 w-fit min-w-[40px]',
            isOwn
              ? 'bg-primary text-primary-foreground rounded-[20px] rounded-tr-[4px]'
              : 'bg-card border border-border/40 text-foreground rounded-[20px] rounded-tl-[4px] hover:shadow-md hover:border-border/60',
            message.failed && 'bg-destructive/10 text-destructive border-destructive/30 shadow-none'
          )}>
            {message.content}
            
            {/* Status indicators for own messages */}
            {isOwn && (
              <div className="flex items-center gap-1 mt-1 justify-end text-[10px] opacity-80 mix-blend-luminosity">
                {message.sending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : message.failed ? (
                  <AlertCircle className="h-3 w-3 text-destructive" />
                ) : !message.tempId ? (
                  <CheckCheck className="h-3 w-3" />
                ) : null}
              </div>
            )}
          </div>

          {/* Retry Button for Failed Messages */}
          {message.failed && onRetry && (
            <button
              onClick={onRetry}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 flex items-center gap-1.5 p-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 rounded-full transition-all opacity-0 group-hover/bubble:opacity-100",
                isOwn ? "-left-16" : "-right-16"
              )}
              title="Retry sending"
            >
              <AlertCircle className="h-4 w-4" />
              <span>Retry</span>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

