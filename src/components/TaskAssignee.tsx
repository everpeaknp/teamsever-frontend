'use client';

import { useState } from 'react';
import { User, UserPlus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Member {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface TaskAssigneeProps {
  currentAssignee?: Member | null;
  members: Member[];
  onAssign: (userId: string | null, userName: string) => void;
  disabled?: boolean;
  spaceColor?: string;
}

export function TaskAssignee({
  currentAssignee,
  members,
  onAssign,
  disabled = false,
  spaceColor = '#3b82f6',
}: TaskAssigneeProps) {
  const [open, setOpen] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAssign = (userId: string | null, userName: string) => {
    onAssign(userId, userName);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-full"
          disabled={disabled}
        >
          {currentAssignee ? (
            <Avatar className="h-8 w-8">
              <AvatarImage src={currentAssignee.avatar} />
              <AvatarFallback style={{ backgroundColor: spaceColor, color: 'white' }}>
                {getInitials(currentAssignee.name)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-8 w-8 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary transition-colors">
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="space-y-1">
          <div className="px-2 py-1.5 text-sm font-semibold">Assign to</div>
          <ScrollArea className="max-h-64">
            {currentAssignee && (
              <Button
                variant="ghost"
                className="w-full justify-start h-auto py-2 px-2 mb-1"
                onClick={() => handleAssign(null, 'Unassigned')}
              >
                <div className="h-8 w-8 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center mr-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="text-sm">Unassign</span>
              </Button>
            )}
            {members.map((member) => (
              <Button
                key={member._id}
                variant="ghost"
                className={`w-full justify-start h-auto py-2 px-2 ${
                  currentAssignee?._id === member._id ? 'bg-accent' : ''
                }`}
                onClick={() => handleAssign(member._id, member.name)}
              >
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarImage src={member.avatar} />
                  <AvatarFallback style={{ backgroundColor: spaceColor, color: 'white' }}>
                    {getInitials(member.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">{member.name}</span>
                  <span className="text-xs text-muted-foreground">{member.email}</span>
                </div>
              </Button>
            ))}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
