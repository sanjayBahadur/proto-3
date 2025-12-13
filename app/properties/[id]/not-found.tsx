import Link from "next/link";

export default function PropertyNotFound() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-4xl font-semibold text-zinc-900 dark:text-zinc-100">
          404
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Property not found or you don&apos;t have access to it.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

