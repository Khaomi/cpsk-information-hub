import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { GoogleAuthButton } from "@/src/components/google-auth-button";

// This page is inherently per-request (reads a `next` redirect target from
// the query string) — opt out of static prerendering instead of fighting
// PPR's Suspense-boundary requirement for an already-trivial route.
export const instant = false;

async function GoogleAuthButtonWithNext({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return <GoogleAuthButton next={next} />;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const t = await getTranslations();
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <h1 className="text-2xl font-bold mb-1">{t("login.heading")}</h1>
        <p className="text-stone-600 mb-8">{t("common.tagline")}</p>
        <Suspense fallback={<GoogleAuthButton />}>
          <GoogleAuthButtonWithNext searchParams={searchParams} />
        </Suspense>
        <p className="text-xs text-stone-400 mt-3">
          {t.rich("login.emailNote", {
            email: (chunks) => <span className="font-medium text-stone-600">{chunks}</span>,
          })}
        </p>
      </div>
    </div>
  );
}
