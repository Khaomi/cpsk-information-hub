import { createClient } from "@/src/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const redirectPath = next?.startsWith("/") ? next : "/";

  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "http";
  const forwardedHost = request.headers.get("x-forwarded-host") ?? "localhost:3000";
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL ?? `${forwardedProto}://${forwardedHost}`;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(redirectPath, siteUrl).toString());
    }
  }

  return NextResponse.redirect(
    new URL("/auth/error?error=Unable%20to%20sign%20in%20with%20Google", siteUrl).toString(),
  );
}