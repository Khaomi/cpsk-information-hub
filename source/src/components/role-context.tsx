"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/src/lib/supabase/client";

export type Role = "admin" | "lecturer" | "ta" | "student";

export type AuthUser = {
  id: string;
  email: string | null;
  displayName: string | null;
};

type RoleContextValue = {
  user: AuthUser | null;
  role: Role;
  isStaff: boolean;
  loading: boolean;
};

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [value, setValue] = useState<RoleContextValue>({
    user: null,
    role: "student",
    isStaff: false,
    loading: true,
  });

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const load = async (): Promise<void> => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        if (!cancelled) setValue({ user: null, role: "student", isStaff: false, loading: false });
        return;
      }

      const { data: profile } = await supabase
        .from("profile")
        .select("role")
        .eq("id", authUser.id)
        .single();

      const role = profile?.role ?? "student";
      const user: AuthUser = {
        id: authUser.id,
        email: authUser.email ?? null,
        displayName:
          (authUser.user_metadata?.display_name as string | undefined) ??
          (authUser.user_metadata?.full_name as string | undefined) ??
          authUser.email?.split("@")[0] ??
          null,
      };

      if (!cancelled) setValue({ user, role, isStaff: role !== "student", loading: false });
    };

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) {
    throw new Error("useRole must be used inside <RoleProvider>");
  }
  return ctx;
}
