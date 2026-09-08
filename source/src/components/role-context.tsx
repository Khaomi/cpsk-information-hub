"use client";

import { createContext, useContext, useState } from "react";

// TODO: remove this entire mock system once real sessions provide the role.
// At that point, role should come from the authenticated user's Supabase
// session/profile, not from a manually-toggled switcher.
export type Role = "student" | "staff" | "admin";

type RoleContextValue = {
  role: Role;
  setRole: (role: Role) => void;
};

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>("student");
  return <RoleContext.Provider value={{ role, setRole }}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) {
    throw new Error("useRole must be used inside <RoleProvider>");
  }
  return ctx;
}
