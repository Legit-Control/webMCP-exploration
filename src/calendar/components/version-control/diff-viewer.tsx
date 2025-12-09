"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Minus,
  Edit3,
  Clock,
  User,
  ChevronDown,
  ChevronRight,
  GitCompare,
  RefreshCw,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { useLegitContext } from "@legit-sdk/react/server";
import { CALENDAR_PATHS } from "@/legit-webmcp/types";
import type { IEvent } from "@/calendar/interfaces";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface EventDiff {
  type: "added" | "removed" | "modified";
  event: IEvent;
  beforeEvent?: IEvent; // For modified events
}

interface DiffViewerProps {
  /** Base branch to compare against (default: "main") */
  baseBranch?: string;
  /** Target branch to show changes from */
  targetBranch: string;
  /** Optional callback when user accepts changes */
  onAccept?: () => void;
  /** Optional callback when user rejects changes */
  onReject?: () => void;
  /** Whether to show action buttons */
  showActions?: boolean;
  /** Compact mode for embedding in other components */
  compact?: boolean;
}

/**
 * Visual Diff Viewer Component
 * Shows differences between two branches in a user-friendly format
 */
export function DiffViewer({
  baseBranch = "main",
  targetBranch,
  onAccept,
  onReject,
  showActions = true,
  compact = false,
}: DiffViewerProps) {
  const { legitFs } = useLegitContext();

  const [diffs, setDiffs] = useState<EventDiff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // Load and compute diff
  const loadDiff = useCallback(async () => {
    if (!legitFs) return;
    setIsLoading(true);
    setError(null);

    try {
      // Read events from both branches
      const [baseEvents, targetEvents] = await Promise.all([
        legitFs.promises
          .readFile(`/.legit/branches/${baseBranch}${CALENDAR_PATHS.EVENTS}`, "utf8")
          .then((data) => JSON.parse(data as string) as IEvent[])
          .catch(() => [] as IEvent[]),
        legitFs.promises
          .readFile(`/.legit/branches/${targetBranch}${CALENDAR_PATHS.EVENTS}`, "utf8")
          .then((data) => JSON.parse(data as string) as IEvent[])
          .catch(() => [] as IEvent[]),
      ]);

      const baseIds = new Set(baseEvents.map((e) => e.id));
      const targetIds = new Set(targetEvents.map((e) => e.id));

      const diffList: EventDiff[] = [];

      // Find added events (in target but not in base)
      for (const event of targetEvents) {
        if (!baseIds.has(event.id)) {
          diffList.push({ type: "added", event });
        }
      }

      // Find removed events (in base but not in target)
      for (const event of baseEvents) {
        if (!targetIds.has(event.id)) {
          diffList.push({ type: "removed", event });
        }
      }

      // Find modified events
      for (const targetEvent of targetEvents) {
        if (baseIds.has(targetEvent.id)) {
          const baseEvent = baseEvents.find((e) => e.id === targetEvent.id)!;
          if (JSON.stringify(baseEvent) !== JSON.stringify(targetEvent)) {
            diffList.push({
              type: "modified",
              event: targetEvent,
              beforeEvent: baseEvent,
            });
          }
        }
      }

      // Sort by type: added, modified, removed
      diffList.sort((a, b) => {
        const order = { added: 0, modified: 1, removed: 2 };
        return order[a.type] - order[b.type];
      });

      setDiffs(diffList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load diff");
    } finally {
      setIsLoading(false);
    }
  }, [legitFs, baseBranch, targetBranch]);

  useEffect(() => {
    loadDiff();
  }, [loadDiff]);

  const toggleExpanded = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const formatEventTime = (event: IEvent) => {
    try {
      const start = parseISO(event.startDate);
      const end = parseISO(event.endDate);
      return `${format(start, "MMM d, yyyy h:mm a")} - ${format(end, "h:mm a")}`;
    } catch {
      return "Invalid date";
    }
  };

  const summary = {
    added: diffs.filter((d) => d.type === "added").length,
    modified: diffs.filter((d) => d.type === "modified").length,
    removed: diffs.filter((d) => d.type === "removed").length,
  };

  const hasChanges = diffs.length > 0;

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center", compact ? "py-4" : "py-12")}>
        <RefreshCw className="size-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading diff...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("text-center", compact ? "py-4" : "py-12")}>
        <p className="text-sm text-red-600">{error}</p>
        <Button variant="outline" size="sm" onClick={loadDiff} className="mt-2">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", !compact && "rounded-lg border border-border bg-card")}>
      {/* Header */}
      {!compact && (
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <GitCompare className="size-4 text-foreground" />
            <span className="font-medium text-foreground">Changes</span>
            <span className="text-xs text-muted-foreground">
              {baseBranch} ← {targetBranch}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={loadDiff} className="size-8 p-0">
            <RefreshCw className="size-4" />
          </Button>
        </div>
      )}

      {/* Summary badges */}
      <div className={cn("flex items-center gap-2", compact ? "mb-2" : "border-b border-border px-4 py-2")}>
        {summary.added > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/50 dark:text-green-300">
            <Plus className="size-3" />
            {summary.added} added
          </span>
        )}
        {summary.modified > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
            <Edit3 className="size-3" />
            {summary.modified} modified
          </span>
        )}
        {summary.removed > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/50 dark:text-red-300">
            <Minus className="size-3" />
            {summary.removed} removed
          </span>
        )}
        {!hasChanges && (
          <span className="text-xs text-muted-foreground">No changes</span>
        )}
      </div>

      {/* Diff list */}
      <ScrollArea className={cn(compact ? "max-h-64" : "max-h-96")}>
        <div className={cn("space-y-2", compact ? "" : "p-4")}>
          {diffs.map((diff) => (
            <DiffItem
              key={diff.event.id}
              diff={diff}
              isExpanded={expandedIds.has(diff.event.id)}
              onToggle={() => toggleExpanded(diff.event.id)}
              formatTime={formatEventTime}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Actions */}
      {showActions && hasChanges && (
        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          {onReject && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReject}
              className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-950/50"
            >
              Reject All
            </Button>
          )}
          {onAccept && (
            <Button
              size="sm"
              onClick={onAccept}
              className="bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
            >
              Accept All
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Single diff item component
 */
function DiffItem({
  diff,
  isExpanded,
  onToggle,
  formatTime,
}: {
  diff: EventDiff;
  isExpanded: boolean;
  onToggle: () => void;
  formatTime: (event: IEvent) => string;
}) {
  const typeStyles = {
    added: {
      bg: "bg-green-50 dark:bg-green-950/30",
      border: "border-green-200 dark:border-green-800",
      icon: Plus,
      iconColor: "text-green-600",
      label: "Added",
    },
    removed: {
      bg: "bg-red-50 dark:bg-red-950/30",
      border: "border-red-200 dark:border-red-800",
      icon: Minus,
      iconColor: "text-red-600",
      label: "Removed",
    },
    modified: {
      bg: "bg-amber-50 dark:bg-amber-950/30",
      border: "border-amber-200 dark:border-amber-800",
      icon: Edit3,
      iconColor: "text-amber-600",
      label: "Modified",
    },
  };

  const style = typeStyles[diff.type];
  const Icon = style.icon;

  return (
    <div className={cn("rounded-lg border", style.border, style.bg)}>
      {/* Header - always visible */}
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        {isExpanded ? (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        )}

        <Icon className={cn("size-4 shrink-0", style.iconColor)} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-foreground">
              {diff.event.title}
            </span>
            <span
              className={cn(
                "shrink-0 rounded px-1.5 py-0.5 text-xs font-medium",
                diff.type === "added" && "bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200",
                diff.type === "removed" && "bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200",
                diff.type === "modified" && "bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
              )}
            >
              {style.label}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {formatTime(diff.event)}
          </p>
        </div>
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="border-t border-inherit px-3 pb-3 pt-2">
          {diff.type === "modified" && diff.beforeEvent ? (
            <ModifiedEventDetails
              before={diff.beforeEvent}
              after={diff.event}
              formatTime={formatTime}
            />
          ) : (
            <EventDetails event={diff.event} formatTime={formatTime} />
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Event details display
 */
function EventDetails({
  event,
  formatTime,
}: {
  event: IEvent;
  formatTime: (event: IEvent) => string;
}) {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Clock className="size-3.5" />
        <span>{formatTime(event)}</span>
      </div>
      {event.description && (
        <p className="text-muted-foreground">{event.description}</p>
      )}
      {event.user && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <User className="size-3.5" />
          <span>{event.user.name}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Modified event details - shows before/after comparison
 */
function ModifiedEventDetails({
  before,
  after,
  formatTime,
}: {
  before: IEvent;
  after: IEvent;
  formatTime: (event: IEvent) => string;
}) {
  const changes: { field: string; before: string; after: string }[] = [];

  if (before.title !== after.title) {
    changes.push({ field: "Title", before: before.title, after: after.title });
  }
  if (before.description !== after.description) {
    changes.push({
      field: "Description",
      before: before.description || "(none)",
      after: after.description || "(none)",
    });
  }
  if (before.startDate !== after.startDate || before.endDate !== after.endDate) {
    changes.push({
      field: "Time",
      before: formatTime(before),
      after: formatTime(after),
    });
  }
  if (before.color !== after.color) {
    changes.push({
      field: "Color",
      before: before.color || "default",
      after: after.color || "default",
    });
  }

  return (
    <div className="space-y-2">
      {changes.map((change) => (
        <div key={change.field} className="text-sm">
          <span className="font-medium text-foreground">
            {change.field}:
          </span>
          <div className="mt-1 flex flex-col gap-1 pl-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="rounded bg-red-100 px-1 text-red-800 line-through dark:bg-red-900/50 dark:text-red-200">
                {change.before}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-green-100 px-1 text-green-800 dark:bg-green-900/50 dark:text-green-200">
                {change.after}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Standalone diff viewer that compares current branch against main
 */
export function CurrentBranchDiff() {
  const { legitFs } = useLegitContext();
  const [currentBranch, setCurrentBranch] = useState<string | null>(null);

  useEffect(() => {
    if (!legitFs) return;
    legitFs.getCurrentBranch().then(setCurrentBranch);
  }, [legitFs]);

  if (!currentBranch || currentBranch === "main") {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        <GitCompare className="mx-auto mb-2 size-8 opacity-50" />
        <p>You are on the main branch</p>
        <p className="mt-1 text-xs">Switch to an agent branch to see changes</p>
      </div>
    );
  }

  return <DiffViewer baseBranch="main" targetBranch={currentBranch} />;
}
