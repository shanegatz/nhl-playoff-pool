import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Header() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data } = await supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    isAdmin = !!data;
  }

  return (
    <header className="border-b border-slate-200 dark:border-slate-800">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold">
          NHL Playoff Pool
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="hover:underline">
            Leaderboard
          </Link>
          {user && (
            <Link href="/entry/new" className="hover:underline">
              My entry
            </Link>
          )}
          {isAdmin && (
            <Link href="/admin" className="hover:underline">
              Admin
            </Link>
          )}
          {user ? (
            <form action="/auth/signout" method="post">
              <button type="submit" className="hover:underline">
                Sign out
              </button>
            </form>
          ) : (
            <Link href="/login" className="hover:underline">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
