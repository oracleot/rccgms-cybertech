import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { currentPathWithQuery } from "@/lib/auth/next-url"
import {
  OBS_ACCESS_COOKIE,
  getObsAccessSecret,
  isObsDockPath,
  sanitizeDockNext,
  verifyObsSessionToken,
} from "@/lib/obs-access"

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

  // OBS control docks: the display overlays under /bible/obs and /lyrics/obs
  // stay fully public (OBS browser sources render them with no session), but
  // the EXACT dock paths (/bible/obs/dock, /lyrics/obs/dock) require either a
  // Fusion login or a redeemed OBS access session (see lib/obs-access.ts).
  // The OBS cookie is consulted here and nowhere else, so it can never grant
  // access to any other route.
  // Self-heal for OBS: a login page left sitting at /login?next=<dock> (e.g.
  // an OBS browser panel that was redirected before the code was redeemed)
  // bounces straight back to the dock once a valid OBS session exists.
  if (!user && request.nextUrl.pathname === "/login") {
    const dockNext = sanitizeDockNext(request.nextUrl.searchParams.get("next"))
    if (dockNext) {
      const token = request.cookies.get(OBS_ACCESS_COOKIE)?.value
      const secret = getObsAccessSecret()
      if (token && secret && (await verifyObsSessionToken(token, secret))) {
        return NextResponse.redirect(new URL(dockNext, request.url))
      }
    }
  }

  if (!user && isObsDockPath(request.nextUrl.pathname)) {
    const token = request.cookies.get(OBS_ACCESS_COOKIE)?.value
    const secret = getObsAccessSecret()
    const hasObsSession =
      token && secret ? await verifyObsSessionToken(token, secret) : false
    if (!hasObsSession) {
      const url = request.nextUrl.clone()
      const destination = currentPathWithQuery(request.nextUrl)
      url.pathname = "/login"
      url.search = ""
      url.searchParams.set("next", destination)
      return NextResponse.redirect(url)
    }
  }

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
    "/((?!_next/static|_next/image|favicon.ico|manifest\\.webmanifest|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
