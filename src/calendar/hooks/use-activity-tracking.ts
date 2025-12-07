"use client";

import { useCallback } from "react";
import { useActivityFeed, type ActivityType } from "@/calendar/contexts/activity-feed-context";
import { toast } from "@/hooks/use-toast";

/**
 * Hook to track agent activities.
 * Use this to emit events when agents perform actions.
 */
export function useActivityTracking() {
  const { addActivity } = useActivityFeed();

  const trackToolCall = useCallback(
    (toolName: string, agentId?: string) => {
      addActivity({
        type: "tool_call",
        toolName,
        agentId,
        agentName: agentId || "AI Agent",
        description: `Calling ${toolName}...`,
        status: "pending",
      });
    },
    [addActivity]
  );

  const trackToolResult = useCallback(
    (toolName: string, success: boolean, message: string, agentId?: string) => {
      addActivity({
        type: "tool_result",
        toolName,
        agentId,
        agentName: agentId || "AI Agent",
        description: message,
        status: success ? "success" : "error",
      });
    },
    [addActivity]
  );

  const trackBranchCreated = useCallback(
    (branchName: string, agentId: string) => {
      addActivity({
        type: "branch_created",
        agentId,
        agentName: agentId,
        description: `Created sandbox branch: ${branchName}`,
        status: "success",
      });
      toast({
        title: "Agent Sandbox Created",
        description: `${agentId} is now working in an isolated branch`,
        variant: "default",
      });
    },
    [addActivity]
  );

  const trackBranchSwitched = useCallback(
    (branchName: string) => {
      addActivity({
        type: "branch_switched",
        description: `Switched to branch: ${branchName}`,
      });
    },
    [addActivity]
  );

  const trackChangesCommitted = useCallback(
    (agentId: string, summary: { added: number; modified: number; removed: number }) => {
      const parts = [];
      if (summary.added > 0) parts.push(`${summary.added} added`);
      if (summary.modified > 0) parts.push(`${summary.modified} modified`);
      if (summary.removed > 0) parts.push(`${summary.removed} removed`);

      addActivity({
        type: "changes_committed",
        agentId,
        agentName: agentId,
        description: `Committed changes: ${parts.join(", ")}`,
        status: "success",
      });
      toast({
        title: "Changes Committed",
        description: `${agentId}: ${parts.join(", ")}`,
        variant: "success",
      });
    },
    [addActivity]
  );

  const trackPreviewStarted = useCallback(
    (agentId: string) => {
      addActivity({
        type: "changes_previewed",
        agentId,
        agentName: agentId,
        description: `Started previewing changes from ${agentId}`,
      });
    },
    [addActivity]
  );

  const trackChangesAccepted = useCallback(
    (agentId: string) => {
      addActivity({
        type: "changes_accepted",
        agentId,
        agentName: agentId,
        description: `Accepted all changes from ${agentId}`,
        status: "success",
      });
      toast({
        title: "Changes Accepted",
        description: `All changes from ${agentId} have been merged`,
        variant: "success",
      });
    },
    [addActivity]
  );

  const trackChangesRejected = useCallback(
    (agentId: string) => {
      addActivity({
        type: "changes_rejected",
        agentId,
        agentName: agentId,
        description: `Rejected changes from ${agentId}`,
      });
      toast({
        title: "Changes Rejected",
        description: `Changes from ${agentId} have been discarded`,
        variant: "warning",
      });
    },
    [addActivity]
  );

  const trackEventCreated = useCallback(
    (eventTitle: string, agentId?: string) => {
      addActivity({
        type: "event_created",
        agentId,
        agentName: agentId || "AI Agent",
        description: `Created event: "${eventTitle}"`,
        status: "success",
      });
      toast({
        title: "Event Created",
        description: `"${eventTitle}" has been scheduled`,
        variant: "success",
      });
    },
    [addActivity]
  );

  const trackEventUpdated = useCallback(
    (eventTitle: string, agentId?: string) => {
      addActivity({
        type: "event_updated",
        agentId,
        agentName: agentId || "AI Agent",
        description: `Updated event: "${eventTitle}"`,
        status: "success",
      });
      toast({
        title: "Event Updated",
        description: `"${eventTitle}" has been modified`,
      });
    },
    [addActivity]
  );

  const trackEventDeleted = useCallback(
    (eventTitle: string, agentId?: string) => {
      addActivity({
        type: "event_deleted",
        agentId,
        agentName: agentId || "AI Agent",
        description: `Deleted event: "${eventTitle}"`,
        status: "success",
      });
      toast({
        title: "Event Deleted",
        description: `"${eventTitle}" has been removed`,
        variant: "destructive",
      });
    },
    [addActivity]
  );

  const trackCustomActivity = useCallback(
    (type: ActivityType, description: string, details?: Record<string, unknown>) => {
      addActivity({
        type,
        description,
        details,
      });
    },
    [addActivity]
  );

  return {
    trackToolCall,
    trackToolResult,
    trackBranchCreated,
    trackBranchSwitched,
    trackChangesCommitted,
    trackPreviewStarted,
    trackChangesAccepted,
    trackChangesRejected,
    trackEventCreated,
    trackEventUpdated,
    trackEventDeleted,
    trackCustomActivity,
  };
}
