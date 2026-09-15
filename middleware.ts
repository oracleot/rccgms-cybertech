import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { currentPathWithQuery } from "@/lib/auth/next-url"
import { DOCK_COOKIE, dockKeyHash } from "@/lib/lyrics/dock-key"

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do not run any code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Redirect /register to /login (self-registration disabled - invite-only)
  if (request.nextUrl.pathname.startsWith("/register")) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  // Operator dock key exchange: when the dock is opened with ?key=…, validate
  // it against the LYRICS_DOCK_KEY secret and, on a match, drop a cookie
  // holding the key's HASH and redirect to a clean URL so the secret doesn't
  // stay in the address bar or OBS's saved dock URL. The dock page itself does
  // the actual gate check; this only performs the one-time exchange. Only the
  // exact dock path, never the public display or the read-only monitor.
  if (request.nextUrl.pathname === "/lyrics/obs/dock") {
    const secret = process.env.LYRICS_DOCK_KEY
    const provided = request.nextUrl.searchParams.get("key")
    if (secret && provided && provided === secret) {
      const clean = request.nextUrl.clone()
      clean.searchParams.delete("key")
      const res = NextResponse.redirect(clean)
      res.cookies.set(DOCK_COOKIE, await dockKeyHash(secret), {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/lyrics/obs/dock",
        maxAge: 60 * 60 * 24 * 30,
      })
      return res
    }
  }

  const isAuthRoute = request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/forgot-password") ||
    request.nextUrl.pathname.startsWith("/reset-password") ||
    request.nextUrl.pathname.startsWith("/auth/callback") ||
    request.nextUrl.pathname.startsWith("/accept-invite") ||
    request.nextUrl.pathname.startsWith("/verify")

  const isPublicRoute = request.nextUrl.pathname === "/" ||
    request.nextUrl.pathname.startsWith("/api/") || // API routes handle their own auth
    request.nextUrl.pathname.startsWith("/api/health") ||
    request.nextUrl.pathname.startsWith("/designs/request") || // Public design request form
    request.nextUrl.pathname.startsWith("/availability") || // Public availability form
    request.nextUrl.pathname.startsWith("/bible/obs") || // OBS browser source overlay (no auth)
    request.nextUrl.pathname.startsWith("/lyrics/obs") // OBS browser source overlay (no auth)

  // If user is not logged in and trying to access protected route.
  // The whole path including its query is preserved, so "/lyrics?mode=edit"
  // comes back intact after the magic-link round trip rather than as a bare
  // "/lyrics" — see lib/auth/next-url.ts for the canonical `next` contract.
  if (!user && !isAuthRoute && !isPublicRoute) {
    const url = request.nextUrl.clone()
    const destination = currentPathWithQuery(request.nextUrl)
    url.pathname = "/login"
    url.search = ""
    url.searchParams.set("next", destination)
    return NextResponse.redirect(url)
  }

  // If user is logged in and trying to access auth routes
  // Exception: accept-invite needs to stay accessible so users can set their password
  if (user && isAuthRoute && 
      !request.nextUrl.pathname.startsWith("/auth/callback") &&
      !request.nextUrl.pathname.startsWith("/accept-invite")) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
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

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - manifest files
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
