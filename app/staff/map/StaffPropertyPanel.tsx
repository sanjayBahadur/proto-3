"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { HealthScoreBadge } from "@/app/components/HealthScoreDisplay";
import { listTasks, type Task } from "@/app/actions/tasks";

interface Property {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  health_score: number;
}

interface StaffPropertyPanelProps {
  property: Property;
  onClose: () => void;
}

export default function StaffPropertyPanel({
  property,
  onClose,
}: StaffPropertyPanelProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // Fetch tasks for this property
  useEffect(() => {
    async function fetchTasks() {
      setLoadingTasks(true);
      const { data } = await listTasks(property.id, { limit: 5 });
      setTasks(data);
      setLoadingTasks(false);
    }
    fetchTasks();
  }, [property.id]);

  const activeTasks = tasks.filter((t) => !["done", "verified"].includes(t.status));

  return (
    <div className="absolute right-0 top-0 z-[1000] h-full w-80 border-l border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
            Property Details
          </h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Name
              </label>
              <p className="mt-1 text-lg font-medium text-zinc-900 dark:text-zinc-100">
                {property.name}
              </p>
            </div>

            {/* Address */}
            {property.address && (
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Address
                </label>
                <p className="mt-1 text-zinc-700 dark:text-zinc-300">
                  {property.address}
                </p>
              </div>
            )}

            {/* Health Score */}
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Health
              </label>
              <div className="mt-1.5">
                <HealthScoreBadge score={property.health_score} />
              </div>
            </div>

            {/* Tasks Summary */}
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
              <label className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Tasks
              </label>
              {loadingTasks ? (
                <div className="mt-2 flex items-center gap-2 text-sm text-zinc-500">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Loading...
                </div>
              ) : activeTasks.length > 0 ? (
                <div className="mt-2 space-y-2">
                  {activeTasks.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="capitalize text-zinc-700 dark:text-zinc-300">
                        {task.type}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          task.status === "open"
                            ? "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
                            : task.status === "assigned"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                            : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300"
                        }`}
                      >
                        {task.status}
                      </span>
                    </div>
                  ))}
                  {activeTasks.length > 3 && (
                    <p className="text-xs text-zinc-500">
                      +{activeTasks.length - 3} more
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  No active tasks
                </p>
              )}
            </div>

            {/* Coordinates */}
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Coordinates
              </label>
              <p className="mt-1 font-mono text-sm text-zinc-600 dark:text-zinc-400">
                {property.lat.toFixed(6)}, {property.lng.toFixed(6)}
              </p>
            </div>

            {/* Staff-only notice */}
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950/30">
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                <strong>Staff View:</strong> This is a read-only view. Contact your manager for property changes.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 p-4 dark:border-zinc-700">
          <Link
            href="/staff/tasks"
            className="flex w-full items-center justify-center gap-2 rounded-md bg-zinc-900 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            View My Tasks
          </Link>
        </div>
      </div>
    </div>
  );
}
