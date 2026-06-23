"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@db/client";
import { headers } from "next/headers";

export async function requestMagicLinkAction(formData: FormData): Promise<void> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  if (!email) {
    redirect(`/login?error=${encodeURIComponent("Email obrigatório.")}`);
  }

  const headersList = await headers();
  const origin = headersList.get("origin") ?? "http://localhost:3000";

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent("Não foi possível enviar o link. Tenta novamente.")}`);
  }

  redirect(`/login/check-email?email=${encodeURIComponent(email)}`);
}

export async function verifyOtpAction(formData: FormData): Promise<void> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const token = (formData.get("token") as string)?.trim();

  if (!email || !token) {
    redirect(`/login/verify?email=${encodeURIComponent(email ?? "")}&error=${encodeURIComponent("Código inválido.")}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });

  if (error) {
    redirect(`/login/verify?email=${encodeURIComponent(email)}&error=${encodeURIComponent("Código incorrecto ou expirado. Tenta novamente.")}`);
  }

  redirect("/inbox");
}
