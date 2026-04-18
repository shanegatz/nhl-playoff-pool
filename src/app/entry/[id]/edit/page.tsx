import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RankingForm, { type Team, type InitialRanking } from "@/components/RankingForm";

export const revalidate = 0;

export default async function EditEntryPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: entry } = await supabase
    .from("entries")
    .select("id,user_id,name,tiebreaker_goals")
    .eq("id", params.id)
    .maybeSingle();

  if (!entry) notFound();
  if (entry.user_id !== user.id) redirect(`/entry/${entry.id}`);

  const [{ data: teams }, { data: rankings }] = await Promise.all([
    supabase
      .from("teams")
      .select("id,name,abbr,conference,wins_r1,wins_r2,wins_r3,wins_r4")
      .order("conference")
      .order("name"),
    supabase
      .from("entry_rankings")
      .select("team_id,rank")
      .eq("entry_id", entry.id),
  ]);

  const teamList: Team[] = (teams ?? []) as unknown as Team[];
  const initialRankings: InitialRanking[] = (rankings ?? []) as InitialRanking[];

  const locked =
    !!process.env.NEXT_PUBLIC_LOCK_DATE &&
    new Date() >= new Date(process.env.NEXT_PUBLIC_LOCK_DATE);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-semibold">Edit entry</h1>
      {locked ? (
        <p className="text-slate-600 dark:text-slate-300">
          Entries are locked — the playoffs have started.
        </p>
      ) : (
        <RankingForm
          teams={teamList}
          initialName={entry.name}
          initialRankings={initialRankings}
          initialTiebreakerGoals={entry.tiebreaker_goals}
          entryId={entry.id}
        />
      )}
    </main>
  );
}
