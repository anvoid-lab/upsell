import { signInAction, signUpAction } from "./actions";

const inputClass =
  "w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent";
const labelClass = "text-sm font-medium text-zinc-700";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string; mode?: string; email?: string }>;
}) {
  const { error, notice, mode, email } = await searchParams;
  const isSignUp = mode === "signup";

  return (
    <div className="w-full max-w-sm space-y-8 px-4">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold text-zinc-900">
          {isSignUp ? "Criar conta VendAI" : "Entrar no VendAI"}
        </h1>
        <p className="text-sm text-zinc-500">
          {isSignUp
            ? "Cria a conta do teu negócio para começares."
            : "Introduz o teu email e password."}
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {notice && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      )}

      <form action={isSignUp ? signUpAction : signInAction} className="space-y-4">
        {isSignUp && (
          <div className="space-y-1.5">
            <label htmlFor="business_name" className={labelClass}>
              Nome do negócio
            </label>
            <input
              id="business_name"
              name="business_name"
              type="text"
              placeholder="Shop &amp; Go Luanda"
              className={inputClass}
            />
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={email}
            required
            placeholder="exemplo@empresa.com"
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className={labelClass}>
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            required
            minLength={isSignUp ? 8 : undefined}
            placeholder="••••••••"
            className={inputClass}
          />
          {isSignUp && (
            <p className="text-xs text-zinc-400">Mínimo 8 caracteres.</p>
          )}
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 transition-colors"
        >
          {isSignUp ? "Criar conta" : "Entrar"}
        </button>
      </form>

      <p className="text-center text-sm text-zinc-500">
        {isSignUp ? (
          <>
            Já tens conta?{" "}
            <a href="/login" className="font-medium text-zinc-900 hover:underline">
              Entrar
            </a>
          </>
        ) : (
          <>
            Ainda não tens conta?{" "}
            <a
              href="/login?mode=signup"
              className="font-medium text-zinc-900 hover:underline"
            >
              Criar conta
            </a>
          </>
        )}
      </p>
    </div>
  );
}
