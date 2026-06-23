import { verifyOtpAction } from "../actions";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; error?: string }>;
}) {
  const { email, error } = await searchParams;

  return (
    <div className="w-full max-w-sm space-y-8 px-4">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold text-zinc-900">Verifica o teu email</h1>
        <p className="text-sm text-zinc-500">
          Enviámos um código de 6 dígitos para{" "}
          <span className="font-medium text-zinc-700">{email}</span>.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form action={verifyOtpAction} className="space-y-4">
        <input type="hidden" name="email" value={email} />

        <div className="space-y-1.5">
          <label htmlFor="token" className="text-sm font-medium text-zinc-700">
            Código de acesso
          </label>
          <input
            id="token"
            name="token"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            placeholder="000000"
            className="w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent tracking-widest text-center text-lg"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 transition-colors"
        >
          Entrar
        </button>
      </form>

      <p className="text-center text-sm text-zinc-500">
        Email errado?{" "}
        <a href="/login" className="font-medium text-zinc-900 hover:underline">
          Volta atrás
        </a>
      </p>
    </div>
  );
}
