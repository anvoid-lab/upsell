import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@db/client";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/inbox`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("Link inválido ou expirado. Tenta novamente.")}`);
}
