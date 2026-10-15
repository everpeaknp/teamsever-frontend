'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface MobileConversationContextValue {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const MobileConversationContext = createContext<MobileConversationContextValue>({
  isOpen: false,
  setIsOpen: () => undefined,
});

export function MobileConversationProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <MobileConversationContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
    </MobileConversationContext.Provider>
  );
}

export function useMobileConversationScreen(isOpen: boolean) {
  const { setIsOpen } = useContext(MobileConversationContext);

  useEffect(() => {
    setIsOpen(isOpen);
    return () => setIsOpen(false);
  }, [isOpen, setIsOpen]);
}

export function useIsMobileConversationOpen() {
  return useContext(MobileConversationContext).isOpen;
}
