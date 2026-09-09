"use client";

import { createClient } from "@/src/lib/supabase/client";
import { Button } from "@/src/components/ui/button";
import { useState } from "react";

export function GoogleAuthButton() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    const redirectURL = process.env.NEXT_PUBLIC_BASE_URL ? `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback` : `${window.location.origin}/auth/callback`;

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectURL,
        // Without this, Google silently re-authenticates with whichever
        // account is already active in the browser instead of letting the
        // user pick — this is what makes re-login always land on the same
        // email even after signing out of the app.
        queryParams: {
          prompt: "select_account",
        },
      },
    });

    if (error) {
      setError(error.message);
      setIsLoading(false);
    }
  };

  return (
    // <div className="flex flex-col gap-3">
      <button
        type="button"
        className="w-full rounded-md bg-gradient-to-r from-orange-400 to-teal-500 text-white font-medium py-3 hover:opacity-90 transition-opacity"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
      >
        {isLoading ? "Redirecting..." : "Continue with Google"}
      </button>
    //   {error && <p className="text-sm text-red-500">{error}</p>}
    // </div>
  );
}
