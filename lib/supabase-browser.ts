import { createBrowserClient } from "@supabase/ssr";

/** Client de navegador: usado APENAS para login/logout e ações do dono logado. */
export function createSupabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("Variáveis públicas do Supabase ausentes");
  return createBrowserClient(url, anon);
}
