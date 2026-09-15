import { Suspense } from "react";
import { GoogleAuthButton } from "@/src/components/google-auth-button";

async function GoogleAuthButtonWithNext({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return <GoogleAuthButton next={next} />;
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <h1 className="text-2xl font-bold mb-1">Welcome to CPSK</h1>
        <p className="text-stone-600 mb-8">Department Information &amp; Communication Hub</p>
        <Suspense fallback={<GoogleAuthButton />}>
          <GoogleAuthButtonWithNext searchParams={searchParams} />
        </Suspense>
        <p className="text-xs text-stone-400 mt-3">
          Please use <span className="font-medium text-stone-600">@ku.th</span> email to login
        </p>
      </div>
    </div>
  );
}
