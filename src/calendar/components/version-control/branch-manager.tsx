"use client";

import { useState, useEffect, useCallback } from "react";
import {
  GitBranch,
  Plus,
  Trash2,
  Bot,
  Home,
  MoreVertical,
  Check,
  AlertCircle,
  RefreshCw,
  GitMerge,
  Eye,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useLegitContext } from "@legit-sdk/react";
import { useMultiAgentCoordination } from "@/legit-webmcp";
import { useAgentPreview } from "@/calendar/contexts/agent-preview-context";
import { MergeRequestDialog } from "./merge-request";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface BranchInfo {
  name: string;
  isAgent: boolean;
  agentId?: string;
  modelName?: string;
  isCurrent: boolean;
  hasChanges?: boolean;
  lastActivity?: Date;
}

/**
 * Branch Manager Component
 * Full-featured branch management with create, delete, switch, and merge capabilities
 */
export function BranchManager() {
  const { legitFs, head } = useLegitContext();
  const {
    activeSessions,
    currentBranch,
    switchToAgentBranch,
    switchToMain,
    defaultBranch,
    createAgentSession,
    getAgentPreview,
  } = useMultiAgentCoordination();
  const { startPreview, isPreviewMode } = useAgentPreview();

  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteConfirmBranch, setDeleteConfirmBranch] = useState<string | null>(null);

  // Load all branches
  const loadBranches = useCallback(async () => {
    if (!legitFs) return;
    setIsLoading(true);

    try {
      const branchesDir = "/.legit/branches";
      const entries = await legitFs.promises.readdir(branchesDir);
      const current = await legitFs.getCurrentBranch();

      const branchList: BranchInfo[] = [];

      for (const entry of entries) {
        const branchName = String(entry);
        const isAgent = branchName.startsWith("agent-");

        let agentId: string | undefined;
        let modelName: string | undefined;
        let lastActivity: Date | undefined;

        if (isAgent) {
          const parts = branchName.slice(6).split("-");
          modelName = parts[0];
          agentId = parts.slice(1).join("-");

          // Find session for last activity
          const session = activeSessions.find((s) => s.branch === branchName);
          if (session) {
            lastActivity = session.lastActivity;
          }
        }

        // Check for changes (only for agent branches)
        let hasChanges = false;
        if (isAgent) {
          const preview = await getAgentPreview(branchName);
          hasChanges = preview?.hasChanges || false;
        }

        branchList.push({
          name: branchName,
          isAgent,
          agentId,
          modelName,
          isCurrent: branchName === current,
          hasChanges,
          lastActivity,
        });
      }

      // Sort: main first, then agent branches sorted by activity
      branchList.sort((a, b) => {
        if (a.name === "main" || a.name === defaultBranch) return -1;
        if (b.name === "main" || b.name === defaultBranch) return 1;
        if (a.hasChanges && !b.hasChanges) return -1;
        if (!a.hasChanges && b.hasChanges) return 1;
        if (a.lastActivity && b.lastActivity) {
          return b.lastActivity.getTime() - a.lastActivity.getTime();
        }
        return a.name.localeCompare(b.name);
      });

      setBranches(branchList);
    } catch (error) {
      console.error("Failed to load branches:", error);
    } finally {
      setIsLoading(false);
    }
  }, [legitFs, defaultBranch, activeSessions, getAgentPreview]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches, head]);

  // Create new branch
  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return;
    setIsCreating(true);

    try {
      // Create as an agent session with a custom name
      await createAgentSession(newBranchName.trim(), "user");
      setNewBranchName("");
      setCreateDialogOpen(false);
      await loadBranches();
    } catch (error) {
      console.error("Failed to create branch:", error);
    } finally {
      setIsCreating(false);
    }
  };

  // Delete branch
  const handleDeleteBranch = async (branchName: string) => {
    if (!legitFs || branchName === "main" || branchName === defaultBranch) return;

    try {
      // Delete the branch directory
      const branchPath = `/.legit/branches/${branchName}`;

      // Recursively delete all files in the branch
      const deleteRecursive = async (path: string) => {
        const entries = await legitFs.promises.readdir(path);
        for (const entry of entries) {
          const fullPath = `${path}/${entry}`;
          const stat = await legitFs.promises.stat(fullPath);
          if (stat.isDirectory()) {
            await deleteRecursive(fullPath);
            await legitFs.promises.rmdir(fullPath);
          } else {
            await legitFs.promises.unlink(fullPath);
          }
        }
      };

      await deleteRecursive(branchPath);
      await legitFs.promises.rmdir(branchPath);

      // If we were on this branch, switch to main
      const current = await legitFs.getCurrentBranch();
      if (current === branchName) {
        await switchToMain();
      }

      setDeleteConfirmBranch(null);
      await loadBranches();
    } catch (error) {
      console.error("Failed to delete branch:", error);
    }
  };

  // Switch branch
  const handleSwitchBranch = async (branchName: string) => {
    try {
      if (branchName === "main" || branchName === defaultBranch) {
        await switchToMain();
      } else {
        await switchToAgentBranch(branchName);
      }
      await loadBranches();
    } catch (error) {
      console.error("Failed to switch branch:", error);
    }
  };

  // Preview branch changes
  const handlePreviewBranch = async (branchName: string) => {
    try {
      await startPreview(branchName);
    } catch (error) {
      console.error("Failed to start preview:", error);
    }
  };

  const mainBranch = branches.find(
    (b) => b.name === "main" || b.name === defaultBranch
  );
  const agentBranches = branches.filter(
    (b) => b.name !== "main" && b.name !== defaultBranch
  );

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <GitBranch className="size-4 text-muted-foreground" />
          <span className="font-medium">Branches</span>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
            {branches.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadBranches}
            disabled={isLoading}
            className="size-8 p-0"
          >
            <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="size-8 p-0">
                <Plus className="size-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Branch</DialogTitle>
                <DialogDescription>
                  Create a new branch to work on changes independently.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="branch-name">Branch Name</Label>
                <Input
                  id="branch-name"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="feature-name"
                  className="mt-2"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Branch will be created from the current state of main.
                </p>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateBranch}
                  disabled={isCreating || !newBranchName.trim()}
                >
                  {isCreating ? "Creating..." : "Create Branch"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Branch list */}
      <ScrollArea className="max-h-96">
        <div className="p-2">
          {/* Main branch */}
          {mainBranch && (
            <div className="mb-2">
              <p className="mb-1 px-2 text-xs font-medium text-muted-foreground uppercase">
                Default
              </p>
              <BranchItem
                branch={mainBranch}
                onSwitch={handleSwitchBranch}
                onDelete={undefined}
                onPreview={undefined}
              />
            </div>
          )}

          {/* Agent branches */}
          {agentBranches.length > 0 && (
            <div>
              <p className="mb-1 px-2 text-xs font-medium text-muted-foreground uppercase">
                Agent Branches ({agentBranches.length})
              </p>
              <div className="space-y-1">
                {agentBranches.map((branch) => (
                  <BranchItem
                    key={branch.name}
                    branch={branch}
                    onSwitch={handleSwitchBranch}
                    onDelete={() => setDeleteConfirmBranch(branch.name)}
                    onPreview={
                      branch.hasChanges
                        ? () => handlePreviewBranch(branch.name)
                        : undefined
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {agentBranches.length === 0 && (
            <p className="py-4 text-center text-xs text-muted-foreground">
              No agent branches yet
            </p>
          )}
        </div>
      </ScrollArea>

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteConfirmBranch}
        onOpenChange={() => setDeleteConfirmBranch(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="size-5 text-red-500" />
              Delete Branch
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the branch{" "}
              <code className="rounded bg-muted px-1">
                {deleteConfirmBranch}
              </code>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmBranch(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteConfirmBranch) {
                  handleDeleteBranch(deleteConfirmBranch);
                }
              }}
            >
              Delete Branch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Single branch item
 */
function BranchItem({
  branch,
  onSwitch,
  onDelete,
  onPreview,
}: {
  branch: BranchInfo;
  onSwitch: (name: string) => void;
  onDelete?: () => void;
  onPreview?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className={cn(
        "group flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors",
        branch.isCurrent
          ? "bg-secondary"
          : "hover:bg-accent"
      )}
    >
      {/* Icon */}
      {branch.isAgent ? (
        <Bot className="size-4 shrink-0 text-muted-foreground" />
      ) : (
        <Home className="size-4 shrink-0 text-muted-foreground" />
      )}

      {/* Branch info */}
      <button
        onClick={() => onSwitch(branch.name)}
        disabled={branch.isCurrent}
        className="min-w-0 flex-1 text-left"
      >
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "truncate font-mono text-sm",
              branch.isCurrent
                ? "font-medium text-secondary-foreground"
                : "text-foreground"
            )}
          >
            {branch.isAgent ? branch.agentId : branch.name}
          </span>
          {branch.isCurrent && (
            <Check className="size-3.5 shrink-0 text-green-600" />
          )}
          {branch.hasChanges && !branch.isCurrent && (
            <span className="shrink-0 rounded bg-amber-100 px-1 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
              Changes
            </span>
          )}
        </div>
        {branch.isAgent && branch.modelName && (
          <p className="truncate text-xs text-muted-foreground">
            {branch.modelName}
            {branch.lastActivity && (
              <span className="ml-1 text-muted-foreground/70">
                · {formatDistanceToNow(branch.lastActivity, { addSuffix: true })}
              </span>
            )}
          </p>
        )}
      </button>

      {/* Actions */}
      {branch.isAgent && (
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="size-7 shrink-0 p-0 opacity-0 group-hover:opacity-100"
            >
              <MoreVertical className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-1" align="end">
            {onPreview && (
              <button
                onClick={() => {
                  onPreview();
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
              >
                <Eye className="size-4" />
                Preview Changes
              </button>
            )}
            <MergeRequestDialog
              sourceBranch={branch.name}
              trigger={
                <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
                  <GitMerge className="size-4" />
                  Create Merge Request
                </button>
              }
              onMergeComplete={() => setMenuOpen(false)}
            />
            {onDelete && (
              <>
                <div className="my-1 h-px bg-border" />
                <button
                  onClick={() => {
                    onDelete();
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
                >
                  <Trash2 className="size-4" />
                  Delete Branch
                </button>
              </>
            )}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
