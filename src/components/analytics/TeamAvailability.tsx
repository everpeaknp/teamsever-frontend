'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface TeamAvailabilityProps {
  members: any[];
}

export function TeamAvailability({ members }: TeamAvailabilityProps) {
  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20">Clocked In</Badge>;
      case 'break':
        return <Badge className="bg-amber-50 text-amber-600 dark:bg-amber-900/20">On Break</Badge>;
      default:
        return <Badge variant="outline">Clocked Out</Badge>;
    }
  };

  const displayMembers = members.slice(0, 5);

  return (
    <Card className="flex flex-col">
      <div className="px-6 py-4 border-b flex justify-between items-center">
        <h4 className="font-bold">Team Availability</h4>
        <span className="text-xs text-muted-foreground">Live Now</span>
      </div>
      <CardContent className="p-6 space-y-4 flex-grow">
        {displayMembers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No team members</p>
          </div>
        ) : (
          displayMembers.map((member: any) => {
            const user = typeof member.user === 'object' ? member.user : member;
            const userName = user?.name || 'Unknown';
            const userAvatar = user?.avatar;
            
            return (
              <div key={member._id || member.user} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="w-10 h-10">
                      {userAvatar && <AvatarImage src={userAvatar} />}
                      <AvatarFallback>{getInitials(userName)}</AvatarFallback>
                    </Avatar>
                    <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white dark:border-slate-800 rounded-full ${
                      member.status === 'active' ? 'bg-emerald-500' : 
                      member.status === 'break' ? 'bg-amber-500' : 'bg-slate-300'
                    }`}></div>
                  </div>
                  <div>
                    <p className="text-sm font-bold">{userName}</p>
                    {getStatusBadge(member.status || 'inactive')}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
