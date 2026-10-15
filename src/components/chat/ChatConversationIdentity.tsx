'use client';

import { UserAvatar } from '@/components/ui/user-avatar';
import { getPresenceLabel } from '@/lib/chat/presenceLabel';
import { cn } from '@/lib/utils';
import { useProfileModalStore } from '@/store/useProfileModalStore';
import type { UserPresence } from '@/hooks/usePresence';

interface ChatProfileUser {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  avatar?: string;
  profilePicture?: string;
}

interface ChatConversationIdentityProps {
  type: 'workspace' | 'direct';
  title: string;
  profileUser?: ChatProfileUser;
  presence?: UserPresence;
  now?: Date;
}

export function ChatConversationIdentity({ type, title, profileUser, presence, now }: ChatConversationIdentityProps) {
  const { openProfile } = useProfileModalStore();
  const profileUserId = profileUser?._id || profileUser?.id;

  return (
    <>
      {type === 'direct' && profileUserId && (
        <button
          type="button"
          onClick={() => openProfile(profileUserId)}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={`Open ${title} profile`}
        >
          <UserAvatar user={profileUser} disableProfileClick className="h-10 w-10" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-base font-bold text-foreground md:text-lg">{title}</h2>
        {type === 'direct' && (
          <p className="flex items-center gap-1.5 text-xs leading-4 text-muted-foreground" aria-live="polite">
            <span className={cn('h-2 w-2 shrink-0 rounded-full', presence?.status === 'online' ? 'bg-emerald-500' : 'bg-muted-foreground/50')} aria-hidden="true" />
            <span className="truncate">{getPresenceLabel(presence, now)}</span>
          </p>
        )}
      </div>
    </>
  );
}
