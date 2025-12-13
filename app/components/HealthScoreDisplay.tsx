"use client";

import { useEffect, useState } from "react";

interface HealthScoreDisplayProps {
  score: number;
  showDetails?: boolean;
}

type HealthLabel = "excellent" | "good" | "fair" | "risky" | "critical";

function getHealthLabel(score: number): HealthLabel {
  if (score >= 90) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "fair";
  if (score >= 30) return "risky";
  return "critical";
}

function getHealthConfig(label: HealthLabel): {
  displayLabel: string;
  barColor: string;
  bgColor: string;
  textColor: string;
  icon: React.ReactNode;
} {
  switch (label) {
    case "excellent":
      return {
        displayLabel: "Excellent",
        barColor: "bg-green-500",
        bgColor: "bg-green-100 dark:bg-green-900/30",
        textColor: "text-green-700 dark:text-green-300",
        icon: (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      };
    case "good":
      return {
        displayLabel: "Good",
        barColor: "bg-blue-500",
        bgColor: "bg-blue-100 dark:bg-blue-900/30",
        textColor: "text-blue-700 dark:text-blue-300",
        icon: (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
          </svg>
        ),
      };
    case "fair":
      return {
        displayLabel: "Fair",
        barColor: "bg-yellow-500",
        bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
        textColor: "text-yellow-700 dark:text-yellow-300",
        icon: (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        ),
      };
    case "risky":
      return {
        displayLabel: "Risky",
        barColor: "bg-orange-500",
        bgColor: "bg-orange-100 dark:bg-orange-900/30",
        textColor: "text-orange-700 dark:text-orange-300",
        icon: (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      };
    case "critical":
      return {
        displayLabel: "Critical",
        barColor: "bg-red-500",
        bgColor: "bg-red-100 dark:bg-red-900/30",
        textColor: "text-red-700 dark:text-red-300",
        icon: (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      };
  }
}

export default function HealthScoreDisplay({
  score,
  showDetails = true,
}: HealthScoreDisplayProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const label = getHealthLabel(score);
  const config = getHealthConfig(label);

  // Animate score on mount
  useEffect(() => {
    const duration = 800;
    const steps = 30;
    const increment = score / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(Math.round(increment * step), score);
      setAnimatedScore(current);

      if (step >= steps) {
        clearInterval(timer);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [score]);

  return (
    <div className="space-y-3">
      {/* Header with score and label */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`${config.textColor}`}>{config.icon}</div>
          <span className={`font-medium ${config.textColor}`}>
            {config.displayLabel}
          </span>
        </div>
        <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {animatedScore}
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
        <div
          className={`absolute left-0 top-0 h-full rounded-full transition-all duration-700 ease-out ${config.barColor}`}
          style={{ width: `${animatedScore}%` }}
        />
      </div>

      {/* Score scale */}
      {showDetails && (
        <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>0</span>
          <span>50</span>
          <span>100</span>
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for cards/lists
 */
export function HealthScoreBadge({ score }: { score: number }) {
  const label = getHealthLabel(score);
  const config = getHealthConfig(label);

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.bgColor} ${config.textColor}`}
    >
      <div className="scale-75">{config.icon}</div>
      <span>{score}</span>
    </div>
  );
}

