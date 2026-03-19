'use client';

import React from 'react';
import { Shield, User as UserIcon, Eye, Plus } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface RoleSelectorProps {
  value: string;
  customRoleTitle?: string;
  onChange: (value: string) => void;
  onAddCustomRole: () => void;
  disabled?: boolean;
  canUseCustomRoles?: boolean;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({
  value,
  customRoleTitle,
  onChange,
  onAddCustomRole,
  disabled,
  canUseCustomRoles = false,
}) => {
  const displayValue = customRoleTitle || value;

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-[180px]">
        <SelectValue>
          {customRoleTitle ? (
            <div className="flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-purple-500" />
              <span>{customRoleTitle}</span>
            </div>
          ) : (
            <span className="capitalize">{value}</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="admin">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-500" />
            Admin
          </div>
        </SelectItem>
        <SelectItem value="member">
          <div className="flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-green-500" />
            Member
          </div>
        </SelectItem>
        <SelectItem value="guest">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-gray-500" />
            Guest
          </div>
        </SelectItem>
        
        {canUseCustomRoles && (
          <>
            <div className="border-t my-1"></div>
            <div 
              className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onAddCustomRole();
              }}
              role="button"
              tabIndex={0}
            >
              <Plus className="w-4 h-4 mr-2 text-purple-500" />
              <span className="text-purple-600 dark:text-purple-400 font-medium">
                {customRoleTitle ? 'Edit Custom Role' : 'Add New Role'}
              </span>
            </div>
          </>
        )}
      </SelectContent>
    </Select>
  );
};
