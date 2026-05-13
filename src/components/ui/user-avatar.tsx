import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useProfileModalStore } from '@/store/useProfileModalStore';

interface UserAvatarProps extends React.ComponentPropsWithoutRef<typeof Avatar> {
  user?: {
    name?: string;
    email?: string;
    avatar?: string;
    profilePicture?: string;
    _id?: string;
    id?: string;
  };
  fallbackClassName?: string;
  disableProfileClick?: boolean;
}

export function UserAvatar({ user, className, fallbackClassName, disableProfileClick, ...props }: UserAvatarProps) {
  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email.charAt(0).toUpperCase();
    }
    return '?';
  };

  const initials = getInitials(user?.name, user?.email);
  const { openProfile } = useProfileModalStore();

  const handleClick = (e: React.MouseEvent) => {
    const targetUserId = user?._id || user?.id;
    if (!disableProfileClick && targetUserId) {
      e.stopPropagation();
      openProfile(targetUserId);
    }
  };

  return (
    <Avatar 
      className={cn(
        'transition-transform active:scale-95 duration-200', 
        !disableProfileClick && (user?._id || user?.id) && 'cursor-pointer hover:ring-2 hover:ring-primary/20',
        className
      )} 
      onClick={handleClick}
      {...props}
    >
      {(user?.profilePicture || user?.avatar) && (
        <AvatarImage 
          src={user.profilePicture || user.avatar} 
          alt={user.name || user.email || 'User'} 
          className="object-cover"
        />
      )}
      <AvatarFallback className={cn('bg-gradient-to-br from-blue-500 to-purple-500 text-white font-semibold', fallbackClassName)}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
