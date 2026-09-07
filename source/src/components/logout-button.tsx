"use client";

import { createClient } from "@/src/lib/supabase/client";
import { Button } from "@/src/components/ui/button";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  };

  return <Button onClick={logout}>Logout</Button>;
}
