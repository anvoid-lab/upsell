import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * A sessão Supabase é a única fonte de verdade de autenticação.
 *
 * Existia antes um cookie próprio (`vendai_session`) em paralelo. Ter duas
 * camadas era a causa de um modo de falha silencioso: o cookie dizia
 * "autenticado", o Supabase não conhecia a sessão, e o RLS devolvia zero linhas
 * — a app aparecia vazia em vez de mandar o utilizador para o login.
 */
export async function proxy(request: NextRequest) {
  // Webhooks de canais (chamados por um provider) e endpoints internos
  // (chamados pelo pg_cron — migração 008) não trazem sessão de utilizador e
  // não podem ser redirecionados para /login. Sai antes de getUser() para não
  // pagar uma ida ao servidor de auth nestas chamadas — cada rota autentica-se
  // à sua maneira (assinatura HMAC no webhook, segredo partilhado nos jobs).
  if (
    request.nextUrl.pathname.startsWith("/api/webhooks") ||
    request.nextUrl.pathname.startsWith("/api/jobs")
  ) {
    return NextResponse.next({ request });
  }

  // O cliente pode precisar de renovar o token, e essa renovação tem de ser
  // escrita de volta na resposta — daí construir a resposta antes.
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

  // getUser() valida o token no servidor de auth. getSession() apenas lê o
  // cookie e confiaria em algo que o cliente pode ter forjado.
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
