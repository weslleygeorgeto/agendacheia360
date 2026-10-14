import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-start justify-center gap-6 px-6">
      <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
        Agenda Cheia 360
      </span>
      <h1 className="text-4xl font-bold leading-tight tracking-tight">
        Transforme horário vago em dinheiro.
      </h1>
      <p className="text-neutral-600">
        Agendamento online para barbearias, salões e clínicas. Seus clientes
        marcam pelo link, você acompanha tudo no painel.
      </p>
      <Link href="/login" className="btn-primary">
        Entrar no painel
      </Link>
    </main>
  );
}
