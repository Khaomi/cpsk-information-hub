import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

// This page is inherently per-request (reads a runtime error code from the
// query string) — opt out of static prerendering instead of fighting PPR's
// Suspense-boundary requirement for an already-trivial route.
export const instant = false;

async function ErrorContent({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  const params = await searchParams;
  const t = await getTranslations();

  return (
    <>
      {params?.error ? (
        <p className="text-sm text-muted-foreground">
          {t("authError.codeError", { error: params.error })}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t("authError.unspecified")}
        </p>
      )}
    </>
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  const t = await getTranslations();
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                {t("authError.heading")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense>
                <ErrorContent searchParams={searchParams} />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
