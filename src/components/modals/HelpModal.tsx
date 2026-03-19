'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Keyboard,
  Search,
  Plus,
  Users,
  Settings,
  MessageSquare,
  CheckSquare,
  Folder,
  List,
  Bell,
  Palette,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface HelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HelpModal({ open, onOpenChange }: HelpModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Help & Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Learn how to use Teamsever efficiently with these tips and shortcuts
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Getting Started */}
            <section>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-primary" />
                Getting Started
              </h3>
              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <p>• <strong>Workspaces:</strong> Create workspaces to organize different projects or teams</p>
                <p>• <strong>Spaces:</strong> Within workspaces, create spaces for different areas (e.g., Marketing, Engineering)</p>
                <p>• <strong>Lists:</strong> Organize tasks into lists within each space</p>
                <p>• <strong>Tasks:</strong> Create and manage individual tasks with priorities, assignees, and due dates</p>
              </div>
            </section>

            {/* Keyboard Shortcuts */}
            <section>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-primary" />
                Keyboard Shortcuts
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Search className="w-4 h-4 text-slate-500" />
                    <span className="text-sm text-slate-900 dark:text-white">Open Search</span>
                  </div>
                  <kbd className="px-3 py-1 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 text-xs font-mono">
                    Cmd/Ctrl + K
                  </kbd>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Keyboard className="w-4 h-4 text-slate-500" />
                    <span className="text-sm text-slate-900 dark:text-white">Navigate Results</span>
                  </div>
                  <kbd className="px-3 py-1 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 text-xs font-mono">
                    ↑ ↓
                  </kbd>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckSquare className="w-4 h-4 text-slate-500" />
                    <span className="text-sm text-slate-900 dark:text-white">Select Item</span>
                  </div>
                  <kbd className="px-3 py-1 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 text-xs font-mono">
                    Enter
                  </kbd>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="w-4 h-4 text-slate-500">✕</span>
                    <span className="text-sm text-slate-900 dark:text-white">Close Modal</span>
                  </div>
                  <kbd className="px-3 py-1 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 text-xs font-mono">
                    Esc
                  </kbd>
                </div>
              </div>
            </section>

            {/* Features */}
            <section>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                Key Features
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Search className="w-4 h-4 text-primary" />
                    <h4 className="font-semibold text-sm text-slate-900 dark:text-white">Global Search</h4>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Search across all spaces, lists, and tasks instantly
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    <h4 className="font-semibold text-sm text-slate-900 dark:text-white">Team Chat</h4>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Collaborate with group chat and direct messages
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-primary" />
                    <h4 className="font-semibold text-sm text-slate-900 dark:text-white">Permissions</h4>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Control access at workspace, space, and list levels
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Bell className="w-4 h-4 text-primary" />
                    <h4 className="font-semibold text-sm text-slate-900 dark:text-white">Notifications</h4>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Stay updated with real-time notifications
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Palette className="w-4 h-4 text-primary" />
                    <h4 className="font-semibold text-sm text-slate-900 dark:text-white">Themes</h4>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Customize colors and switch between light/dark mode
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Folder className="w-4 h-4 text-primary" />
                    <h4 className="font-semibold text-sm text-slate-900 dark:text-white">Organization</h4>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Organize with workspaces, spaces, lists, and tasks
                  </p>
                </div>
              </div>
            </section>

            {/* Tips & Tricks */}
            <section>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
                💡 Tips & Tricks
              </h3>
              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <p>• Use <strong>Cmd/Ctrl + K</strong> to quickly find any task, list, or space</p>
                <p>• Click the <strong>palette icon</strong> to customize your workspace colors</p>
                <p>• Invite team members from the <strong>Members</strong> button in the sidebar</p>
                <p>• Use <strong>priorities</strong> (Low, Medium, High, Urgent) to organize tasks</p>
                <p>• Assign tasks to team members for better collaboration</p>
                <p>• Use <strong>Group Chat</strong> for team discussions and <strong>DMs</strong> for private conversations</p>
              </div>
            </section>

            {/* Need More Help */}
            <section className="border-t border-slate-200 dark:border-slate-700 pt-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
                Need More Help?
              </h3>
              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <p>• Check your workspace settings for advanced options</p>
                <p>• Contact your workspace admin for permission issues</p>
                <p>• Use the notification bell to stay updated on changes</p>
              </div>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
