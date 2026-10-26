"use client";

import { createContext, useContext, useState } from "react";

type MobileFiltersContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

const MobileFiltersContext = createContext<MobileFiltersContextValue | null>(null);

// Wraps the whole app (in layout.tsx) so any component — Header's button,
// FilterableLayout's drawer — can read/set the same "is the mobile filter
// drawer open" state, even though they live in different files.
export function MobileFiltersProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <MobileFiltersContext.Provider
      value={{
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
      }}
    >
      {children}
    </MobileFiltersContext.Provider>
  );
}

// Call this from any component under the provider to read/toggle the drawer.
export function useMobileFilters(): MobileFiltersContextValue {
  const ctx = useContext(MobileFiltersContext);
  if (!ctx) {
    throw new Error("useMobileFilters must be used inside <MobileFiltersProvider>");
  }
  return ctx;
}
