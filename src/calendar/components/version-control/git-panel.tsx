"use client";

import { useState } from "react";
import {
  GitBranch,
  GitCommit,
  GitMerge,
  GitCompare,
  X,
  ChevronDown,
  ChevronRight,
  Layers,
} from "lucide-react";
import { BranchManager } from "./branch-manager";
import { CommitHistory, CompactCommitHistory } from "./commit-history";
import { PendingMergeRequests } from "./merge-request";
import { CurrentBranchDiff } from "./diff-viewer";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type PanelSection = "branches" | "history" | "merges" | "diff";

interface GitPanelProps {
  /** Whether the panel is open */
  isOpen: boolean;
  /** Callback to close the panel */
  onClose: () => void;
  /** Initial section to show */
  initialSection?: PanelSection;
}

/**
 * Unified Git Panel
 * A comprehensive sidebar for all version control features
 */
export function GitPanel({ isOpen, onClose, initialSection = "branches" }: GitPanelProps) {
  const [_activeSection, _setActiveSection] = useState<PanelSection>(initialSection);
  const [expandedSections, setExpandedSections] = useState<Set<PanelSection>>(
    () => new Set<PanelSection>(["branches", "merges"])
  );

  const toggleSection = (section: PanelSection) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const sections = [
    {
      id: "branches" as const,
      label: "Branches",
      icon: GitBranch,
      component: BranchManager,
    },
    {
      id: "history" as const,
      label: "History",
      icon: GitCommit,
      component: () => <CommitHistory maxHeight="300px" />,
    },
    {
      id: "merges" as const,
      label: "Merge Requests",
      icon: GitMerge,
      component: PendingMergeRequests,
    },
    {
      id: "diff" as const,
      label: "Changes",
      icon: GitCompare,
      component: CurrentBranchDiff,
    },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 z-50 flex h-full w-96 flex-col border-l border-border bg-background shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Layers className="size-5 text-foreground" />
          <h2 className="font-semibold">Version Control</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="size-8 p-0">
          <X className="size-4" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="divide-y divide-border">
          {sections.map((section) => {
            const Icon = section.icon;
            const Component = section.component;
            const isExpanded = expandedSections.has(section.id);

            return (
              <div key={section.id}>
                <button
                  onClick={() => toggleSection(section.id)}
                  className="flex w-full items-center justify-between px-4 py-3 hover:bg-accent"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{section.label}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-4 text-muted-foreground" />
                  )}
                </button>
                {isExpanded && (
                  <div className="max-h-80 overflow-auto border-t border-border bg-muted/30">
                    <Component />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-border bg-muted/50 px-4 py-3">
        <p className="text-center text-xs text-muted-foreground">
          Powered by Legit SDK + WebMCP
        </p>
      </div>
    </div>
  );
}

/**
 * Trigger button to open the Git panel
 */
export function GitPanelTrigger({
  onClick,
  isOpen,
}: {
  onClick: () => void;
  isOpen: boolean;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className={cn(
        "gap-2",
        isOpen && "bg-secondary text-secondary-foreground"
      )}
    >
      <Layers className="size-4" />
      <span className="hidden sm:inline">Version Control</span>
    </Button>
  );
}

/**
 * Compact collapsible panel for inline use
 */
export function CollapsibleGitSection({
  title,
  icon: Icon,
  children,
  defaultExpanded = false,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-3 hover:bg-accent"
      >
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">{title}</span>
        </div>
        {isExpanded ? (
          <ChevronDown className="size-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 text-muted-foreground" />
        )}
      </button>
      {isExpanded && <div className="border-t border-border">{children}</div>}
    </div>
  );
}

/**
 * Quick actions panel - shows at-a-glance info and common actions
 */
export function QuickActionsPanel() {
  return (
    <div className="space-y-4">
      {/* Branches */}
      <CollapsibleGitSection title="Branches" icon={GitBranch} defaultExpanded>
        <BranchManager />
      </CollapsibleGitSection>

      {/* Merge Requests */}
      <CollapsibleGitSection title="Pending Merges" icon={GitMerge}>
        <div className="p-4">
          <PendingMergeRequests />
        </div>
      </CollapsibleGitSection>

      {/* Recent History */}
      <CollapsibleGitSection title="Recent History" icon={GitCommit}>
        <div className="p-4">
          <CompactCommitHistory limit={5} />
        </div>
      </CollapsibleGitSection>
    </div>
  );
}
