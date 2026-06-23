export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div className="w-full max-w-sm space-y-6 px-4 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-zinc-900">Verifica o teu email</h1>
        <p className="text-sm text-zinc-500">
          Enviámos um link de acesso para{" "}
          <span className="font-medium text-zinc-700">{email}</span>.
          <br />
          Clica no link para entrares.
        </p>
      </div>

      <p className="text-center text-sm text-zinc-500">
        Email errado?{" "}
        <a href="/login" className="font-medium text-zinc-900 hover:underline">
          Volta atrás
        </a>
      </p>
    </div>
  );
}
