'use client';

import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { useThemeStore, type ThemeMode, type AccentColor, accentColors } from '@/store/useThemeStore';
import { useTheme } from 'next-themes';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CustomizeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomizeModal({ open, onOpenChange }: CustomizeModalProps) {
  const [activeTab, setActiveTab] = useState<'themes'>('themes');
  const { theme, setTheme } = useTheme();
  const { accentColor, setAccentColor } = useThemeStore();

  const themeOptions: { value: ThemeMode; label: string; preview: string }[] = [
    { value: 'light', label: 'Light', preview: 'bg-white' },
    { value: 'dark', label: 'Dark', preview: 'bg-[#111111]' },
    { value: 'auto', label: 'Auto', preview: 'bg-gradient-to-r from-white to-[#111111]' },
  ];

  const colorOptions: { value: AccentColor; label: string }[] = [
    { value: 'white', label: 'White' },
    { value: 'black', label: 'Black' },
    { value: 'purple', label: 'Purple' },
    { value: 'blue', label: 'Blue' },
    { value: 'pink', label: 'Pink' },
    { value: 'violet', label: 'Violet' },
    { value: 'indigo', label: 'Indigo' },
    { value: 'orange', label: 'Orange' },
    { value: 'teal', label: 'Teal' },
    { value: 'bronze', label: 'Bronze' },
    { value: 'mint', label: 'Mint' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 dark:bg-[#1a1a1a] dark:border-[#262626]">
        <DialogHeader className="px-6 py-4 border-b border-slate-200 dark:border-[#262626]">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold dark:text-white">Customize</DialogTitle>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Personalize and organize your ClickUp interface
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 dark:hover:bg-[#262626]"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-[#262626] px-6">
          {[
            { id: 'themes', label: 'Themes' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto dark:bg-[#1a1a1a]">
          {activeTab === 'themes' && (
            <div className="space-y-8">
              {/* Appearance */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
                  Appearance
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {themeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setTheme(option.value)}
                      className={cn(
                        'relative rounded-lg border-2 p-4 transition-all hover:scale-105',
                        theme === option.value
                          ? 'border-teal-500 shadow-lg'
                          : 'border-slate-200 dark:border-[#262626]'
                      )}
                    >
                      {/* Preview */}
                      <div className="mb-3 h-20 rounded-md overflow-hidden border border-slate-200 dark:border-[#262626]">
                        {option.value === 'auto' ? (
                          <div className="h-full flex">
                            <div className="flex-1 bg-white flex items-center justify-center">
                              <div className="w-8 h-8 rounded bg-teal-500" />
                            </div>
                            <div className="flex-1 bg-[#111111] flex items-center justify-center">
                              <div className="w-8 h-8 rounded bg-teal-500" />
                            </div>
                          </div>
                        ) : (
                          <div className={cn('h-full flex items-center justify-center', option.preview)}>
                            <div className="w-12 h-12 rounded-lg bg-teal-500" />
                          </div>
                        )}
                      </div>
                      
                      {/* Label */}
                      <div className="text-sm font-medium text-slate-900 dark:text-white">
                        {option.label}
                      </div>

                      {/* Check Icon */}
                      {theme === option.value && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* ClickUp Theme */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
                  ClickUp theme
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {colorOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setAccentColor(option.value)}
                      className={cn(
                        'relative rounded-lg border-2 p-4 transition-all hover:scale-105 flex items-center gap-3',
                        accentColor === option.value
                          ? 'border-teal-500 shadow-lg'
                          : 'border-slate-200 dark:border-[#262626]'
                      )}
                    >
                      {/* Color Circle */}
                      <div
                        className="w-6 h-6 rounded-full flex-shrink-0"
                        style={{ backgroundColor: accentColors[option.value] }}
                      />
                      
                      {/* Label */}
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {option.label}
                      </span>

                      {/* Check Icon */}
                      {accentColor === option.value && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
