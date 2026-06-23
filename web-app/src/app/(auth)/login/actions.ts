"use server";

import { redirect } from "next/navigation";
import { createSession } from "@/lib/session";
import { createSupabaseServerClient } from "@db/client";

export async function requestMagicLinkAction(formData: FormData): Promise<void> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  if (!email) {
    redirect(`/login?error=${encodeURIComponent("Email obrigatório.")}`);
  }

  await createSession(email);
  redirect("/inbox");
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

  await createSession(email);
  redirect("/inbox");
}
