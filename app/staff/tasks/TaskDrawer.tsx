"use client";

import { useState } from "react";
import {
  type TaskWithProperty,
  type TaskStatus,
  staffUpdateTaskStatus,
} from "@/app/actions/tasks";
import { format } from "date-fns";

interface TaskDrawerProps {
  task: TaskWithProperty | null;
  onClose: () => void;
  onUpdate: (task: TaskWithProperty) => void;
}

const typeLabels: Record<string, string> = {
  cleaning: "Cleaning",
  restock: "Restock Supplies",
  maintenance: "Maintenance",
};

const statusFlow: Record<TaskStatus, { next: TaskStatus | null; label: string }> = {
  open: { next: "in_progress", label: "Start Task" },
  assigned: { next: "in_progress", label: "Start Task" },
  in_progress: { next: "done", label: "Mark Complete" },
  done: { next: null, label: "Completed" },
  verified: { next: null, label: "Verified" },
};

// Placeholder checklist items based on task type
const checklists: Record<string, string[]> = {
  cleaning: [
    "Strip and remake beds with fresh linens",
    "Clean and sanitize bathrooms",
    "Vacuum/mop all floors",
    "Wipe down kitchen surfaces",
    "Empty all trash bins",
    "Check for damages or maintenance issues",
    "Restock toiletries and essentials",
    "Final walkthrough inspection",
  ],
  restock: [
    "Check inventory levels",
    "Restock toiletries",
    "Restock cleaning supplies",
    "Restock kitchen essentials",
    "Update inventory log",
  ],
  maintenance: [
    "Assess the issue",
    "Gather necessary tools/parts",
    "Complete repair",
    "Test functionality",
    "Clean up work area",
    "Document work completed",
  ],
};

export default function TaskDrawer({ task, onClose, onUpdate }: TaskDrawerProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [note, setNote] = useState("");
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());



  if (!task) return null;

  const isCompleted = ["done", "verified"].includes(task.status);
  const nextAction = statusFlow[task.status];
  const checklistItems = checklists[task.type] || [];

  const handleStatusUpdate = async () => {
    if (!nextAction.next || isUpdating) return;

    setIsUpdating(true);
    const { data, error } = await staffUpdateTaskStatus(
      task.id,
      nextAction.next,
      note.trim() || undefined
    );

    if (data && !error) {
      onUpdate({ ...task, ...data });
    }
    setIsUpdating(false);
  };

  const toggleCheckItem = (index: number) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-hidden rounded-t-2xl bg-white shadow-xl dark:bg-zinc-900 sm:inset-x-auto sm:inset-y-0 sm:right-0 sm:w-full sm:max-w-md sm:rounded-none sm:rounded-l-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Task Details
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-4" style={{ maxHeight: "calc(85vh - 60px)" }}>
          {/* Task Type Badge */}
          <div className="mb-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {typeLabels[task.type]}
            </span>
            {isCompleted && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/50 dark:text-green-300">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Done
              </span>
            )}
          </div>

          {/* Property Info */}
          <div className="mb-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/50">
            <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
              {task.property.name}
            </h3>
            {task.property.address && (
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {task.property.address}
              </p>
            )}
            <div className="mt-3 flex items-center gap-2 text-sm">
              <svg className="h-4 w-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-zinc-600 dark:text-zinc-400">
                Due: {format(new Date(task.due_at), "EEEE, MMM d 'at' h:mm a")}
              </span>
            </div>
          </div>

          {/* Checklist */}
          <div className="mb-6">
            <h4 className="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Checklist
            </h4>
            <div className="space-y-2">
              {checklistItems.map((item, index) => (
                <label
                  key={index}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 bg-white p-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                >
                  <input
                    type="checkbox"
                    checked={checkedItems.has(index)}
                    onChange={() => toggleCheckItem(index)}
                    disabled={isCompleted}
                    className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800"
                  />
                  <span
                    className={`text-sm ${checkedItems.has(index)
                      ? "text-zinc-400 line-through dark:text-zinc-500"
                      : "text-zinc-700 dark:text-zinc-300"
                      }`}
                  >
                    {item}
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
              Checklist is for guidance only and is not saved.
            </p>
          </div>

          {/* Notes */}
          {!isCompleted && (
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Notes (optional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add any notes about this task..."
                rows={3}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
              />
            </div>
          )}

          {/* Task Info */}
          <div className="mb-6 space-y-2 text-xs text-zinc-500 dark:text-zinc-400">
            <p>Created: {format(new Date(task.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
            <p>Status: {task.status.replace("_", " ")}</p>
          </div>

          {/* Action Button */}
          {nextAction.next && (
            <button
              onClick={handleStatusUpdate}
              disabled={isUpdating}
              className={`w-full rounded-lg py-3 text-center text-sm font-medium text-white transition-colors disabled:opacity-50 ${task.status === "in_progress"
                ? "bg-green-600 hover:bg-green-700"
                : "bg-blue-600 hover:bg-blue-700"
                }`}
            >
              {isUpdating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Updating...
                </span>
              ) : (
                nextAction.label
              )}
            </button>
          )}

          {isCompleted && (
            <div className="rounded-lg bg-green-50 p-4 text-center dark:bg-green-950/30">
              <svg className="mx-auto h-8 w-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-2 text-sm font-medium text-green-700 dark:text-green-300">
                Task completed
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

