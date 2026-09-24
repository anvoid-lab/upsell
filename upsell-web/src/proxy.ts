import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * The Supabase session is the only source of truth for authentication.
 *
 * A separate `vendai_session` cookie previously existed in parallel. Having two
 * layers caused a silent failure mode: the cookie reported an authenticated
 * user while Supabase did not know the session, so RLS returned no rows and the
 * app appeared empty instead of redirecting the user to login.
 */
export async function proxy(request: NextRequest) {
  // Provider webhooks and internal endpoints called by pg_cron do not carry a
  // user session and cannot be redirected to /login. Return before getUser() to
  // avoid an authentication server request; each route authenticates itself.
  if (
    (request.method === "POST" && request.nextUrl.pathname === "/inbox/webhooks/channel") ||
    request.nextUrl.pathname.startsWith("/api/jobs")
  ) {
    return NextResponse.next({ request });
  }

  // The client may refresh its token, and that refresh must be written back to
  // the response, so create the response first.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() validates the token with the auth server. getSession() only reads
  // the cookie and would trust a value that the client could have forged.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/auth/callback");

  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/inbox";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
