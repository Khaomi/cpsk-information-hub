import { updateSession } from "@/src/lib/supabase/proxy";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/src/i18n/routing";
import { type NextRequest } from "next/server";

const handleI18nRouting = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  // The OAuth callback path is registered with Google/Supabase as a fixed,
  // unprefixed URL — it must never be touched by locale routing.
  if (request.nextUrl.pathname.startsWith("/auth/callback")) {
    return await updateSession(request);
  }

  const intlResponse = handleI18nRouting(request);
  return await updateSession(request, intlResponse);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
