import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RankingForm, { type Team, type InitialRanking } from "@/components/RankingForm";

export const revalidate = 0;

export default async function NewEntryPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // If user already has an entry, redirect to edit.
  const { data: existing } = await supabase
    .from("entries")
    .select("id,name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    redirect(`/entry/${existing.id}/edit`);
  }

  const { data: teams } = await supabase
    .from("teams")
    .select("id,name,abbr,conference,wins_r1,wins_r2,wins_r3,wins_r4")
    .order("conference", { ascending: true })
    .order("name", { ascending: true });

  const teamList: Team[] = (teams ?? []) as unknown as Team[];
  const initialRankings: InitialRanking[] = [];

  const locked =
    !!process.env.NEXT_PUBLIC_LOCK_DATE &&
    new Date() >= new Date(process.env.NEXT_PUBLIC_LOCK_DATE);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-semibold">Submit your entry</h1>
      {locked ? (
        <p className="text-slate-600 dark:text-slate-300">
          Entries are locked — the playoffs have started.
        </p>
      ) : (
        <RankingForm teams={teamList} initialRankings={initialRankings} />
      )}
    </main>
  );
}
