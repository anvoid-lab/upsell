import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SESSION_COOKIE = "vendai_session";
const MIN_SECRET_LENGTH = 32;

let cachedSecret: Uint8Array | null = null;

// Nunca cair para um valor por omissão — um segredo previsível permite forjar
// cookies de sessão. Falha em voz alta em vez de assinar com algo inseguro.
function getSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret;

  const value = process.env.SESSION_SECRET;
  if (!value) {
    throw new Error(
      "SESSION_SECRET não está definido. Gera um com `openssl rand -base64 32` e acrescenta-o ao .env.local."
    );
  }
  if (value.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `SESSION_SECRET tem de ter pelo menos ${MIN_SECRET_LENGTH} caracteres (tem ${value.length}).`
    );
  }

  cachedSecret = new TextEncoder().encode(value);
  return cachedSecret;
}

export type SessionPayload = {
  email: string;
};

export async function createSession(email: string): Promise<void> {
  const token = await new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  // Fora do try: um segredo em falta é erro de configuração e tem de rebentar,
  // não ser confundido com "sessão inválida" e redirecionar para /login.
  const secret = getSecret();

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret);
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
