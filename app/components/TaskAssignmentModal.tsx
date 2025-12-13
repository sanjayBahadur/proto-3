"use client";

import { useState, useEffect } from "react";
import {
  type Task,
  type StaffMember,
  listStaffMembers,
  assignTask,
  unassignTask,
} from "@/app/actions/tasks";

interface TaskAssignmentModalProps {
  task: Task;
  onClose: () => void;
  onUpdate: (task: Task) => void;
}

export default function TaskAssignmentModal({
  task,
  onClose,
  onUpdate,
}: TaskAssignmentModalProps) {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>(task.assigned_to || "");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStaff() {
      setIsLoading(true);
      const { data, error } = await listStaffMembers();
      if (error) {
        setError(error);
      } else {
        setStaffMembers(data);
      }
      setIsLoading(false);
    }
    fetchStaff();
  }, []);

  const handleAssign = async () => {
    if (!selectedStaffId) {
      // Unassign
      if (task.assigned_to) {
        setIsSaving(true);
        const { data, error } = await unassignTask(task.id);
        if (error) {
          setError(error);
        } else if (data) {
          onUpdate(data);
          onClose();
        }
        setIsSaving(false);
      } else {
        onClose();
      }
      return;
    }

    setIsSaving(true);
    setError(null);
    const { data, error } = await assignTask(task.id, selectedStaffId);
    if (error) {
      setError(error);
    } else if (data) {
      onUpdate(data);
      onClose();
    }
    setIsSaving(false);
  };

  const isCompleted = ["done", "verified"].includes(task.status);
  const isInProgress = task.status === "in_progress";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Assign Task
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
            {error}
          </div>
        )}

        {isCompleted ? (
          <div className="mb-4 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-300">
            This task has been completed and cannot be reassigned.
          </div>
        ) : isInProgress ? (
          <div className="mb-4 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-300">
            This task is in progress. You can view but not change the assignment.
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <svg className="h-6 w-6 animate-spin text-zinc-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : staffMembers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center dark:border-zinc-700 dark:bg-zinc-800/50">
            <svg className="mx-auto h-8 w-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              No staff members available.
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
              Create a user and set their role to "staff" in Supabase.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Select Staff Member
            </label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              disabled={isCompleted || isInProgress}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <option value="">Unassigned</option>
              {staffMembers.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.email || staff.id.slice(0, 8)}
                </option>
              ))}
            </select>

            {task.assigned_to && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Currently assigned to: {staffMembers.find(s => s.id === task.assigned_to)?.email || task.assigned_to.slice(0, 8)}
              </p>
            )}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={isSaving || isCompleted || isInProgress || staffMembers.length === 0}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Saving..." : selectedStaffId ? "Assign" : "Unassign"}
          </button>
        </div>
      </div>
    </>
  );
}

