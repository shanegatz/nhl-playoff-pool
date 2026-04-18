"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type Team = {
  id: string;
  name: string;
  abbr: string;
  conference: "East" | "West";
  wins: number;
};

export type InitialRanking = {
  team_id: string;
  rank: number;
};

type Props = {
  teams: Team[];
  initialName?: string;
  initialRankings?: InitialRanking[];
  initialTiebreakerGoals?: number | null;
  entryId?: string; // if provided -> edit existing entry
};

export default function RankingForm({
  teams,
  initialName = "",
  initialRankings = [],
  initialTiebreakerGoals = null,
  entryId,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const initialMap = useMemo(() => {
    const m: Record<string, number | ""> = {};
    for (const t of teams) m[t.id] = "";
    for (const r of initialRankings) m[r.team_id] = r.rank;
    return m;
  }, [teams, initialRankings]);

  const [name, setName] = useState(initialName);
  const [ranks, setRanks] = useState<Record<string, number | "">>(initialMap);
  const [tiebreakerGoals, setTiebreakerGoals] = useState<number | "">(
    initialTiebreakerGoals ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const usedCounts = useMemo(() => {
    const c: Record<number, number> = {};
    for (const v of Object.values(ranks)) {
      if (typeof v === "number") c[v] = (c[v] ?? 0) + 1;
    }
    return c;
  }, [ranks]);

  const duplicates = Object.entries(usedCounts)
    .filter(([, n]) => n > 1)
    .map(([r]) => Number(r));

  const missingAssignments = teams.filter((t) => ranks[t.id] === "").length;

  const isValid =
    name.trim().length > 0 &&
    duplicates.length === 0 &&
    missingAssignments === 0 &&
    tiebreakerGoals !== "";

  function setRank(teamId: string, value: string) {
    const n = value === "" ? "" : Number(value);
    setRanks((prev) => ({ ...prev, [teamId]: n === "" ? "" : (n as number) }));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isValid) return;
    setSaving(true);
    setError(null);
    setMessage(null);

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      setSaving(false);
      setError("You need to be signed in.");
      return;
    }

    let id = entryId;

    if (!id) {
      // Upsert-style: one entry per user (unique constraint on user_id).
      const { data: inserted, error: insertErr } = await supabase
        .from("entries")
        .insert({ user_id: user.id, name: name.trim(), tiebreaker_goals: tiebreakerGoals as number })
        .select("id")
        .single();

      if (insertErr || !inserted) {
        setSaving(false);
        setError(insertErr?.message ?? "Failed to create entry.");
        return;
      }
      id = inserted.id;
    } else {
      const { error: updateErr } = await supabase
        .from("entries")
        .update({ name: name.trim(), tiebreaker_goals: tiebreakerGoals as number })
        .eq("id", id);
      if (updateErr) {
        setSaving(false);
        setError(updateErr.message);
        return;
      }
      // Clear old rankings to re-insert cleanly.
      const { error: delErr } = await supabase
        .from("entry_rankings")
        .delete()
        .eq("entry_id", id);
      if (delErr) {
        setSaving(false);
        setError(delErr.message);
        return;
      }
    }

    const rows = teams.map((t) => ({
      entry_id: id!,
      team_id: t.id,
      rank: ranks[t.id] as number,
    }));

    const { error: rankErr } = await supabase.from("entry_rankings").insert(rows);
    if (rankErr) {
      setSaving(false);
      setError(rankErr.message);
      return;
    }

    setSaving(false);
    setMessage("Saved.");
    router.replace(`/entry/${id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <label className="block">
        <span className="mb-1 block text-sm">Entry name (shown on leaderboard)</span>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-slate-900"
        />
      </label>

      <div>
        <p className="mb-2 text-sm text-slate-600 dark:text-slate-300">
          Assign each team a rank from 1 (worst) to 16 (best). Each number must be used exactly once.
        </p>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {teams.map((t) => {
            const current = ranks[t.id];
            const isDup =
              typeof current === "number" && duplicates.includes(current);
            return (
              <div
                key={t.id}
                className={`flex items-center justify-between rounded border px-3 py-2 ${
                  isDup
                    ? "border-red-400 bg-red-50 dark:bg-red-950/40"
                    : "border-slate-200 dark:border-slate-800"
                }`}
              >
                <span>
                  <span className="font-mono text-xs text-slate-500">
                    {t.abbr}
                  </span>{" "}
                  {t.name}
                  <span className="ml-2 text-xs text-slate-400">
                    {t.conference}
                  </span>
                </span>
                <select
                  value={current === "" ? "" : String(current)}
                  onChange={(e) => setRank(t.id, e.target.value)}
                  className="rounded border border-slate-300 bg-white px-2 py-1 text-slate-900"
                  required
                >
                  <option value="">—</option>
                  {Array.from({ length: 16 }, (_, i) => i + 1)
                    .filter((n) => !(n in usedCounts) || n === current)
                    .map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm">
          Tiebreaker: total goals in the Stanley Cup Final series
        </span>
        <input
          type="number"
          required
          min={0}
          value={tiebreakerGoals}
          onChange={(e) =>
            setTiebreakerGoals(e.target.value === "" ? "" : Number(e.target.value))
          }
          className="w-32 rounded border border-slate-300 bg-white px-3 py-2 text-slate-900"
          placeholder="e.g. 24"
        />
      </label>

      {duplicates.length > 0 && (
        <p className="text-sm text-red-600">
          Rank{duplicates.length > 1 ? "s" : ""} {duplicates.join(", ")} used more
          than once.
        </p>
      )}
      {missingAssignments > 0 && (
        <p className="text-sm text-slate-500">
          {missingAssignments} team{missingAssignments === 1 ? "" : "s"} still need a rank.
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-green-700">{message}</p>}

      <button
        type="submit"
        disabled={!isValid || saving}
        className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-60"
      >
        {saving ? "Saving..." : entryId ? "Save changes" : "Submit entry"}
      </button>
    </form>
  );
}
