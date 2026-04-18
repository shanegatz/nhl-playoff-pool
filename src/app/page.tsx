import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type ScoreRow = {
  entry_id: string;
  user_id: string;
  entry_name: string;
  total_points: number;
};

type Team = {
  id: string;
  name: string;
  abbr: string;
  conference: "East" | "West";
  wins: number;
};

export const revalidate = 0;

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="mb-2 text-3xl font-semibold">NHL Playoff Pool</h1>
        <p className="mb-6 text-slate-600 dark:text-slate-300">
          Rank all 16 playoff teams. Top team = 16 points, bottom team = 1 point.
          Each win by a team adds (its rank) to your score.
        </p>
        <div className="flex gap-3">
          <Link href="/login" className="rounded bg-slate-900 px-4 py-2 text-white">
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  const [{ data: scores }, { data: teams }] = await Promise.all([
    supabase
      .from("entry_scores")
      .select("entry_id,user_id,entry_name,total_points")
      .order("total_points", { ascending: false }),
    supabase
      .from("teams")
      .select("id,name,abbr,conference,wins")
      .order("wins", { ascending: false }),
  ]);

  const rows: ScoreRow[] = scores ?? [];
  const allTeams: Team[] = (teams ?? []) as Team[];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-semibold">Leaderboard</h1>
      <p className="mb-6 text-sm text-slate-600 dark:text-slate-300">
        Points update automatically from team wins. Your entry rank × team wins = points.
      </p>

      <section className="mb-10">
        {rows.length === 0 ? (
          <p className="text-slate-500">
            No entries yet.{" "}
            <Link href="/entry/new" className="underline">
              Submit yours
            </Link>
            .
          </p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-300 text-left">
                <th className="py-2">#</th>
                <th className="py-2">Entry</th>
                <th className="py-2 text-right">Points</th>
                <th className="py-2 text-right">Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.entry_id}
                  className="border-b border-slate-200 dark:border-slate-800"
                >
                  <td className="py-2">{i + 1}</td>
                  <td className="py-2">
                    {row.entry_name}
                    {row.user_id === user.id && (
                      <span className="ml-2 rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                        you
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-right font-mono">{row.total_points}</td>
                  <td className="py-2 text-right">
                    <Link href={`/entry/${row.entry_id}`} className="underline">
                      view
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Team wins</h2>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {allTeams.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded border border-slate-200 px-3 py-2 dark:border-slate-800"
            >
              <span>
                <span className="font-mono text-xs text-slate-500">{t.abbr}</span>{" "}
                {t.name}
              </span>
              <span className="font-mono">{t.wins}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
