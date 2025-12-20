"use client";

import Link from "next/link";
import { useAuth } from "../contexts/AuthContext";

export default function Navbar() {
  const { user, role, logout, isLoading } = useAuth();

  const getHomeLink = () => {
    switch (role) {
      case "admin":
        return "/admin";
      case "manager":
        return "/dashboard";
      case "staff":
        return "/staff";
      default:
        return "/";
    }
  };

  return (
    <nav className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100"
        >
          Comfort Curators
        </Link>

        <div className="flex items-center gap-6">
          {!isLoading && (
            <>
              {user ? (
                <>
                  {/* Role-based navigation */}
                  {role === "admin" && (
                    <>
                      <Link
                        href="/admin"
                        className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                      >
                        Admin
                      </Link>
                      <Link
                        href="/dashboard"
                        className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                      >
                        Dashboard
                      </Link>
                    </>
                  )}
                  {role === "manager" && (
                    <Link
                      href="/dashboard"
                      className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    >
                      Dashboard
                    </Link>
                  )}
                  {role === "staff" && (
                    <>
                      <Link
                        href="/staff"
                        className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                      >
                        Portal
                      </Link>
                      <Link
                        href="/staff/map"
                        className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                      >
                        Map
                      </Link>
                    </>
                  )}
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-zinc-500 dark:text-zinc-500">
                      {user.email}
                    </span>
                    <button
                      onClick={logout}
                      className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    >
                      Logout
                    </button>
                  </div>
                </>
              ) : (
                <Link
                  href="/login"
                  className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                >
                  Login
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
