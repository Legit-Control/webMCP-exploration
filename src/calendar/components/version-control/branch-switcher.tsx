"use client";

import { useState, useEffect, useCallback } from "react";
import {
  GitBranch,
  ChevronDown,
  Check,
  Plus,
  Bot,
  Home,
  RefreshCw,
} from "lucide-react";
import { useLegitContext } from "@legit-sdk/react/server";
import { useMultiAgentCoordination } from "@/legit-webmcp";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Branch {
  name: string;
  isAgent: boolean;
  agentId?: string;
  modelName?: string;
  isCurrent: boolean;
}

/**
 * Branch Switcher Component
 * Allows users to view and switch between Git-like branches
 */
export function BranchSwitcher() {
  const { legitFs, head } = useLegitContext();
  const {
    activeSessions,
    currentBranch,
    switchToAgentBranch,
    switchToMain,
    defaultBranch,
  } = useMultiAgentCoordination();

  const [isOpen, setIsOpen] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  // Load all available branches
  const loadBranches = useCallback(async () => {
    if (!legitFs) return;
    setIsLoading(true);

    try {
      const branchesDir = "/.legit/branches";
      const entries = await legitFs.promises.readdir(branchesDir);
      const current = await legitFs.getCurrentBranch();

      const branchList: Branch[] = [];

      for (const entry of entries) {
        const branchName = String(entry);

        // Check if it's an agent branch
        const isAgent = branchName.startsWith("agent-");
        let agentId: string | undefined;
        let modelName: string | undefined;

        if (isAgent) {
          // Parse agent-{model}-{agentId}
          const parts = branchName.slice(6).split("-"); // Remove "agent-"
          if (parts.length >= 2) {
            modelName = parts[0];
            agentId = parts.slice(1).join("-");
          }
        }

        branchList.push({
          name: branchName,
          isAgent,
          agentId,
          modelName,
          isCurrent: branchName === current,
        });
      }

      // Sort: main/default first, then agent branches
      branchList.sort((a, b) => {
        if (a.name === "main" || a.name === defaultBranch) return -1;
        if (b.name === "main" || b.name === defaultBranch) return 1;
        return a.name.localeCompare(b.name);
      });

      setBranches(branchList);
    } catch (error) {
      console.error("Failed to load branches:", error);
    } finally {
      setIsLoading(false);
    }
  }, [legitFs, defaultBranch]);

  // Load branches on mount and when head changes
  useEffect(() => {
    loadBranches();
  }, [loadBranches, head]);

  // Handle branch switch
  const handleSwitchBranch = async (branchName: string) => {
    setIsSwitching(true);
    try {
      if (branchName === "main" || branchName === defaultBranch) {
        await switchToMain();
      } else {
        await switchToAgentBranch(branchName);
      }
      await loadBranches();
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to switch branch:", error);
    } finally {
      setIsSwitching(false);
    }
  };

  const currentBranchInfo = branches.find((b) => b.isCurrent);
  const displayName = currentBranchInfo?.name || currentBranch || "main";

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-2 font-mono text-xs",
            currentBranchInfo?.isAgent && "bg-secondary"
          )}
          disabled={isSwitching}
        >
          {currentBranchInfo?.isAgent ? (
            <Bot className="size-3.5" />
          ) : (
            <GitBranch className="size-3.5" />
          )}
          <span className="max-w-[120px] truncate">{displayName}</span>
          <ChevronDown className="size-3 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-72 p-0" align="start">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">Switch Branch</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadBranches}
            disabled={isLoading}
            className="size-7 p-0"
          >
            <RefreshCw
              className={cn("size-3.5", isLoading && "animate-spin")}
            />
          </Button>
        </div>

        {/* Branch list */}
        <div className="max-h-64 overflow-y-auto p-1">
          {branches.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {isLoading ? "Loading branches..." : "No branches found"}
            </div>
          ) : (
            <div className="space-y-0.5">
              {branches.map((branch) => (
                <button
                  key={branch.name}
                  onClick={() => handleSwitchBranch(branch.name)}
                  disabled={branch.isCurrent || isSwitching}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                    branch.isCurrent
                      ? "bg-secondary text-secondary-foreground"
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
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-mono text-xs">
                        {branch.name}
                      </span>
                      {branch.isCurrent && (
                        <Check className="size-3.5 shrink-0 text-green-600" />
                      )}
                    </div>
                    {branch.isAgent && branch.agentId && (
                      <p className="truncate text-xs text-muted-foreground">
                        Agent: {branch.agentId}
                        {branch.modelName && ` (${branch.modelName})`}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer with active sessions */}
        {activeSessions.length > 0 && (
          <div className="border-t border-border bg-muted/50 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              {activeSessions.length} active agent session
              {activeSessions.length !== 1 && "s"}
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
