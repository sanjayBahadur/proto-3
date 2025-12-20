import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4">
      <div className="text-center max-w-2xl">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-100 to-indigo-100 px-4 py-1.5 text-sm font-medium text-purple-700 dark:from-purple-900/30 dark:to-indigo-900/30 dark:text-purple-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-purple-500"></span>
          </span>
          Premium Property Management
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-6xl">
          Comfort Curators
        </h1>
        <p className="mx-auto mt-6 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          Streamline your vacation rental operations with intelligent task management,
          seamless package delivery, and real-time property oversight.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href="/login"
            className="rounded-lg bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-zinc-900/20 transition-all hover:bg-zinc-800 hover:shadow-xl dark:bg-white dark:text-zinc-900 dark:shadow-white/10 dark:hover:bg-zinc-100"
          >
            Get Started
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-700 transition-all hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
          >
            View Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
