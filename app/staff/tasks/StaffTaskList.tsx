"use client";

import { useState } from "react";
import { type TaskWithProperty, type TaskStatus } from "@/app/actions/tasks";
import TaskCard from "./TaskCard";
import TaskDrawer from "./TaskDrawer";

interface StaffTaskListProps {
  initialTasks: TaskWithProperty[];
}

export default function StaffTaskList({ initialTasks }: StaffTaskListProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [selectedTask, setSelectedTask] = useState<TaskWithProperty | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "done">("active");

  const filteredTasks = tasks.filter((task) => {
    if (filter === "active") {
      return !["done", "verified"].includes(task.status);
    }
    if (filter === "done") {
      return ["done", "verified"].includes(task.status);
    }
    return true;
  });

  const activeTasks = tasks.filter((t) => !["done", "verified"].includes(t.status));
  const doneTasks = tasks.filter((t) => ["done", "verified"].includes(t.status));

  const handleTaskUpdate = (updatedTask: TaskWithProperty) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
    );
    if (selectedTask?.id === updatedTask.id) {
      setSelectedTask(updatedTask);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
        <button
          onClick={() => setFilter("active")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            filter === "active"
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
        >
          Active ({activeTasks.length})
        </button>
        <button
          onClick={() => setFilter("done")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            filter === "done"
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
        >
          Completed ({doneTasks.length})
        </button>
        <button
          onClick={() => setFilter("all")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            filter === "all"
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
        >
          All ({tasks.length})
        </button>
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
          <svg
            className="mx-auto h-10 w-10 text-zinc-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            {filter === "active"
              ? "No active tasks. Great job!"
              : filter === "done"
              ? "No completed tasks yet."
              : "No tasks assigned to you."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => setSelectedTask(task)}
              onUpdate={handleTaskUpdate}
            />
          ))}
        </div>
      )}

      {/* Task Drawer */}
      <TaskDrawer
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdate={handleTaskUpdate}
      />
    </div>
  );
}

