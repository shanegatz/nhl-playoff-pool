import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 0;

type RankingRow = {
  rank: number;
  teams: {
    id: string;
    name: string;
    abbr: string;
    wins_r1: number;
    wins_r2: number;
    wins_r3: number;
    wins_r4: number;
  } | null;
};

function weightedWins(t: NonNullable<RankingRow["teams"]>) {
  return t.wins_r1 * 1 + t.wins_r2 * 2 + t.wins_r3 * 3 + t.wins_r4 * 4;
}

export default async function EntryDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: entry } = await supabase
    .from("entries")
    .select("id,user_id,name,tiebreaker_goals")
    .eq("id", params.id)
    .maybeSingle();

  if (!entry) notFound();

  const { data: rankings } = await supabase
    .from("entry_rankings")
    .select("rank, teams(id,name,abbr,wins_r1,wins_r2,wins_r3,wins_r4)")
    .eq("entry_id", params.id)
    .order("rank", { ascending: false });

  const rows: RankingRow[] = (rankings ?? []) as unknown as RankingRow[];

  const total = rows.reduce(
    (sum, r) => sum + (r.teams ? r.rank * weightedWins(r.teams) : 0),
    0,
  );

  const isOwner = user?.id === entry.user_id;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{entry.name}</h1>
        {isOwner && (
          <Link
            href={`/entry/${entry.id}/edit`}
            className="rounded border border-slate-300 px-3 py-1 text-sm"
          >
            Edit
          </Link>
        )}
      </div>
      <p className="mb-1 text-sm text-slate-600 dark:text-slate-300">
        Total points: <span className="font-mono">{total}</span>
      </p>
      <p className="mb-6 text-sm text-slate-600 dark:text-slate-300">
        Tiebreaker (Final series goals):{" "}
        <span className="font-mono">
          {entry.tiebreaker_goals ?? "—"}
        </span>
      </p>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-300 text-left">
            <th className="py-2">Rank</th>
            <th className="py-2">Team</th>
            <th className="py-2 text-right">Wins</th>
            <th className="py-2 text-right">Points</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.teams?.id ?? r.rank}
              className="border-b border-slate-200 dark:border-slate-800"
            >
              <td className="py-2 font-mono">{r.rank}</td>
              <td className="py-2">
                <span className="font-mono text-xs text-slate-500">
                  {r.teams?.abbr}
                </span>{" "}
                {r.teams?.name}
              </td>
              <td className="py-2 text-right font-mono">
                {r.teams ? weightedWins(r.teams) : 0}
              </td>
              <td className="py-2 text-right font-mono">
                {r.teams ? r.rank * weightedWins(r.teams) : 0}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
