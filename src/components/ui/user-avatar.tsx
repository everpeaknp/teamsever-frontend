import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  user?: {
    name?: string;
    email?: string;
    avatar?: string;
  };
  className?: string;
  fallbackClassName?: string;
}

export function UserAvatar({ user, className, fallbackClassName }: UserAvatarProps) {
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

  return (
    <Avatar className={cn('', className)}>
      {user?.avatar && <AvatarImage src={user.avatar} alt={user.name || user.email || 'User'} />}
      <AvatarFallback className={cn('bg-gradient-to-br from-blue-500 to-purple-500 text-white font-semibold', fallbackClassName)}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
