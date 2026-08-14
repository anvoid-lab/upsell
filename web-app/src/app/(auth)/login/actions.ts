"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@db/client";

function backToLogin(mode: "signin" | "signup", message: string, email?: string): never {
  const params = new URLSearchParams({ error: message });
  if (mode === "signup") params.set("mode", "signup");
  if (email) params.set("email", email);
  redirect(`/login?${params.toString()}`);
}

export async function signInAction(formData: FormData): Promise<void> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!email || !password) {
    backToLogin("signin", "Email e password são obrigatórios.", email);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Mensagem deliberadamente genérica: não revelar se o email existe.
    backToLogin("signin", "Email ou password incorrectos.", email);
  }

  redirect("/inbox");
}

export async function signUpAction(formData: FormData): Promise<void> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const businessName = (formData.get("business_name") as string)?.trim();

  if (!email || !password) {
    backToLogin("signup", "Email e password são obrigatórios.", email);
  }
  if (password.length < 8) {
    backToLogin("signup", "A password tem de ter pelo menos 8 caracteres.", email);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Lido pelo trigger handle_new_user para nomear o negócio do novo tenant.
    options: { data: { business_name: businessName || null } },
  });

  if (error) {
    backToLogin("signup", error.message, email);
  }

  // Com "Confirm email" ligado no Supabase não vem sessão — o utilizador tem de
  // confirmar antes de entrar. Distinguir os dois casos evita um redirect para
  // /inbox que o proxy manda logo de volta para /login.
  if (!data.session) {
    redirect(`/login?mode=signin&notice=${encodeURIComponent("Conta criada. Confirma o teu email antes de entrar.")}`);
  }

  redirect("/inbox");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
