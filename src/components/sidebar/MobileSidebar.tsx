'use client';

import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { AppSidebar } from './AppSidebar';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

export function MobileSidebar({
  variant = 'header',
  active = false,
}: {
  variant?: 'header' | 'bottom';
  active?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isBottomTab = variant === 'bottom';

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size={isBottomTab ? 'default' : 'icon'}
          aria-label={isBottomTab ? 'More' : 'Open navigation menu'}
          aria-current={isBottomTab && active ? 'page' : undefined}
          className={cn(
            'lg:hidden text-muted-foreground hover:text-foreground hover:bg-accent',
            isBottomTab
              ? `flex h-14 w-full flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-medium ${active ? 'bg-primary/10 text-primary' : ''}`
              : 'h-11 w-11'
          )}
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
          {isBottomTab ? <span>More</span> : <span className="sr-only">Toggle menu</span>}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="h-[100dvh] !w-screen !max-w-none p-0 sm:!w-[300px] sm:!max-w-sm"
        hideCloseButton
        onClickCapture={(event) => {
          const target = event.target;
          if (target instanceof Element && target.closest('a[href], [data-mobile-sidebar-navigation]')) {
            setOpen(false);
          }
        }}
      >
        <VisuallyHidden>
          <SheetTitle>Navigation Menu</SheetTitle>
          <SheetDescription>Main navigation and workspace switcher sidebar for mobile devices</SheetDescription>
        </VisuallyHidden>
        <AppSidebar isMobile />
      </SheetContent>
    </Sheet>
  );
}
