"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Team = {
  id: string;
  name: string;
  abbr: string;
  conference: "East" | "West";
  wins: number;
};

export default function TeamWinsEditor({ teams }: { teams: Team[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [wins, setWins] = useState<Record<string, number>>(
    Object.fromEntries(teams.map((t) => [t.id, t.wins])),
  );
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(teamId: string, value: number) {
    setSaving(teamId);
    setError(null);
    const { error } = await supabase
      .from("teams")
      .update({ wins: value, updated_at: new Date().toISOString() })
      .eq("id", teamId);
    setSaving(null);
    if (error) {
      setError(`${teamId}: ${error.message}`);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-300 text-left">
            <th className="py-2">Team</th>
            <th className="py-2">Conf.</th>
            <th className="py-2 text-right">Wins</th>
            <th className="py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((t) => (
            <tr
              key={t.id}
              className="border-b border-slate-200 dark:border-slate-800"
            >
              <td className="py-2">
                <span className="font-mono text-xs text-slate-500">{t.abbr}</span>{" "}
                {t.name}
              </td>
              <td className="py-2">{t.conference}</td>
              <td className="py-2 text-right">
                <input
                  type="number"
                  min={0}
                  value={wins[t.id]}
                  onChange={(e) =>
                    setWins((prev) => ({
                      ...prev,
                      [t.id]: Math.max(0, Number(e.target.value) || 0),
                    }))
                  }
                  className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-right text-slate-900"
                />
              </td>
              <td className="py-2 text-right">
                <div className="inline-flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded border border-slate-300 px-2 py-1"
                    onClick={() =>
                      setWins((prev) => ({
                        ...prev,
                        [t.id]: Math.max(0, (prev[t.id] ?? 0) - 1),
                      }))
                    }
                  >
                    −
                  </button>
                  <button
                    type="button"
                    className="rounded border border-slate-300 px-2 py-1"
                    onClick={() =>
                      setWins((prev) => ({
                        ...prev,
                        [t.id]: (prev[t.id] ?? 0) + 1,
                      }))
                    }
                  >
                    +
                  </button>
                  <button
                    type="button"
                    disabled={saving === t.id}
                    onClick={() => save(t.id, wins[t.id] ?? 0)}
                    className="rounded bg-slate-900 px-3 py-1 text-white disabled:opacity-60"
                  >
                    {saving === t.id ? "Saving..." : "Save"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
