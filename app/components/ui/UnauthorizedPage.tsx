import Link from "next/link";

interface UnauthorizedPageProps {
  title?: string;
  message?: string;
  backHref?: string;
  backLabel?: string;
}

export default function UnauthorizedPage({
  title = "Access Denied",
  message = "You don't have permission to access this page.",
  backHref = "/",
  backLabel = "Go Home",
}: UnauthorizedPageProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
        <svg
          className="h-8 w-8 text-red-600 dark:text-red-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        {title}
      </h1>
      <p className="mt-2 max-w-md text-zinc-600 dark:text-zinc-400">{message}</p>
      <Link
        href={backHref}
        className="mt-6 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {backLabel}
      </Link>
    </div>
  );
}

