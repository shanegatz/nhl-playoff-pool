import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TeamWinsEditor, { type Team } from "@/components/TeamWinsEditor";

export const revalidate = 0;

export default async function AdminPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: adminRow } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRow) {
    return (
      <main className="mx-auto max-w-xl px-4 py-12">
        <h1 className="mb-2 text-2xl font-semibold">Admin</h1>
        <p className="text-slate-600 dark:text-slate-300">
          Your account is not an admin. Ask the pool owner to run:
        </p>
        <pre className="mt-3 overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
{`insert into public.admins (user_id) values ('${user.id}');`}
        </pre>
      </main>
    );
  }

  const { data: teams } = await supabase
    .from("teams")
    .select("id,name,abbr,conference,wins_r1,wins_r2,wins_r3,wins_r4")
    .order("conference")
    .order("name");

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-semibold">Admin — team wins</h1>
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
        Update wins per round. Points = rank × wins × round multiplier. The leaderboard recalculates automatically.
      </p>
      <TeamWinsEditor teams={(teams ?? []) as Team[]} />
    </main>
  );
}
