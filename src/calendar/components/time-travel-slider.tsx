"use client";

import { useState, useMemo } from "react";
import { History, RotateCcw, ChevronLeft, ChevronRight, GitCommit, User as UserIcon } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useLegitContext } from "@legit-sdk/react/server";
import type { HistoryItem } from "@legit-sdk/core";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TimeTravelSliderProps {
  history: HistoryItem[];
  onRollback: (commitOid: string) => Promise<void>;
}

/**
 * Time Travel Slider component
 * Allows users to visually explore commit history and restore past states
 */
export function TimeTravelSlider({ history, onRollback }: TimeTravelSliderProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isRollingBack, setIsRollingBack] = useState(false);

  // Reverse history so oldest is first (left) and newest is last (right)
  const reversedHistory = useMemo(() => [...history].reverse(), [history]);

  const selectedCommit = reversedHistory[selectedIndex];
  const isAtHead = selectedIndex === reversedHistory.length - 1;

  const handleRollback = async () => {
    if (!selectedCommit || isAtHead) return;

    setIsRollingBack(true);
    try {
      await onRollback(selectedCommit.oid);
    } finally {
      setIsRollingBack(false);
    }
  };

  if (history.length <= 1) {
    return null;
  }

  return (
    <div className="border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
      {/* Collapsed view - just a toggle button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
      >
        <div className="flex items-center gap-2">
          <History className="size-4" />
          <span>Time Travel</span>
          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs dark:bg-gray-700">
            {history.length} commits
          </span>
        </div>
        <ChevronRight
          className={cn(
            "size-4 transition-transform",
            isExpanded && "rotate-90"
          )}
        />
      </button>

      {/* Expanded view - slider and commit details */}
      {isExpanded && (
        <div className="space-y-4 px-4 pb-4">
          {/* Timeline slider */}
          <div className="relative">
            {/* Track */}
            <div className="relative h-2 rounded-full bg-gray-200 dark:bg-gray-700">
              {/* Progress fill */}
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-purple-500"
                style={{
                  width: `${((selectedIndex + 1) / reversedHistory.length) * 100}%`,
                }}
              />

              {/* Commit dots */}
              <div className="absolute inset-0 flex items-center justify-between px-1">
                {reversedHistory.map((commit, index) => (
                  <button
                    key={commit.oid}
                    onClick={() => setSelectedIndex(index)}
                    className={cn(
                      "size-3 rounded-full border-2 transition-all",
                      index === selectedIndex
                        ? "scale-150 border-purple-500 bg-white dark:bg-gray-900"
                        : index < selectedIndex
                        ? "border-purple-400 bg-purple-400"
                        : "border-gray-300 bg-gray-300 dark:border-gray-600 dark:bg-gray-600"
                    )}
                    title={commit.message || `Commit ${commit.oid.slice(0, 7)}`}
                  />
                ))}
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="mt-2 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIndex(Math.max(0, selectedIndex - 1))}
                disabled={selectedIndex === 0}
                className="h-8 px-2"
              >
                <ChevronLeft className="size-4" />
                <span className="sr-only">Previous commit</span>
              </Button>

              <span className="text-xs text-gray-500">
                {selectedIndex + 1} of {reversedHistory.length}
              </span>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIndex(Math.min(reversedHistory.length - 1, selectedIndex + 1))}
                disabled={selectedIndex === reversedHistory.length - 1}
                className="h-8 px-2"
              >
                <ChevronRight className="size-4" />
                <span className="sr-only">Next commit</span>
              </Button>
            </div>
          </div>

          {/* Selected commit details */}
          {selectedCommit && (
            <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <GitCommit className="size-4 shrink-0 text-purple-500" />
                    <code className="truncate text-xs text-gray-500">
                      {selectedCommit.oid.slice(0, 7)}
                    </code>
                    {isAtHead && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/50 dark:text-green-300">
                        HEAD
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {selectedCommit.message || "No message"}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <UserIcon className="size-3" />
                      {selectedCommit.author?.name || "Unknown"}
                    </span>
                    <span>
                      {format(new Date(selectedCommit.author.timestamp * 1000), "MMM d, yyyy h:mm a")}
                    </span>
                    <span className="text-gray-400">
                      ({formatDistanceToNow(new Date(selectedCommit.author.timestamp * 1000), { addSuffix: true })})
                    </span>
                  </div>
                </div>

                {!isAtHead && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRollback}
                    disabled={isRollingBack}
                    className="shrink-0 gap-1 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:text-amber-400 dark:hover:bg-amber-950"
                  >
                    <RotateCcw className={cn("size-4", isRollingBack && "animate-spin")} />
                    Restore
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Help text */}
          <p className="text-center text-xs text-gray-500">
            Click on any point in the timeline to preview, then click &quot;Restore&quot; to go back to that state
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Wrapper component that gets history from context
 */
export function TimeTravelSliderWithContext() {
  const { legitFs } = useLegitContext();
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // This component needs to be connected to the actual history
  // For now, we'll export both the standalone and context-aware versions

  const handleRollback = async (commitOid: string) => {
    if (!legitFs) return;
    const branch = await legitFs.getCurrentBranch();
    await legitFs.promises.writeFile(
      `/.legit/branches/${branch}/.legit/head`,
      commitOid,
      "utf8"
    );
  };

  return <TimeTravelSlider history={history} onRollback={handleRollback} />;
}
