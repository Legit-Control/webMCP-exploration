"use client";

import { Bot, X, Activity, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  useActivityFeed,
  getActivityIcon,
  getActivityLabel,
  type ActivityEntry,
} from "@/calendar/contexts/activity-feed-context";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

/**
 * Single activity entry component
 */
function ActivityItem({ entry }: { entry: ActivityEntry }) {
  const icon = getActivityIcon(entry.type);
  const label = getActivityLabel(entry.type);

  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border p-3 transition-colors",
        entry.status === "pending" && "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30",
        entry.status === "success" && "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/30",
        entry.status === "error" && "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/30",
        !entry.status && "border-border bg-muted/50"
      )}
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-lg">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {label}
          </span>
          {entry.agentName && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
              <Bot className="size-3" />
              {entry.agentName}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {entry.description}
        </p>
        {entry.toolName && (
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {entry.toolName}
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          {formatDistanceToNow(entry.timestamp, { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

/**
 * Activity feed panel component
 */
export function ActivityFeed() {
  const { activities, isOpen, setOpen, clearActivities } = useActivityFeed();

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed right-4 top-20 z-50 w-96 overflow-hidden rounded-lg border border-border bg-card shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-foreground" />
          <h3 className="font-semibold text-foreground">
            Agent Activity
          </h3>
          {activities.length > 0 && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
              {activities.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {activities.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearActivities}
              className="size-8 p-0 text-muted-foreground hover:text-foreground"
            >
              <Trash2 className="size-4" />
              <span className="sr-only">Clear all</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            className="size-8 p-0 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>
      </div>

      {/* Activity list */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-2 p-4">
          {activities.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <Bot className="mx-auto mb-2 size-8 opacity-50" />
              <p>No agent activity yet</p>
              <p className="mt-1 text-xs">
                Activity will appear here when agents interact with the calendar
              </p>
            </div>
          ) : (
            activities.map((entry) => (
              <ActivityItem key={entry.id} entry={entry} />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

/**
 * Button to toggle the activity feed
 */
export function ActivityFeedTrigger() {
  const { activities, isOpen, toggleOpen } = useActivityFeed();
  const hasRecent = activities.some(
    (a) => Date.now() - a.timestamp.getTime() < 5000
  );

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleOpen}
      className={cn(
        "relative gap-2",
        isOpen && "bg-secondary text-secondary-foreground",
        hasRecent && "border-primary"
      )}
    >
      <Activity className={cn("size-4", hasRecent && "animate-pulse")} />
      <span className="hidden sm:inline">Activity</span>
      {activities.length > 0 && (
        <span className={cn(
          "absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full text-xs font-bold",
          hasRecent
            ? "animate-pulse bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground"
        )}>
          {activities.length > 9 ? "9+" : activities.length}
        </span>
      )}
    </Button>
  );
}
