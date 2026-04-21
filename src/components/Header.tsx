'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, HelpCircle, Palette, User, LogOut, Building2, Keyboard, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useUIStore } from '@/store/useUIStore';
import { SearchButton } from '@/components/search/SearchButton';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { CustomizeModal } from '@/components/theme/CustomizeModal';
import { HelpModal } from '@/components/modals/HelpModal';
import { MobileSidebar } from '@/components/sidebar/MobileSidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { clearAuthData } from '@/lib/auth';
import { toast } from 'sonner';

export function Header() {
  const router = useRouter();
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
      <header className="h-14 border-b border-slate-200 dark:border-[#262626] bg-white dark:bg-[#1a1a1a] flex items-center justify-between px-2 sm:px-4 flex-shrink-0">
        {/* Left Section */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Mobile Menu Button */}
          <MobileSidebar />
          
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
          
          <div className="flex items-center gap-2">
            <Image src="/teamsever_logo.png" alt="Teamsever Logo" width={24} height={24} className="rounded-md" />
            <h1 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">Teamsever</h1>
          </div>
        </div>

        {/* Center Section - Search (Hidden on small mobile) */}
        <div className="hidden sm:flex flex-1 justify-center max-w-2xl mx-auto px-4">
          <div className="w-full max-w-xl">
            <SearchButton />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          <div className="h-6 w-px bg-slate-200 dark:bg-[#262626] hidden sm:block" />
          
          <NotificationBell />
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="hidden sm:flex h-9 w-9 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#262626]"
            onClick={() => setCustomizeOpen(true)}
            title="Customize Theme"
          >
            <Palette className="h-5 w-5" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="hidden sm:flex h-9 w-9 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#262626]"
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
                className="h-9 w-9 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#262626]"
                title="Settings & Account"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handleAccountManagement}>
                <User className="w-4 h-4 mr-2" />
                Account Management
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSwitchWorkspace}>
                <Building2 className="w-4 h-4 mr-2" />
                Switch Workspace
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
