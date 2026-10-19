'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Settings, HelpCircle, Palette, User, LogOut, Building2, Keyboard, Menu, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useUIStore } from '@/store/useUIStore';
import { SearchButton } from '@/components/search/SearchButton';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { DesktopDownloadButton } from '@/components/layout/DesktopDownloadButton';
import { CustomizeModal } from '@/components/theme/CustomizeModal';
import { HelpModal } from '@/components/modals/HelpModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { clearAuthData } from '@/lib/auth';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import { getManageWorkspaceHref } from '@/lib/workspaceNavigation';

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const currentWorkspaceId = useAuthStore(state => state.currentWorkspaceId);
  const { toggleSidebar } = useUIStore();
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const handleLogout = () => {
    clearAuthData();
    toast.success('Logged out successfully');
    router.push('/login');
  };

  const handleSwitchWorkspace = () => {
    router.push('/dashboard');
  };

  const handleManageWorkspaces = () => {
    router.push(getManageWorkspaceHref(pathname, currentWorkspaceId));
  };

  const handleAccountManagement = () => {
    router.push('/account');
  };

  const handleHelpCenter = () => {
    setHelpOpen(true);
  };

  const handleKeyboardShortcuts = () => {
    setHelpOpen(true);
  };

  return (
    <>
      <header className="h-14 min-w-0 border-b border-slate-200 dark:border-[#262626] bg-white dark:bg-[#1a1a1a] flex items-center justify-between gap-2 px-3 sm:px-4 flex-shrink-0">
        {/* Left Section */}
        <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-4">
          {/* Desktop Sidebar Toggle - Hidden on mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex h-9 w-9 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#262626]"
            onClick={toggleSidebar}
            title="Toggle Sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <Link href="/dashboard" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
            <Image src="/teamsever_logo.png" alt="TeamsEver Logo" width={22} height={22} className="rounded-md" />
            <h1 className="text-base sm:text-xl font-semibold text-slate-900 dark:text-white">TeamsEver</h1>
          </Link>
        </div>

        {/* Center Section - Search (Hidden on small mobile) */}
        <div className="hidden sm:flex flex-1 justify-center max-w-2xl mx-auto px-4">
          <div className="w-full max-w-xl">
            <SearchButton />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
          <div className="h-6 w-px bg-slate-200 dark:bg-[#262626] hidden sm:block" />

          <div className="hidden sm:block"><DesktopDownloadButton /></div>

          <div className="sm:hidden"><SearchButton compact /></div>
          
          <NotificationBell />
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="hidden sm:flex h-11 w-11 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#262626]"
            onClick={() => setCustomizeOpen(true)}
            title="Customize Theme"
          >
            <Palette className="h-5 w-5" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="hidden sm:flex h-11 w-11 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#262626]"
            onClick={handleHelpCenter}
            title="Help Center"
          >
            <HelpCircle className="h-5 w-5" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-11 w-11 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#262626]"
                title="Settings & Account"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-[80vh] w-56 overflow-y-auto">
              <DropdownMenuItem onClick={handleAccountManagement}>
                <User className="w-4 h-4 mr-2" />
                Account Management
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSwitchWorkspace}>
                <Building2 className="w-4 h-4 mr-2" />
                Switch Workspace
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleManageWorkspaces}>
                <Settings2 className="w-4 h-4 mr-2" />
                Manage Workspaces
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCustomizeOpen(true)}>
                <Palette className="w-4 h-4 mr-2" />
                Customize theme
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleHelpCenter}>
                <HelpCircle className="w-4 h-4 mr-2" />
                Help center
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleKeyboardShortcuts}>
                <Keyboard className="w-4 h-4 mr-2" />
                Keyboard Shortcuts
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <CustomizeModal open={customizeOpen} onOpenChange={setCustomizeOpen} />
      <HelpModal open={helpOpen} onOpenChange={setHelpOpen} />
    </>
  );
}
