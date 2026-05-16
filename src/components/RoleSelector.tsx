'use client';

import React from 'react';
import { Shield, User as UserIcon, Eye, Plus, Settings2, FolderOpen, Check, Key } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { ICustomRole } from '@/types/pro-features';
import { Badge } from '@/components/ui/badge';

interface RoleSelectorProps {
  value: string;
  customRole?: ICustomRole | null;
  availableCustomRoles?: ICustomRole[];
  onChange: (value: string) => void;
  onAddCustomRole: () => void;
  onAssignCustomRole: (roleId: string) => void;
  disabled?: boolean;
  canUseCustomRoles?: boolean;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({
  value,
  customRole,
  availableCustomRoles = [],
  onChange,
  onAddCustomRole,
  onAssignCustomRole,
  disabled,
  canUseCustomRoles = false,
}) => {
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return 'Owner';
      case 'admin': return 'Admin';
      case 'operations_manager': return 'Operations Manager';
      case 'project_manager': return 'Project Manager';
      case 'qa': return 'QA';
      case 'developer': return 'Developer';
      case 'member': return 'Member';
      case 'guest': return 'Guest';
      default: return role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ');
    }
  };

  return (
    <Select value={customRole ? `custom:${customRole._id}` : value} onValueChange={(val) => {
      if (val.startsWith('custom:')) {
        onAssignCustomRole(val.split(':')[1]);
      } else {
        onChange(val);
      }
    }} disabled={disabled}>
      <SelectTrigger className="w-[200px]">
        <SelectValue>
          {customRole ? (
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline"
                style={{ 
                  backgroundColor: customRole.color + '15', 
                  color: customRole.color, 
                  borderColor: customRole.color + '40' 
                }}
                className="flex items-center gap-2 w-fit border px-1 h-5 text-[10px]"
              >
                {customRole.label}
              </Badge>
              <span className="truncate">{customRole.name}</span>
            </div>
          ) : (
            <span>{getRoleLabel(value)}</span>
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
        <SelectItem value="operations_manager">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-orange-500" />
            Operations Manager
          </div>
        </SelectItem>
        <SelectItem value="project_manager">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-purple-500" />
            Project Manager
          </div>
        </SelectItem>
        <SelectItem value="developer">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-green-500" />
            Developer
          </div>
        </SelectItem>
        <SelectItem value="qa">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-amber-500" />
            QA
          </div>
        </SelectItem>
        <SelectItem value="member">
          <div className="flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-emerald-500" />
            Member
          </div>
        </SelectItem>
        <SelectItem value="guest">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-gray-500" />
            Guest
          </div>
        </SelectItem>
        
        {canUseCustomRoles && availableCustomRoles.length > 0 && (
          <>
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1">Custom Roles</div>
            {availableCustomRoles.map((role) => (
              <SelectItem key={role._id} value={`custom:${role._id}`}>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: role.color }}
                  />
                  {role.name}
                </div>
              </SelectItem>
            ))}
          </>
        )}

        {canUseCustomRoles && (
          <>
            <div className="border-t my-1"></div>
            <div 
              className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground text-purple-600 dark:text-purple-400 font-medium"
              onClick={(e) => {
                e.stopPropagation();
                onAddCustomRole();
              }}
              role="button"
              tabIndex={0}
            >
              <Plus className="w-4 h-4 mr-2" />
              Manage Roles
            </div>
          </>
        )}
      </SelectContent>
    </Select>
  );
};
