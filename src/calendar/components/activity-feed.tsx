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
        !entry.status && "border-gray-200 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-900/50"
      )}
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-purple-100 text-lg dark:bg-purple-900/50">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {label}
          </span>
          {entry.agentName && (
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
              <Bot className="size-3" />
              {entry.agentName}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
          {entry.description}
        </p>
        {entry.toolName && (
          <p className="mt-1 font-mono text-xs text-gray-500 dark:text-gray-500">
            {entry.toolName}
          </p>
        )}
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
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
    <div className="fixed right-4 top-20 z-50 w-96 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-purple-600" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            Agent Activity
          </h3>
          {activities.length > 0 && (
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
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
              className="size-8 p-0 text-gray-500 hover:text-gray-700"
            >
              <Trash2 className="size-4" />
              <span className="sr-only">Clear all</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            className="size-8 p-0 text-gray-500 hover:text-gray-700"
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
            <div className="py-8 text-center text-sm text-gray-500">
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
        isOpen && "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
        hasRecent && "border-purple-300 dark:border-purple-700"
      )}
    >
      <Activity className={cn("size-4", hasRecent && "animate-pulse")} />
      <span className="hidden sm:inline">Activity</span>
      {activities.length > 0 && (
        <span className={cn(
          "absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full text-xs font-bold",
          hasRecent
            ? "animate-pulse bg-purple-600 text-white"
            : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
        )}>
          {activities.length > 9 ? "9+" : activities.length}
        </span>
      )}
    </Button>
  );
}
