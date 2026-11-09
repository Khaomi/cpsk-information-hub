import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database.types";
import { createServerClient } from "@supabase/ssr";
import { routing } from "@/src/i18n/routing";

export async function updateSession(request: NextRequest, response?: NextResponse) {
  // When a response is already queued (e.g. next-intl's locale redirect),
  // reuse it instead of creating a fresh one, so its status/location aren't
  // silently discarded.
  let supabaseResponse = response ?? NextResponse.next({
    request,
  });
  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          // Only fabricate a new response when nothing upstream already
          // produced one — recreating it here on a token refresh would drop
          // an in-flight next-intl redirect.
          if (!response) {
            supabaseResponse = NextResponse.next({
              request,
            });
          }
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  // Locale prefix is "as-needed" — only non-default locales (e.g. "th")
  // show up in the pathname, so strip one off (if present) before checking
  // for the unprefixed "/auth" exemption.
  const pathname = request.nextUrl.pathname;
  const localeMatch = pathname.match(
    new RegExp(`^/(${routing.locales.join("|")})(?=/|$)`),
  );
  const locale = localeMatch?.[1] ?? routing.defaultLocale;
  const pathWithoutLocale = localeMatch
    ? pathname.slice(localeMatch[0].length) || "/"
    : pathname;

  if (!user && !pathWithoutLocale.startsWith("/auth")) {
    // no user, redirect to the login page (including "/" itself — the
    // whole app requires sign-in, there's no public home feed)
    const url = request.nextUrl.clone();
    const localePrefix = locale === routing.defaultLocale ? "" : `/${locale}`;
    url.pathname = `${localePrefix}/auth/login`;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
