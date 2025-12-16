import { requireAdmin } from "@/lib/supabase/roles";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side RBAC check - redirects non-admins
  await requireAdmin("/login");

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Admin Sub-navigation */}
      <div className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-5xl px-4">
          <nav className="flex h-12 items-center gap-6">
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Admin
            </span>
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Overview
              </Link>
              <Link
                href="/admin/users"
                className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Users
              </Link>
            </div>
          </nav>
        </div>
      </div>
      {children}
    </div>
  );
}
