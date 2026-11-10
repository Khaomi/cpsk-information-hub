"use client";

import { useTranslations } from "next-intl";
import { createClient } from "@/src/lib/supabase/client";
import { useState } from "react";

export function GoogleAuthButton({ next }: { next?: string }) {
  const t = useTranslations();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    // Must be the origin the user is actually on: Supabase stores the PKCE
    // code verifier as a cookie on this origin, so if the callback lands on a
    // different host (e.g. localhost vs 127.0.0.1, or a Vercel preview URL vs
    // NEXT_PUBLIC_BASE_URL) the code exchange fails and the user has to sign
    // in a second time.
    const base = window.location.origin;
    const redirectURL = next
      ? `${base}/auth/callback?next=${encodeURIComponent(next)}`
      : `${base}/auth/callback`;

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
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

    if (authError) {
      setError(authError.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        className="w-full rounded-md bg-gradient-to-r from-orange-400 to-teal-500 text-white font-medium py-3 hover:opacity-90 transition-opacity"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
      >
        {isLoading ? t("login.redirecting") : t("login.continueWithGoogle")}
      </button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}