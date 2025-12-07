"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";

/**
 * Types of activities that can be tracked
 */
export type ActivityType =
  | "tool_call"
  | "tool_result"
  | "branch_created"
  | "branch_switched"
  | "changes_committed"
  | "changes_previewed"
  | "changes_accepted"
  | "changes_rejected"
  | "event_created"
  | "event_updated"
  | "event_deleted";

/**
 * A single activity entry
 */
export interface ActivityEntry {
  id: string;
  type: ActivityType;
  timestamp: Date;
  agentId?: string;
  agentName?: string;
  toolName?: string;
  description: string;
  details?: Record<string, unknown>;
  status?: "pending" | "success" | "error";
}

/**
 * Activity feed context state
 */
interface ActivityFeedState {
  activities: ActivityEntry[];
  isOpen: boolean;
}

/**
 * Activity feed context actions
 */
interface ActivityFeedActions {
  addActivity: (entry: Omit<ActivityEntry, "id" | "timestamp">) => void;
  clearActivities: () => void;
  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
}

type ActivityFeedContextValue = ActivityFeedState & ActivityFeedActions;

const ActivityFeedContext = createContext<ActivityFeedContextValue | null>(null);

interface ActivityFeedProviderProps {
  children: React.ReactNode;
  maxEntries?: number;
}

/**
 * Provider for the activity feed.
 * Tracks agent actions in real-time for transparency.
 */
export function ActivityFeedProvider({
  children,
  maxEntries = 50,
}: ActivityFeedProviderProps) {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const addActivity = useCallback(
    (entry: Omit<ActivityEntry, "id" | "timestamp">) => {
      const newEntry: ActivityEntry = {
        ...entry,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
      };

      setActivities((prev) => {
        const updated = [newEntry, ...prev];
        // Keep only the most recent entries
        return updated.slice(0, maxEntries);
      });
    },
    [maxEntries]
  );

  const clearActivities = useCallback(() => {
    setActivities([]);
  }, []);

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const setOpen = useCallback((open: boolean) => {
    setIsOpen(open);
  }, []);

  const contextValue = useMemo<ActivityFeedContextValue>(
    () => ({
      activities,
      isOpen,
      addActivity,
      clearActivities,
      toggleOpen,
      setOpen,
    }),
    [activities, isOpen, addActivity, clearActivities, toggleOpen, setOpen]
  );

  return (
    <ActivityFeedContext.Provider value={contextValue}>
      {children}
    </ActivityFeedContext.Provider>
  );
}

/**
 * Hook to access the activity feed
 */
export function useActivityFeed(): ActivityFeedContextValue {
  const context = useContext(ActivityFeedContext);
  if (!context) {
    throw new Error(
      "useActivityFeed must be used within an ActivityFeedProvider"
    );
  }
  return context;
}

/**
 * Helper to get a human-readable description for activity types
 */
export function getActivityIcon(type: ActivityType): string {
  switch (type) {
    case "tool_call":
      return "🔧";
    case "tool_result":
      return "✅";
    case "branch_created":
      return "🌿";
    case "branch_switched":
      return "🔀";
    case "changes_committed":
      return "💾";
    case "changes_previewed":
      return "👁️";
    case "changes_accepted":
      return "✅";
    case "changes_rejected":
      return "❌";
    case "event_created":
      return "📅";
    case "event_updated":
      return "✏️";
    case "event_deleted":
      return "🗑️";
    default:
      return "📌";
  }
}

/**
 * Helper to get activity type label
 */
export function getActivityLabel(type: ActivityType): string {
  switch (type) {
    case "tool_call":
      return "Tool Called";
    case "tool_result":
      return "Tool Result";
    case "branch_created":
      return "Branch Created";
    case "branch_switched":
      return "Branch Switched";
    case "changes_committed":
      return "Changes Committed";
    case "changes_previewed":
      return "Preview Started";
    case "changes_accepted":
      return "Changes Accepted";
    case "changes_rejected":
      return "Changes Rejected";
    case "event_created":
      return "Event Created";
    case "event_updated":
      return "Event Updated";
    case "event_deleted":
      return "Event Deleted";
    default:
      return "Activity";
  }
}
