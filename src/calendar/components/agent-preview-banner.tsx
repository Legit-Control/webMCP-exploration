"use client";

import { Bot, Check, X, RefreshCw, EyeOff } from "lucide-react";
import { useAgentPreview } from "@/calendar/contexts/agent-preview-context";
import { usePendingChangesSummary } from "@/calendar/hooks/use-combined-events";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Banner shown at the top of the calendar when previewing agent changes.
 * Displays the agent ID, change summary, and accept/reject buttons.
 */
export function AgentPreviewBanner() {
  const {
    isPreviewMode,
    previewAgentId,
    loading,
    stopPreview,
    acceptAllChanges,
    rejectAllChanges,
    refreshPreview,
  } = useAgentPreview();

  const summary = usePendingChangesSummary();

  // Don't render if not in preview mode
  if (!isPreviewMode) {
    return null;
  }

  // Use summary if available, otherwise show default state
  const displaySummary = summary || {
    added: 0,
    modified: 0,
    removed: 0,
    total: 0,
    hasChanges: false,
    summary: "",
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 px-4 py-2",
        "bg-gradient-to-r from-purple-100 via-blue-50 to-purple-100",
        "dark:from-purple-950/50 dark:via-blue-950/30 dark:to-purple-950/50",
        "border-b border-purple-200 dark:border-purple-800"
      )}
    >
      {/* Left side: Agent info and change summary */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-full bg-purple-600 text-white">
            <Bot className="size-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-purple-900 dark:text-purple-100">
              Previewing AI Changes
            </p>
            <p className="text-xs text-purple-700 dark:text-purple-300">
              Agent: {previewAgentId}
            </p>
          </div>
        </div>

        {/* Change summary badges */}
        <div className="flex items-center gap-2">
          {displaySummary.added > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/50 dark:text-green-300">
              +{displaySummary.added} added
            </span>
          )}
          {displaySummary.modified > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
              ~{displaySummary.modified} modified
            </span>
          )}
          {displaySummary.removed > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/50 dark:text-red-300">
              -{displaySummary.removed} removed
            </span>
          )}
          {!displaySummary.hasChanges && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              No pending changes
            </span>
          )}
        </div>
      </div>

      {/* Right side: Action buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={refreshPreview}
          disabled={loading}
          className="text-purple-700 hover:bg-purple-200/50 hover:text-purple-900 dark:text-purple-300 dark:hover:bg-purple-800/50"
        >
          <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          <span className="sr-only">Refresh</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={stopPreview}
          className="text-gray-700 hover:bg-gray-200/50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800/50"
        >
          <EyeOff className="mr-1.5 size-4" />
          Exit Preview
        </Button>

        {displaySummary.hasChanges && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={rejectAllChanges}
              disabled={loading}
              className="border-red-300 text-red-700 hover:bg-red-50 hover:text-red-900 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-950/50"
            >
              <X className="mr-1.5 size-4" />
              Reject All
            </Button>

            <Button
              size="sm"
              onClick={acceptAllChanges}
              disabled={loading}
              className="bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
            >
              <Check className="mr-1.5 size-4" />
              Accept All
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
