"use client";

import { useState, useEffect } from "react";
import {
  GitBranch,
  GitCommit,
  Bot,
  Home,
  History,
  AlertCircle,
  Check,
  Eye,
  Loader2,
} from "lucide-react";
import { useLegitContext, useLegitFile } from "@legit-sdk/react";
import { useMultiAgentCoordination } from "@/legit-webmcp";
import { useAgentPreview } from "@/calendar/contexts/agent-preview-context";
import { BranchSwitcher } from "./branch-switcher";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StatusBarProps {
  /** Whether to show in compact mode */
  compact?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Git-like Status Bar Component
 * Shows current branch, commit count, and pending changes indicator
 */
export function StatusBar({ compact = false, className }: StatusBarProps) {
  const { legitFs, head } = useLegitContext();
  const { data: eventsData, history } = useLegitFile("/calendar/events.json", {
    initialData: "[]",
  });
  const {
    currentBranch,
    defaultBranch,
    activeSessions,
    getAgentPreview,
  } = useMultiAgentCoordination();
  const { isPreviewMode, previewAgentId, startPreview, stopPreview } = useAgentPreview();

  const [branchName, setBranchName] = useState<string>("main");
  const [isAgentBranch, setIsAgentBranch] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [changeSummary, setChangeSummary] = useState<{
    added: number;
    modified: number;
    removed: number;
  } | null>(null);
  const [isCheckingChanges, setIsCheckingChanges] = useState(false);

  // Update branch info
  useEffect(() => {
    if (!legitFs) return;

    const updateBranchInfo = async () => {
      const branch = await legitFs.getCurrentBranch();
      setBranchName(branch);
      setIsAgentBranch(branch.startsWith("agent-"));

      // Check for changes if on agent branch
      if (branch.startsWith("agent-")) {
        setIsCheckingChanges(true);
        const preview = await getAgentPreview(branch);
        if (preview) {
          setHasChanges(preview.hasChanges);
          setChangeSummary(preview.summary ? {
            added: preview.summary.eventsAdded,
            modified: preview.summary.eventsModified,
            removed: preview.summary.eventsRemoved,
          } : null);
        }
        setIsCheckingChanges(false);
      } else {
        setHasChanges(false);
        setChangeSummary(null);
      }
    };

    updateBranchInfo();
  }, [legitFs, head, getAgentPreview]);

  // Parse agent info
  const agentInfo = isAgentBranch
    ? (() => {
        const parts = branchName.slice(6).split("-");
        return {
          modelName: parts[0],
          agentId: parts.slice(1).join("-"),
        };
      })()
    : null;

  const commitCount = history?.length || 0;

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 text-xs text-muted-foreground",
          className
        )}
      >
        {isAgentBranch ? (
          <Bot className="size-3 text-foreground" />
        ) : (
          <GitBranch className="size-3" />
        )}
        <span className="font-mono">{isAgentBranch ? agentInfo?.agentId : branchName}</span>
        {hasChanges && (
          <span className="rounded bg-amber-100 px-1 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
            Modified
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2",
        isPreviewMode && "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30",
        hasChanges && !isPreviewMode && "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30",
        className
      )}
    >
      {/* Left: Branch info */}
      <div className="flex items-center gap-3">
        <BranchSwitcher />

        {/* Commit count */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <History className="size-3.5" />
          <span>{commitCount} commit{commitCount !== 1 && "s"}</span>
        </div>

        {/* Agent sessions count */}
        {activeSessions.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-foreground">
            <Bot className="size-3.5" />
            <span>{activeSessions.length} agent{activeSessions.length !== 1 && "s"}</span>
          </div>
        )}
      </div>

      {/* Right: Status indicators and actions */}
      <div className="flex items-center gap-2">
        {/* Preview mode indicator */}
        {isPreviewMode && (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
              <Eye className="size-3.5" />
              Previewing {previewAgentId}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={stopPreview}
              className="h-6 px-2 text-xs"
            >
              Exit Preview
            </Button>
          </div>
        )}

        {/* Changes indicator */}
        {!isPreviewMode && isAgentBranch && (
          <>
            {isCheckingChanges ? (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                Checking...
              </span>
            ) : hasChanges ? (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                  <AlertCircle className="size-3.5" />
                  {changeSummary && (
                    <span>
                      {changeSummary.added > 0 && `+${changeSummary.added}`}
                      {changeSummary.modified > 0 && ` ~${changeSummary.modified}`}
                      {changeSummary.removed > 0 && ` -${changeSummary.removed}`}
                    </span>
                  )}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => startPreview(branchName)}
                  className="h-6 gap-1 px-2 text-xs"
                >
                  <Eye className="size-3" />
                  Preview
                </Button>
              </div>
            ) : (
              <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <Check className="size-3.5" />
                No changes
              </span>
            )}
          </>
        )}

        {/* Main branch indicator */}
        {!isPreviewMode && !isAgentBranch && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Home className="size-3.5" />
            Main branch
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Minimal inline status for headers
 */
export function InlineStatus() {
  const { legitFs, head } = useLegitContext();
  const { data: eventsData, history } = useLegitFile("/calendar/events.json", {
    initialData: "[]",
  });

  const [branchName, setBranchName] = useState<string>("main");
  const [isAgentBranch, setIsAgentBranch] = useState(false);

  useEffect(() => {
    if (!legitFs) return;
    legitFs.getCurrentBranch().then((branch) => {
      setBranchName(branch);
      setIsAgentBranch(branch.startsWith("agent-"));
    });
  }, [legitFs, head]);

  const commitCount = history?.length || 0;

  // Parse agent ID for display
  const displayName = isAgentBranch
    ? branchName.slice(6).split("-").slice(1).join("-") // Extract agent ID
    : branchName;

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      {isAgentBranch ? (
        <Bot className="size-3 text-foreground" />
      ) : (
        <GitBranch className="size-3" />
      )}
      <span className="font-mono">{displayName}</span>
      {commitCount > 0 && (
        <>
          <span className="mx-1">·</span>
          <History className="size-3" />
          <span>{commitCount}</span>
        </>
      )}
    </div>
  );
}
