"use client";

import { useState } from "react";
import {
  History,
  Settings,
  ChevronDown,
  ChevronRight,
  Sliders,
  Clock,
  Palette,
  Sun,
  RotateCcw,
  GitCommit,
  User as UserIcon,
  ChevronLeft,
  Layers,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import type { HistoryItem } from "@legit-sdk/core";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { ChangeBadgeVariantInput } from "@/calendar/components/change-badge-variant-input";
import { ChangeVisibleHoursInput } from "@/calendar/components/change-visible-hours-input";
import { ChangeWorkingHoursInput } from "@/calendar/components/change-working-hours-input";

interface BottomPanelProps {
  history: HistoryItem[];
  onRollback: (commitOid: string) => Promise<void>;
}

/**
 * Integrated Bottom Panel
 * Combines Time Travel and Calendar Settings in a cohesive UI
 */
export function BottomPanel({ history, onRollback }: BottomPanelProps) {
  const [activeTab, setActiveTab] = useState<"history" | "settings" | null>(null);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {/* Tab bar */}
      <div className="flex border-b border-border bg-muted/50">
        <TabButton
          icon={History}
          label="Time Travel"
          badge={history.length > 1 ? `${history.length} commits` : undefined}
          isActive={activeTab === "history"}
          onClick={() => setActiveTab(activeTab === "history" ? null : "history")}
        />
        <TabButton
          icon={Settings}
          label="Calendar Settings"
          isActive={activeTab === "settings"}
          onClick={() => setActiveTab(activeTab === "settings" ? null : "settings")}
        />
        <div className="ml-auto flex items-center px-4">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Layers className="size-3" />
            Powered by Legit SDK
          </span>
        </div>
      </div>

      {/* Content */}
      {activeTab === "history" && (
        <TimeTravelContent history={history} onRollback={onRollback} />
      )}
      {activeTab === "settings" && <SettingsContent />}
    </div>
  );
}

function TabButton({
  icon: Icon,
  label,
  badge,
  isActive,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  badge?: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
        isActive
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className="size-4" />
      <span>{label}</span>
      {badge && (
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
          {badge}
        </span>
      )}
      {isActive ? (
        <ChevronDown className="size-4 text-muted-foreground" />
      ) : (
        <ChevronRight className="size-4 text-muted-foreground" />
      )}
    </button>
  );
}

/**
 * Time Travel content panel
 */
function TimeTravelContent({
  history,
  onRollback,
}: {
  history: HistoryItem[];
  onRollback: (commitOid: string) => Promise<void>;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isRollingBack, setIsRollingBack] = useState(false);

  // Reverse history so oldest is first (left) and newest is last (right)
  const reversedHistory = [...history].reverse();

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
    return (
      <div className="py-12 text-center">
        <History className="mx-auto mb-3 size-8 text-muted-foreground/50" />
        <p className="text-sm font-medium text-muted-foreground">
          No history yet
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Changes will appear here as you and AI agents modify the calendar
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Timeline slider */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Clock className="size-4 text-foreground" />
            Timeline Navigation
          </div>

          <div className="relative">
            {/* Track */}
            <div className="relative h-2 rounded-full bg-secondary">
              {/* Progress fill */}
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-primary"
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
                        ? "scale-150 border-primary bg-background"
                        : index < selectedIndex
                          ? "border-primary bg-primary"
                          : "border-muted-foreground/30 bg-muted-foreground/30"
                    )}
                    title={commit.message || `Commit ${commit.oid.slice(0, 7)}`}
                  />
                ))}
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="mt-3 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIndex(Math.max(0, selectedIndex - 1))}
                disabled={selectedIndex === 0}
                className="h-8 gap-1 px-2"
              >
                <ChevronLeft className="size-4" />
                Older
              </Button>

              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                {selectedIndex + 1} of {reversedHistory.length}
              </span>

              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setSelectedIndex(Math.min(reversedHistory.length - 1, selectedIndex + 1))
                }
                disabled={selectedIndex === reversedHistory.length - 1}
                className="h-8 gap-1 px-2"
              >
                Newer
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Selected commit details */}
        {selectedCommit && (
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <GitCommit className="size-4 shrink-0 text-foreground" />
                  <code className="text-xs text-muted-foreground">{selectedCommit.oid.slice(0, 7)}</code>
                  {isAtHead && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/50 dark:text-green-300">
                      HEAD
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {selectedCommit.message || "No message"}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <UserIcon className="size-3" />
                    {selectedCommit.author?.name || "Unknown"}
                  </span>
                  <span>
                    {format(new Date(selectedCommit.author.timestamp * 1000), "MMM d, yyyy h:mm a")}
                  </span>
                  <span className="text-muted-foreground/70">
                    (
                    {formatDistanceToNow(new Date(selectedCommit.author.timestamp * 1000), {
                      addSuffix: true,
                    })}
                    )
                  </span>
                </div>
              </div>

              {!isAtHead && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRollback}
                  disabled={isRollingBack}
                  className="shrink-0 gap-1 border-amber-300 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950"
                >
                  <RotateCcw className={cn("size-4", isRollingBack && "animate-spin")} />
                  Restore
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Help text */}
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Click any point on the timeline to preview, then &quot;Restore&quot; to revert to that state
      </p>
    </div>
  );
}

/**
 * Settings content panel
 */
function SettingsContent() {
  return (
    <div className="p-4">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Badge variant */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Palette className="size-4 text-foreground" />
            Event Badge Style
          </div>
          <ChangeBadgeVariantInput />
        </div>

        {/* Visible hours */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Clock className="size-4 text-foreground" />
            Visible Hours
          </div>
          <ChangeVisibleHoursInput />
        </div>

        {/* Working hours */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Sun className="size-4 text-foreground" />
            Working Hours
          </div>
          <ChangeWorkingHoursInput />
        </div>
      </div>
    </div>
  );
}
