import { signInAction, signUpAction } from "./actions";
import Image from "next/image";

const inputClass =
  "h-12 w-full rounded-full border border-zinc-200 bg-transparent px-5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-primary-600 focus:ring-2 focus:ring-primary-100";
const labelClass = "text-sm font-semibold text-zinc-800";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string; mode?: string; email?: string }>;
}) {
  const { error, notice, mode, email } = await searchParams;
  const isSignUp = mode === "signup";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1480px] gap-10 p-5 lg:p-6">
      <section className="relative hidden min-h-[calc(100vh-3rem)] flex-1 overflow-hidden rounded-[22px] bg-primary-600 px-10 py-12 text-white lg:flex lg:flex-col lg:items-center">
        <div className="relative z-10 w-full max-w-[700px] text-center">
          <p className="text-lg font-bold tracking-tight">VendAI</p>
          <h2 className="mt-12 text-4xl font-extrabold leading-tight tracking-[-0.04em] xl:text-5xl">
            Vende mais. Cresce melhor.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base font-medium leading-relaxed text-blue-50">
            Centraliza as tuas conversas e transforma cada contacto numa nova oportunidade.
          </p>
        </div>

        <div className="relative z-10 mt-12 w-full max-w-[700px] overflow-hidden rounded-2xl bg-white/95 p-2 shadow-2xl shadow-blue-950/20">
          <Image
            src="/images/inbox-onboard.gif"
            alt="Pré-visualização do painel VendAI"
            width={960}
            height={540}
            unoptimized
            className="h-auto w-full rounded-xl object-cover"
          />
        </div>

        <div className="absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-blue-400/30 blur-3xl" />
        <div className="absolute -right-16 top-20 h-56 w-56 rounded-full bg-blue-300/20 blur-3xl" />
        <div className="mt-auto flex gap-1.5 pt-10" aria-hidden="true">
          <span className="h-1.5 w-8 rounded-full bg-white" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
        </div>
      </section>

      <section className="flex w-full flex-col items-center justify-center px-2 py-8 sm:px-8 lg:w-[480px] lg:shrink-0 lg:px-6">
        <div className="w-full max-w-[360px]">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold tracking-[-0.04em] text-zinc-950">
              Olá, bem-vindo 👋
            </h1>
            <div className="mt-7 grid grid-cols-2 rounded-lg bg-zinc-100 p-1 text-sm font-semibold">
              <a href="/login" className={`rounded-md px-4 py-2 transition ${!isSignUp ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-800"}`}>
                Entrar
              </a>
              <a href="/login?mode=signup" className={`rounded-md px-4 py-2 transition ${isSignUp ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-800"}`}>
                Criar conta
              </a>
            </div>
          </div>

          <div className="mt-10 space-y-3">
            {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}
          </div>

          <form action={isSignUp ? signUpAction : signInAction} className="mt-8 space-y-5">
            {isSignUp && <div className="space-y-2"><label htmlFor="business_name" className={labelClass}>Nome do negócio</label><input id="business_name" name="business_name" type="text" placeholder="Shop & Go Luanda" className={inputClass} /></div>}
            <div className="space-y-2">
              <label htmlFor="email" className={labelClass}>Email</label>
              <input id="email" name="email" type="email" autoComplete="email" defaultValue={email} required placeholder="O teu email" className={inputClass} />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className={labelClass}>Password</label>
              <input id="password" name="password" type="password" autoComplete={isSignUp ? "new-password" : "current-password"} required minLength={isSignUp ? 8 : undefined} placeholder="A tua password" className={inputClass} />
              {isSignUp && <p className="text-xs text-zinc-400">Mínimo 8 caracteres.</p>}
            </div>
            <button type="submit" className="h-12 w-full rounded-full bg-primary-600 px-4 text-sm font-bold text-white transition hover:bg-primary-700">
              {isSignUp ? "Criar conta" : "Entrar"}
            </button>
          </form>

          {!isSignUp && <button type="button" className="mt-3 block w-full text-center text-sm text-zinc-500 hover:text-zinc-900">Esqueceu a password?</button>}

          <div className="my-9 flex items-center gap-4 text-xs text-zinc-400"><span className="h-px flex-1 bg-zinc-200" /><span>ou continuar com</span><span className="h-px flex-1 bg-zinc-200" /></div>
          <div className="space-y-3">
            <button type="button" className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-zinc-200 bg-white text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"><span className="font-bold text-[#4285f4]">G</span> Continuar com Google</button>
            <button type="button" className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-zinc-200 bg-white text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"><span className="text-lg leading-none text-black">●</span> Continuar com Apple</button>
          </div>

          <footer className="mt-20 flex justify-between text-xs text-zinc-500"><span>Privacy Policy</span><span>@VendAI 2025</span></footer>
        </div>
      </section>
    </main>
  );
}
