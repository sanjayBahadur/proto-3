"use client";

import { useState } from "react";
import {
  type TaskWithProperty,
  type TaskStatus,
  staffUpdateTaskStatus,
} from "@/app/actions/tasks";
import { format, isPast, isToday, isTomorrow } from "date-fns";

interface TaskCardProps {
  task: TaskWithProperty;
  onClick: () => void;
  onUpdate: (task: TaskWithProperty) => void;
}

const typeIcons: Record<string, React.ReactNode> = {
  cleaning: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  restock: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  maintenance: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

const typeColors: Record<string, string> = {
  cleaning: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  restock: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  maintenance: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
};

const statusColors: Record<TaskStatus, string> = {
  open: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  assigned: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  done: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  verified: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
};

function getDueDateLabel(dueAt: string): { label: string; urgent: boolean } {
  const date = new Date(dueAt);
  if (isPast(date) && !isToday(date)) {
    return { label: "Overdue", urgent: true };
  }
  if (isToday(date)) {
    return { label: `Today ${format(date, "h:mm a")}`, urgent: true };
  }
  if (isTomorrow(date)) {
    return { label: `Tomorrow ${format(date, "h:mm a")}`, urgent: false };
  }
  return { label: format(date, "MMM d, h:mm a"), urgent: false };
}

export default function TaskCard({ task, onClick, onUpdate }: TaskCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const dueInfo = getDueDateLabel(task.due_at);
  const isCompleted = ["done", "verified"].includes(task.status);

  const getNextStatus = (): TaskStatus | null => {
    if (task.status === "open" || task.status === "assigned") return "in_progress";
    if (task.status === "in_progress") return "done";
    return null;
  };

  const nextStatus = getNextStatus();

  const handleStatusUpdate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!nextStatus || isUpdating) return;

    setIsUpdating(true);
    const { data, error } = await staffUpdateTaskStatus(task.id, nextStatus);

    if (data && !error) {
      onUpdate({ ...task, ...data });
    }
    setIsUpdating(false);
  };

  const getActionButtonLabel = () => {
    if (task.status === "open" || task.status === "assigned") return "Start";
    if (task.status === "in_progress") return "Complete";
    return null;
  };

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-lg border p-4 transition-all active:scale-[0.99] ${
        isCompleted
          ? "border-zinc-200 bg-zinc-50 opacity-75 dark:border-zinc-800 dark:bg-zinc-900/50"
          : dueInfo.urgent
          ? "border-red-200 bg-white hover:border-red-300 dark:border-red-800 dark:bg-zinc-900 dark:hover:border-red-700"
          : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left side */}
        <div className="flex-1 min-w-0">
          {/* Type badge */}
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                typeColors[task.type]
              }`}
            >
              {typeIcons[task.type]}
              {task.type}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                statusColors[task.status]
              }`}
            >
              {task.status.replace("_", " ")}
            </span>
          </div>

          {/* Property name */}
          <h3 className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
            {task.property.name}
          </h3>

          {/* Address */}
          {task.property.address && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
              {task.property.address}
            </p>
          )}

          {/* Due date */}
          <p
            className={`mt-2 text-sm font-medium ${
              dueInfo.urgent && !isCompleted
                ? "text-red-600 dark:text-red-400"
                : "text-zinc-600 dark:text-zinc-400"
            }`}
          >
            {dueInfo.urgent && !isCompleted && (
              <span className="mr-1">⚠</span>
            )}
            Due: {dueInfo.label}
          </p>
        </div>

        {/* Right side - Action button */}
        {nextStatus && (
          <button
            onClick={handleStatusUpdate}
            disabled={isUpdating}
            className={`flex-shrink-0 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 ${
              task.status === "in_progress"
                ? "bg-green-600 hover:bg-green-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isUpdating ? (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              getActionButtonLabel()
            )}
          </button>
        )}

        {isCompleted && (
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

