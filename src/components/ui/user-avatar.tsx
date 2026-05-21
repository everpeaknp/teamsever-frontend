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
  name?: string;
  email?: string;
  avatar?: string;
  profilePicture?: string;
  _id?: string;
  id?: string;
  fallbackClassName?: string;
  disableProfileClick?: boolean;
}

export function UserAvatar({
  user,
  name,
  email,
  avatar,
  profilePicture,
  _id,
  id,
  className,
  fallbackClassName,
  disableProfileClick,
  ...props
}: UserAvatarProps) {
  const resolvedUser = user || {
    name,
    email,
    avatar,
    profilePicture,
    _id,
    id,
  };

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

  const initials = getInitials(resolvedUser?.name, resolvedUser?.email);
  const { openProfile } = useProfileModalStore();

  const handleClick = (e: React.MouseEvent) => {
    const targetUserId = resolvedUser?._id || resolvedUser?.id;
    if (!disableProfileClick && targetUserId) {
      e.stopPropagation();
      openProfile(targetUserId);
    }
  };

  return (
    <Avatar 
      className={cn(
        'transition-transform active:scale-95 duration-200', 
        !disableProfileClick && (resolvedUser?._id || resolvedUser?.id) && 'cursor-pointer hover:ring-2 hover:ring-primary/20',
        className
      )} 
      onClick={handleClick}
      {...props}
    >
      {(resolvedUser?.profilePicture || resolvedUser?.avatar) && (
        <AvatarImage 
          src={resolvedUser.profilePicture || resolvedUser.avatar} 
          alt={resolvedUser.name || resolvedUser.email || 'User'} 
          className="object-cover"
        />
      )}
      <AvatarFallback className={cn('bg-gradient-to-br from-blue-500 to-purple-500 text-white font-semibold', fallbackClassName)}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
