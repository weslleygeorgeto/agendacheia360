import { redirect } from "next/navigation";
import CreateBusinessForm from "@/components/CreateBusinessForm";
import DashboardClient from "@/components/DashboardClient";
import { createSupabaseServer } from "@/lib/supabase-server";
import { todayIn } from "@/lib/slots-core";
import type { Business } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS garante: só vêm os negócios deste dono.
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at");
  if (error) throw new Error("Falha ao carregar negócios");

  const businesses = (data ?? []) as Business[];
  if (businesses.length === 0) {
    return (
      <main className="px-4 py-10">
        <CreateBusinessForm userId={user.id} />
      </main>
    );
  }

  const today = todayIn(businesses[0].timezone, new Date());
  return <DashboardClient businesses={businesses} today={today} />;
}
