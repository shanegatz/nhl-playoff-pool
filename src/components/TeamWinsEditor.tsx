"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const ROUNDS = [
  { key: "wins_r1", label: "R1", multiplier: 1 },
  { key: "wins_r2", label: "R2", multiplier: 2 },
  { key: "wins_r3", label: "R3", multiplier: 3 },
  { key: "wins_r4", label: "R4", multiplier: 4 },
] as const;

type RoundKey = (typeof ROUNDS)[number]["key"];

export type Team = {
  id: string;
  name: string;
  abbr: string;
  conference: "East" | "West";
  wins_r1: number;
  wins_r2: number;
  wins_r3: number;
  wins_r4: number;
};

export default function TeamWinsEditor({ teams }: { teams: Team[] }) {
  const router = useRouter();
  const supabase = createClient();

  const [wins, setWins] = useState<Record<string, Record<RoundKey, number>>>(
    Object.fromEntries(
      teams.map((t) => [
        t.id,
        { wins_r1: t.wins_r1, wins_r2: t.wins_r2, wins_r3: t.wins_r3, wins_r4: t.wins_r4 },
      ]),
    ),
  );
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function adjust(teamId: string, round: RoundKey, delta: number) {
    setWins((prev) => ({
      ...prev,
      [teamId]: {
        ...prev[teamId],
        [round]: Math.max(0, (prev[teamId][round] ?? 0) + delta),
      },
    }));
  }

  async function save(teamId: string) {
    setSaving(teamId);
    setError(null);
    const { error } = await supabase
      .from("teams")
      .update({ ...wins[teamId], updated_at: new Date().toISOString() })
      .eq("id", teamId);
    setSaving(null);
    if (error) {
      setError(`${teamId}: ${error.message}`);
      return;
    }
    router.refresh();
  }

  return (
    <div className="overflow-x-auto">
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-300 text-left">
            <th className="py-2 pr-4">Team</th>
            {ROUNDS.map((r) => (
              <th key={r.key} className="py-2 px-3 text-center">
                {r.label}
                <span className="ml-1 text-xs font-normal text-slate-400">
                  ×{r.multiplier}
                </span>
              </th>
            ))}
            <th className="py-2 pl-3" />
          </tr>
        </thead>
        <tbody>
          {teams.map((t) => (
            <tr
              key={t.id}
              className="border-b border-slate-200 dark:border-slate-800"
            >
              <td className="py-2 pr-4">
                <span className="font-mono text-xs text-slate-500">{t.abbr}</span>{" "}
                {t.name}
              </td>
              {ROUNDS.map((r) => (
                <td key={r.key} className="py-2 px-3">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => adjust(t.id, r.key, -1)}
                      className="rounded border border-slate-300 px-2 py-0.5 text-xs"
                    >
                      −
                    </button>
                    <span className="w-5 text-center font-mono">
                      {wins[t.id][r.key]}
                    </span>
                    <button
                      type="button"
                      onClick={() => adjust(t.id, r.key, 1)}
                      className="rounded border border-slate-300 px-2 py-0.5 text-xs"
                    >
                      +
                    </button>
                  </div>
                </td>
              ))}
              <td className="py-2 pl-3">
                <button
                  type="button"
                  disabled={saving === t.id}
                  onClick={() => save(t.id)}
                  className="rounded bg-slate-900 px-3 py-1 text-white disabled:opacity-60"
                >
                  {saving === t.id ? "Saving..." : "Save"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
