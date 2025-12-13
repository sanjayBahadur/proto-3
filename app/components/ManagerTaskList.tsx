"use client";

import { useState, useEffect } from "react";
import { listTasks, type Task, type TaskWithProperty } from "@/app/actions/tasks";
import TaskAssignmentModal from "./TaskAssignmentModal";
import { format, isPast, isToday } from "date-fns";

interface ManagerTaskListProps {
  propertyId: string;
  propertyName: string;
}

const typeLabels: Record<string, string> = {
  cleaning: "Cleaning",
  restock: "Restock",
  maintenance: "Maintenance",
};

const typeColors: Record<string, string> = {
  cleaning: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  restock: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  maintenance: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
};

const statusColors: Record<string, string> = {
  open: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  assigned: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  done: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  verified: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
};

export default function ManagerTaskList({ propertyId, propertyName }: ManagerTaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    async function fetchTasks() {
      setIsLoading(true);
      const { data, error } = await listTasks(propertyId);
      if (error) {
        setError(error);
      } else {
        setTasks(data);
      }
      setIsLoading(false);
    }
    fetchTasks();
  }, [propertyId]);

  const handleTaskUpdate = (updatedTask: Task) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
    );
  };

  const activeTasks = tasks.filter((t) => !["done", "verified"].includes(t.status));
  const completedTasks = tasks.filter((t) => ["done", "verified"].includes(t.status));
  const displayTasks = showCompleted ? completedTasks : activeTasks;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <svg className="h-6 w-6 animate-spin text-zinc-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowCompleted(false)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            !showCompleted
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          }`}
        >
          Active ({activeTasks.length})
        </button>
        <button
          onClick={() => setShowCompleted(true)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            showCompleted
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          }`}
        >
          Completed ({completedTasks.length})
        </button>
      </div>

      {/* Task List */}
      {displayTasks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center dark:border-zinc-700 dark:bg-zinc-800/50">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {showCompleted ? "No completed tasks." : "No active tasks for this property."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayTasks.map((task) => {
            const dueDate = new Date(task.due_at);
            const isOverdue = isPast(dueDate) && !isToday(dueDate) && !["done", "verified"].includes(task.status);
            const isDueToday = isToday(dueDate);

            return (
              <div
                key={task.id}
                className={`rounded-lg border p-4 ${
                  isOverdue
                    ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
                    : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeColors[task.type]}`}>
                        {typeLabels[task.type]}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[task.status]}`}>
                        {task.status.replace("_", " ")}
                      </span>
                      {task.assigned_to ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/50 dark:text-green-300">
                          Assigned
                        </span>
                      ) : (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                          Unassigned
                        </span>
                      )}
                    </div>

                    {/* Due date */}
                    <p className={`text-sm font-medium ${
                      isOverdue
                        ? "text-red-700 dark:text-red-300"
                        : isDueToday
                        ? "text-amber-700 dark:text-amber-300"
                        : "text-zinc-700 dark:text-zinc-300"
                    }`}>
                      {isOverdue && "⚠ "}
                      Due: {format(dueDate, "MMM d, h:mm a")}
                    </p>
                  </div>

                  {/* Assign button */}
                  <button
                    onClick={() => setSelectedTask(task)}
                    className="flex-shrink-0 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    {task.assigned_to ? "Reassign" : "Assign"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assignment Modal */}
      {selectedTask && (
        <TaskAssignmentModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleTaskUpdate}
        />
      )}
    </div>
  );
}

