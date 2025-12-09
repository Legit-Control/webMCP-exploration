"use client";

import { useState, useEffect, useCallback } from "react";
import {
  GitMerge,
  GitBranch,
  ArrowRight,
  Check,
  X,
  AlertCircle,
  Bot,
  Plus,
  Minus,
  Edit3,
  Loader2,
} from "lucide-react";
import { useLegitContext } from "@legit-sdk/react/server";
import { useMultiAgentCoordination } from "@/legit-webmcp";
import { useAgentPreview } from "@/calendar/contexts/agent-preview-context";
import { DiffViewer } from "./diff-viewer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface MergeRequestProps {
  /** The source branch to merge from */
  sourceBranch: string;
  /** The target branch to merge into (default: main) */
  targetBranch?: string;
  /** Callback when merge is complete */
  onMergeComplete?: () => void;
  /** Callback when merge is cancelled */
  onCancel?: () => void;
}

/**
 * Merge Request Component
 * A PR-like interface for reviewing and merging agent changes
 */
export function MergeRequest({
  sourceBranch,
  targetBranch = "main",
  onMergeComplete,
  onCancel,
}: MergeRequestProps) {
  const { legitFs } = useLegitContext();
  const { mergeAgentChanges, getAgentPreview } = useMultiAgentCoordination();

  const [commitMessage, setCommitMessage] = useState("");
  const [isMerging, setIsMerging] = useState(false);
  const [mergeResult, setMergeResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [preview, setPreview] = useState<{
    hasChanges: boolean;
    summary: {
      eventsAdded: number;
      eventsRemoved: number;
      eventsModified: number;
    };
  } | null>(null);

  // Load preview on mount
  useEffect(() => {
    const loadPreview = async () => {
      const result = await getAgentPreview(sourceBranch);
      if (result) {
        const summary = result.summary || { eventsAdded: 0, eventsRemoved: 0, eventsModified: 0 };
        setPreview({
          hasChanges: result.hasChanges,
          summary,
        });
        // Generate default commit message
        const parts: string[] = [];
        if (summary.eventsAdded > 0) {
          parts.push(`Add ${summary.eventsAdded} event(s)`);
        }
        if (summary.eventsModified > 0) {
          parts.push(`Update ${summary.eventsModified} event(s)`);
        }
        if (summary.eventsRemoved > 0) {
          parts.push(`Remove ${summary.eventsRemoved} event(s)`);
        }
        setCommitMessage(parts.join(", ") || "Merge changes");
      }
    };
    loadPreview();
  }, [sourceBranch, getAgentPreview]);

  const handleMerge = async () => {
    setIsMerging(true);
    setMergeResult(null);

    try {
      const result = await mergeAgentChanges(sourceBranch, {
        message: commitMessage || `Merge ${sourceBranch} into ${targetBranch}`,
      });

      if (result.success) {
        setMergeResult({
          success: true,
          message: result.merged
            ? "Changes merged successfully!"
            : "No changes to merge.",
        });
        if (result.merged) {
          onMergeComplete?.();
        }
      } else {
        setMergeResult({
          success: false,
          message: "Failed to merge changes.",
        });
      }
    } catch (error) {
      setMergeResult({
        success: false,
        message: error instanceof Error ? error.message : "Merge failed",
      });
    } finally {
      setIsMerging(false);
    }
  };

  // Parse agent info from branch name
  const agentInfo = sourceBranch.startsWith("agent-")
    ? (() => {
        const parts = sourceBranch.slice(6).split("-");
        return {
          modelName: parts[0],
          agentId: parts.slice(1).join("-"),
        };
      })()
    : null;

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-secondary">
            <GitMerge className="size-5 text-secondary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Merge Request</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 font-mono text-xs text-secondary-foreground">
                {agentInfo && <Bot className="size-3" />}
                {sourceBranch}
              </span>
              <ArrowRight className="size-4" />
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                <GitBranch className="size-3" />
                {targetBranch}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Changes summary */}
      {preview && (
        <div className="border-b border-border bg-muted/50 px-6 py-3">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-foreground">
              Changes:
            </span>
            <div className="flex items-center gap-3">
              {preview.summary.eventsAdded > 0 && (
                <span className="inline-flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                  <Plus className="size-4" />
                  {preview.summary.eventsAdded} added
                </span>
              )}
              {preview.summary.eventsModified > 0 && (
                <span className="inline-flex items-center gap-1 text-sm text-amber-600 dark:text-amber-400">
                  <Edit3 className="size-4" />
                  {preview.summary.eventsModified} modified
                </span>
              )}
              {preview.summary.eventsRemoved > 0 && (
                <span className="inline-flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
                  <Minus className="size-4" />
                  {preview.summary.eventsRemoved} removed
                </span>
              )}
              {!preview.hasChanges && (
                <span className="text-sm text-muted-foreground">No changes</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Diff viewer */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          <DiffViewer
            baseBranch={targetBranch}
            targetBranch={sourceBranch}
            showActions={false}
            compact
          />
        </div>
      </ScrollArea>

      {/* Commit message */}
      <div className="border-t border-border px-6 py-4">
        <Label htmlFor="commit-message" className="text-sm font-medium">
          Commit Message
        </Label>
        <Input
          id="commit-message"
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          placeholder="Describe the changes..."
          className="mt-2"
        />
      </div>

      {/* Result message */}
      {mergeResult && (
        <div
          className={cn(
            "mx-6 mb-4 flex items-center gap-2 rounded-lg px-4 py-3",
            mergeResult.success
              ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200"
              : "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200"
          )}
        >
          {mergeResult.success ? (
            <Check className="size-5" />
          ) : (
            <AlertCircle className="size-5" />
          )}
          <span className="text-sm font-medium">{mergeResult.message}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={handleMerge}
          disabled={isMerging || !preview?.hasChanges}
          className="gap-2 bg-green-600 text-white hover:bg-green-700"
        >
          {isMerging ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Merging...
            </>
          ) : (
            <>
              <GitMerge className="size-4" />
              Merge Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

/**
 * Merge Request Dialog - opens the merge request in a dialog
 */
export function MergeRequestDialog({
  sourceBranch,
  targetBranch = "main",
  trigger,
  onMergeComplete,
}: {
  sourceBranch: string;
  targetBranch?: string;
  trigger: React.ReactNode;
  onMergeComplete?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleMergeComplete = () => {
    onMergeComplete?.();
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden p-0">
        <MergeRequest
          sourceBranch={sourceBranch}
          targetBranch={targetBranch}
          onMergeComplete={handleMergeComplete}
          onCancel={() => setIsOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

/**
 * Pending Merge Requests list - shows all agent branches that can be merged
 */
export function PendingMergeRequests() {
  const { legitFs } = useLegitContext();
  const { activeSessions, getAgentPreview, defaultBranch } = useMultiAgentCoordination();

  const [branches, setBranches] = useState<
    Array<{
      name: string;
      agentId?: string;
      modelName?: string;
      hasChanges: boolean;
      summary: {
        eventsAdded: number;
        eventsRemoved: number;
        eventsModified: number;
      };
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load all agent branches and their preview data
  useEffect(() => {
    const loadBranches = async () => {
      if (!legitFs) return;
      setIsLoading(true);

      try {
        const branchesDir = "/.legit/branches";
        const entries = await legitFs.promises.readdir(branchesDir);
        const agentBranches: typeof branches = [];

        for (const entry of entries) {
          const branchName = String(entry);
          if (!branchName.startsWith("agent-")) continue;

          // Parse agent info
          const parts = branchName.slice(6).split("-");
          const modelName = parts[0];
          const agentId = parts.slice(1).join("-");

          // Get preview
          const preview = await getAgentPreview(branchName);

          if (preview) {
            agentBranches.push({
              name: branchName,
              agentId,
              modelName,
              hasChanges: preview.hasChanges,
              summary: preview.summary || { eventsAdded: 0, eventsRemoved: 0, eventsModified: 0 },
            });
          }
        }

        // Sort by those with changes first
        agentBranches.sort((a, b) => {
          if (a.hasChanges && !b.hasChanges) return -1;
          if (!a.hasChanges && b.hasChanges) return 1;
          return a.name.localeCompare(b.name);
        });

        setBranches(agentBranches);
      } catch (error) {
        console.error("Failed to load branches:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadBranches();
  }, [legitFs, getAgentPreview]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (branches.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        <GitMerge className="mx-auto mb-2 size-8 opacity-50" />
        <p>No pending merge requests</p>
        <p className="mt-1 text-xs">
          Agent branches will appear here when available
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      {branches.map((branch) => (
        <div
          key={branch.name}
          className={cn(
            "rounded-lg border p-3",
            branch.hasChanges
              ? "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30"
              : "border-border bg-card"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="size-4 text-muted-foreground" />
              <span className="font-mono text-sm font-medium">
                {branch.agentId}
              </span>
              {branch.modelName && (
                <span className="text-xs text-muted-foreground">({branch.modelName})</span>
              )}
            </div>

            <MergeRequestDialog
              sourceBranch={branch.name}
              trigger={
                <Button
                  size="sm"
                  variant={branch.hasChanges ? "default" : "outline"}
                  className="gap-1"
                  disabled={!branch.hasChanges}
                >
                  <GitMerge className="size-3.5" />
                  Review
                </Button>
              }
            />
          </div>

          {/* Change summary */}
          {branch.hasChanges && (
            <div className="mt-2 flex items-center gap-3 text-xs">
              {branch.summary.eventsAdded > 0 && (
                <span className="text-green-600 dark:text-green-400">
                  +{branch.summary.eventsAdded}
                </span>
              )}
              {branch.summary.eventsModified > 0 && (
                <span className="text-amber-600 dark:text-amber-400">
                  ~{branch.summary.eventsModified}
                </span>
              )}
              {branch.summary.eventsRemoved > 0 && (
                <span className="text-red-600 dark:text-red-400">
                  -{branch.summary.eventsRemoved}
                </span>
              )}
            </div>
          )}

          {!branch.hasChanges && (
            <p className="mt-1 text-xs text-muted-foreground">No pending changes</p>
          )}
        </div>
      ))}
    </div>
  );
}
