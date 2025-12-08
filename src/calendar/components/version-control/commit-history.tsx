"use client";

import { useState, useMemo } from "react";
import {
  GitCommit,
  User,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Bot,
  Plus,
  Minus,
  Edit3,
  Clock,
  GitBranch,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useLegitContext, useLegitFile } from "@legit-sdk/react";
import type { HistoryItem } from "@legit-sdk/core";
import { useMultiAgentCoordination, type CommitRecord } from "@/legit-webmcp";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface CommitHistoryProps {
  /** Max height for the list */
  maxHeight?: string;
  /** Whether to show the rollback button */
  showRollback?: boolean;
  /** Callback when a commit is selected */
  onSelectCommit?: (commitOid: string) => void;
}

/**
 * Commit History Component
 * Shows a timeline of all commits with ability to rollback
 */
export function CommitHistory({
  maxHeight = "400px",
  showRollback = true,
  onSelectCommit,
}: CommitHistoryProps) {
  const { rollback } = useLegitContext();
  const { data: eventsData, history: legitHistory } = useLegitFile(
    "/calendar/events.json",
    { initialData: "[]" }
  );
  const { getCommitHistory } = useMultiAgentCoordination();

  const [expandedCommits, setExpandedCommits] = useState<Set<string>>(new Set());
  const [isRollingBack, setIsRollingBack] = useState<string | null>(null);

  // Merge Legit history with custom commit records
  const mergedHistory = useMemo(() => {
    const customCommits = getCommitHistory();
    const legitHistoryItems = legitHistory || [];

    // Create a map of custom commit info by timestamp (approximate matching)
    const customCommitMap = new Map<number, CommitRecord>();
    for (const commit of customCommits) {
      // Round to nearest second for matching
      const timestamp = Math.floor(commit.timestamp.getTime() / 1000);
      customCommitMap.set(timestamp, commit);
    }

    // Enhance legit history with custom commit info
    return legitHistoryItems.map((item, index) => {
      // Try to find matching custom commit
      const itemTimestamp = item.author?.timestamp || 0;
      const customInfo = customCommitMap.get(itemTimestamp);

      return {
        ...item,
        index,
        isHead: index === 0,
        customMessage: customInfo?.message,
        customSummary: customInfo?.summary,
        agentId: customInfo?.agentId,
      };
    });
  }, [legitHistory, getCommitHistory]);

  const toggleExpanded = (oid: string) => {
    setExpandedCommits((prev) => {
      const next = new Set(prev);
      if (next.has(oid)) {
        next.delete(oid);
      } else {
        next.add(oid);
      }
      return next;
    });
  };

  const handleRollback = async (commitOid: string) => {
    setIsRollingBack(commitOid);
    try {
      await rollback(commitOid);
    } catch (error) {
      console.error("Rollback failed:", error);
    } finally {
      setIsRollingBack(null);
    }
  };

  if (mergedHistory.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        <GitCommit className="mx-auto mb-2 size-8 opacity-50" />
        <p>No commit history</p>
        <p className="mt-1 text-xs">Changes will appear here as they are made</p>
      </div>
    );
  }

  return (
    <ScrollArea style={{ maxHeight }}>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

        {/* Commits */}
        <div className="space-y-1 py-2">
          {mergedHistory.map((commit, index) => (
            <CommitItem
              key={commit.oid}
              commit={commit}
              isHead={commit.isHead}
              isExpanded={expandedCommits.has(commit.oid)}
              onToggle={() => toggleExpanded(commit.oid)}
              onRollback={showRollback ? handleRollback : undefined}
              onSelect={onSelectCommit}
              isRollingBack={isRollingBack === commit.oid}
            />
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}

interface EnhancedHistoryItem extends HistoryItem {
  index: number;
  isHead: boolean;
  customMessage?: string;
  customSummary?: {
    eventsAdded: number;
    eventsRemoved: number;
    eventsModified: number;
  };
  agentId?: string;
}

function CommitItem({
  commit,
  isHead,
  isExpanded,
  onToggle,
  onRollback,
  onSelect,
  isRollingBack,
}: {
  commit: EnhancedHistoryItem;
  isHead: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onRollback?: (oid: string) => void;
  onSelect?: (oid: string) => void;
  isRollingBack: boolean;
}) {
  const timestamp = commit.author?.timestamp
    ? new Date(commit.author.timestamp * 1000)
    : new Date();

  const displayMessage = commit.customMessage || commit.message || "Checkpoint";
  const hasAgent = !!commit.agentId;
  const hasSummary = !!commit.customSummary;

  return (
    <div className="relative pl-8">
      {/* Timeline dot */}
      <div
        className={cn(
          "absolute left-2.5 top-3 size-3 rounded-full border-2 bg-background",
          isHead
            ? "border-green-500 ring-2 ring-green-200 dark:ring-green-800"
            : hasAgent
            ? "border-foreground"
            : "border-muted-foreground/50"
        )}
      />

      <div
        className={cn(
          "rounded-lg border p-3 transition-colors",
          isHead
            ? "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/30"
            : "border-border bg-card hover:bg-accent"
        )}
      >
        {/* Header row */}
        <button
          onClick={onToggle}
          className="flex w-full items-start gap-2 text-left"
        >
          {isExpanded ? (
            <ChevronDown className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <GitCommit className="size-3.5 shrink-0 text-muted-foreground" />
              <code className="text-xs text-muted-foreground">{commit.oid.slice(0, 7)}</code>
              {isHead && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/50 dark:text-green-300">
                  HEAD
                </span>
              )}
              {hasAgent && (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                  <Bot className="size-3" />
                  {commit.agentId}
                </span>
              )}
            </div>

            <p className="mt-1 text-sm font-medium text-foreground">
              {displayMessage}
            </p>

            {/* Summary badges */}
            {hasSummary && commit.customSummary && (
              <div className="mt-1.5 flex items-center gap-2">
                {commit.customSummary.eventsAdded > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-xs text-green-600 dark:text-green-400">
                    <Plus className="size-3" />
                    {commit.customSummary.eventsAdded}
                  </span>
                )}
                {commit.customSummary.eventsModified > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-xs text-amber-600 dark:text-amber-400">
                    <Edit3 className="size-3" />
                    {commit.customSummary.eventsModified}
                  </span>
                )}
                {commit.customSummary.eventsRemoved > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-xs text-red-600 dark:text-red-400">
                    <Minus className="size-3" />
                    {commit.customSummary.eventsRemoved}
                  </span>
                )}
              </div>
            )}

            {/* Timestamp */}
            <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {format(timestamp, "MMM d, h:mm a")}
              </span>
              <span className="text-muted-foreground/70">
                {formatDistanceToNow(timestamp, { addSuffix: true })}
              </span>
            </div>
          </div>
        </button>

        {/* Expanded details */}
        {isExpanded && (
          <div className="mt-3 border-t border-border pt-3">
            <div className="space-y-2 text-sm">
              {/* Author */}
              {commit.author && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="size-3.5" />
                  <span>{commit.author.name || "Unknown"}</span>
                  {commit.author.email && (
                    <span className="text-muted-foreground/70">({commit.author.email})</span>
                  )}
                </div>
              )}

              {/* Full OID */}
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Full hash:</span>
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  {commit.oid}
                </code>
              </div>

              {/* Actions */}
              {!isHead && onRollback && (
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRollback(commit.oid)}
                    disabled={isRollingBack}
                    className="gap-1 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:text-amber-400 dark:hover:bg-amber-950"
                  >
                    <RotateCcw className={cn("size-3.5", isRollingBack && "animate-spin")} />
                    Restore this version
                  </Button>
                  {onSelect && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSelect(commit.oid)}
                      className="gap-1"
                    >
                      View diff
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Compact commit history for embedding in sidebars
 */
export function CompactCommitHistory({
  limit = 5,
  onViewAll,
}: {
  limit?: number;
  onViewAll?: () => void;
}) {
  const { data: eventsData, history: legitHistory } = useLegitFile(
    "/calendar/events.json",
    { initialData: "[]" }
  );
  const { rollback } = useLegitContext();

  const recentCommits = (legitHistory || []).slice(0, limit);

  if (recentCommits.length === 0) {
    return (
      <p className="py-4 text-center text-xs text-muted-foreground">
        No commits yet
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {recentCommits.map((commit, index) => (
        <div
          key={commit.oid}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
        >
          <GitCommit className="size-3.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-foreground">
              {commit.message || "Checkpoint"}
            </p>
            <p className="text-xs text-muted-foreground">
              {commit.author?.timestamp
                ? formatDistanceToNow(
                    new Date(commit.author.timestamp * 1000),
                    { addSuffix: true }
                  )
                : "Unknown time"}
            </p>
          </div>
          {index === 0 && (
            <span className="shrink-0 rounded bg-green-100 px-1 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/50 dark:text-green-300">
              HEAD
            </span>
          )}
        </div>
      ))}

      {onViewAll && legitHistory && legitHistory.length > limit && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onViewAll}
          className="w-full text-xs"
        >
          View all {legitHistory.length} commits
        </Button>
      )}
    </div>
  );
}
