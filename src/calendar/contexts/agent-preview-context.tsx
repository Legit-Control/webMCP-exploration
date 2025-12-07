"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useLegitContext } from "@legit-sdk/react";
import type { IEvent } from "@/calendar/interfaces";
import { CALENDAR_PATHS } from "@/legit-webmcp/types";

/**
 * Pending changes from an agent branch compared to main
 */
export interface PendingChanges {
  added: IEvent[];
  modified: { before: IEvent; after: IEvent }[];
  removed: IEvent[];
}

/**
 * Agent preview context state
 */
interface AgentPreviewState {
  /** Whether preview mode is active */
  isPreviewMode: boolean;
  /** ID of the agent being previewed */
  previewAgentId: string | null;
  /** Branch name of the agent being previewed */
  previewBranch: string | null;
  /** Pending changes from the agent */
  pendingChanges: PendingChanges;
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: string | null;
}

/**
 * Agent preview context actions
 */
interface AgentPreviewActions {
  /** Start previewing an agent's changes. Returns the computed pending changes. */
  startPreview: (agentId: string) => Promise<PendingChanges>;
  /** Stop previewing and return to main branch view */
  stopPreview: () => void;
  /** Accept all pending changes (merge to main) */
  acceptAllChanges: () => Promise<void>;
  /** Reject all pending changes (discard agent branch) */
  rejectAllChanges: () => Promise<void>;
  /** Accept a single change by event ID */
  acceptChange: (eventId: number) => Promise<void>;
  /** Reject a single change by event ID */
  rejectChange: (eventId: number) => Promise<void>;
  /** Refresh the pending changes diff */
  refreshPreview: () => Promise<void>;
}

type AgentPreviewContextValue = AgentPreviewState & AgentPreviewActions;

const AgentPreviewContext = createContext<AgentPreviewContextValue | null>(null);

interface AgentPreviewProviderProps {
  children: React.ReactNode;
}

/**
 * Provider for agent preview functionality.
 * Allows viewing and approving/rejecting changes from agent branches.
 */
export function AgentPreviewProvider({ children }: AgentPreviewProviderProps) {
  const { legitFs } = useLegitContext();

  const [state, setState] = useState<AgentPreviewState>({
    isPreviewMode: false,
    previewAgentId: null,
    previewBranch: null,
    pendingChanges: { added: [], modified: [], removed: [] },
    loading: false,
    error: null,
  });

  /**
   * Read events from a specific branch
   */
  const readBranchEvents = useCallback(
    async (branch: string): Promise<IEvent[]> => {
      if (!legitFs) return [];
      try {
        const path = `/.legit/branches/${branch}${CALENDAR_PATHS.EVENTS}`;
        const content = await legitFs.promises.readFile(path, "utf8");
        return JSON.parse(content as string);
      } catch {
        return [];
      }
    },
    [legitFs]
  );

  /**
   * Compute diff between main branch and agent branch
   */
  const computeDiff = useCallback(
    async (agentBranch: string): Promise<PendingChanges> => {
      // Try "main" first, then "anonymous" for backwards compatibility
      let mainEvents = await readBranchEvents("main");
      if (mainEvents.length === 0) {
        mainEvents = await readBranchEvents("anonymous");
      }
      const agentEvents = await readBranchEvents(agentBranch);

      const mainIds = new Set(mainEvents.map((e) => e.id));
      const agentIds = new Set(agentEvents.map((e) => e.id));

      // Added: in agent but not in main
      const added = agentEvents.filter((e) => !mainIds.has(e.id));

      // Removed: in main but not in agent
      const removed = mainEvents.filter((e) => !agentIds.has(e.id));

      // Modified: in both but different
      const modified: { before: IEvent; after: IEvent }[] = [];
      for (const agentEvent of agentEvents) {
        if (mainIds.has(agentEvent.id)) {
          const mainEvent = mainEvents.find((e) => e.id === agentEvent.id)!;
          if (JSON.stringify(mainEvent) !== JSON.stringify(agentEvent)) {
            modified.push({ before: mainEvent, after: agentEvent });
          }
        }
      }

      return { added, modified, removed };
    },
    [readBranchEvents]
  );

  /**
   * Find the actual branch name for an agent by searching for matching branches
   */
  const findAgentBranch = useCallback(
    async (agentId: string): Promise<string | null> => {
      if (!legitFs) return null;

      // If it's already a full branch name, use it directly
      if (agentId.startsWith("agent-")) {
        return agentId;
      }

      try {
        // List all branches and find one that ends with the agentId
        const branchesDir = "/.legit/branches";
        const entries = await legitFs.promises.readdir(branchesDir);

        // Look for a branch matching pattern agent-*-{agentId}
        for (const entry of entries) {
          const branchName = String(entry);
          if (branchName.startsWith("agent-") && branchName.endsWith(`-${agentId}`)) {
            return branchName;
          }
        }

        // Fallback: try common patterns
        const fallbackPatterns = [
          `agent-claude-${agentId}`,
          `agent-opus-${agentId}`,
          `agent-gpt4-${agentId}`,
          `agent-gemini-${agentId}`,
        ];

        for (const pattern of fallbackPatterns) {
          try {
            const path = `/.legit/branches/${pattern}${CALENDAR_PATHS.EVENTS}`;
            await legitFs.promises.readFile(path, "utf8");
            return pattern; // Branch exists
          } catch {
            // Branch doesn't exist, try next
          }
        }

        return null;
      } catch {
        return null;
      }
    },
    [legitFs]
  );

  /**
   * Start previewing an agent's changes.
   * Returns the computed pending changes so callers can use them immediately
   * without waiting for React state to update.
   */
  const startPreview = useCallback(
    async (agentId: string): Promise<PendingChanges> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        // Find the actual branch name
        const agentBranch = await findAgentBranch(agentId);

        if (!agentBranch) {
          throw new Error(`Could not find branch for agent "${agentId}"`);
        }

        const pendingChanges = await computeDiff(agentBranch);

        setState({
          isPreviewMode: true,
          previewAgentId: agentId,
          previewBranch: agentBranch,
          pendingChanges,
          loading: false,
          error: null,
        });

        // Return the computed changes so callers can use them immediately
        return pendingChanges;
      } catch (err) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : "Failed to load preview",
        }));
        // Re-throw so callers can handle the error
        throw err;
      }
    },
    [computeDiff, findAgentBranch]
  );

  /**
   * Stop previewing
   */
  const stopPreview = useCallback(() => {
    setState({
      isPreviewMode: false,
      previewAgentId: null,
      previewBranch: null,
      pendingChanges: { added: [], modified: [], removed: [] },
      loading: false,
      error: null,
    });
  }, []);

  /**
   * Accept all changes (merge agent branch to main)
   */
  const acceptAllChanges = useCallback(async () => {
    if (!legitFs || !state.previewBranch) return;

    setState((prev) => ({ ...prev, loading: true }));

    try {
      // Read agent events and write to main
      const agentEvents = await readBranchEvents(state.previewBranch);
      const mainPath = `/.legit/branches/main${CALENDAR_PATHS.EVENTS}`;
      await legitFs.promises.writeFile(
        mainPath,
        JSON.stringify(agentEvents, null, 2),
        "utf8"
      );

      // Exit preview mode
      stopPreview();
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to merge changes",
      }));
    }
  }, [legitFs, state.previewBranch, readBranchEvents, stopPreview]);

  /**
   * Reject all changes (just exit preview, agent branch remains)
   */
  const rejectAllChanges = useCallback(async () => {
    // For now, just stop preview. Could optionally delete agent branch.
    stopPreview();
  }, [stopPreview]);

  /**
   * Accept a single change
   */
  const acceptChange = useCallback(
    async (eventId: number) => {
      if (!legitFs || !state.previewBranch) return;

      setState((prev) => ({ ...prev, loading: true }));

      try {
        const mainEvents = await readBranchEvents("main");
        const { added, modified, removed } = state.pendingChanges;

        let newMainEvents = [...mainEvents];

        // Check if this is an added event
        const addedEvent = added.find((e) => e.id === eventId);
        if (addedEvent) {
          newMainEvents.push(addedEvent);
        }

        // Check if this is a modified event
        const modifiedEntry = modified.find((m) => m.after.id === eventId);
        if (modifiedEntry) {
          newMainEvents = newMainEvents.map((e) =>
            e.id === eventId ? modifiedEntry.after : e
          );
        }

        // Check if this is a removed event
        const removedEvent = removed.find((e) => e.id === eventId);
        if (removedEvent) {
          newMainEvents = newMainEvents.filter((e) => e.id !== eventId);
        }

        // Write to main
        const mainPath = `/.legit/branches/main${CALENDAR_PATHS.EVENTS}`;
        await legitFs.promises.writeFile(
          mainPath,
          JSON.stringify(newMainEvents, null, 2),
          "utf8"
        );

        // Refresh the diff
        const newPendingChanges = await computeDiff(state.previewBranch);
        setState((prev) => ({
          ...prev,
          pendingChanges: newPendingChanges,
          loading: false,
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : "Failed to accept change",
        }));
      }
    },
    [legitFs, state.previewBranch, state.pendingChanges, readBranchEvents, computeDiff]
  );

  /**
   * Reject a single change (remove from pending, keep main as-is)
   */
  const rejectChange = useCallback(
    async (eventId: number) => {
      if (!legitFs || !state.previewBranch) return;

      setState((prev) => ({ ...prev, loading: true }));

      try {
        // Update agent branch to match main for this event
        const mainEvents = await readBranchEvents("main");
        const agentEvents = await readBranchEvents(state.previewBranch);
        const { added, modified, removed } = state.pendingChanges;

        let newAgentEvents = [...agentEvents];

        // If rejecting an added event, remove it from agent branch
        if (added.find((e) => e.id === eventId)) {
          newAgentEvents = newAgentEvents.filter((e) => e.id !== eventId);
        }

        // If rejecting a modified event, revert to main version
        const modifiedEntry = modified.find((m) => m.after.id === eventId);
        if (modifiedEntry) {
          newAgentEvents = newAgentEvents.map((e) =>
            e.id === eventId ? modifiedEntry.before : e
          );
        }

        // If rejecting a removal, add the event back to agent branch
        const removedEvent = removed.find((e) => e.id === eventId);
        if (removedEvent) {
          const mainEvent = mainEvents.find((e) => e.id === eventId);
          if (mainEvent) {
            newAgentEvents.push(mainEvent);
          }
        }

        // Write to agent branch
        const agentPath = `/.legit/branches/${state.previewBranch}${CALENDAR_PATHS.EVENTS}`;
        await legitFs.promises.writeFile(
          agentPath,
          JSON.stringify(newAgentEvents, null, 2),
          "utf8"
        );

        // Refresh the diff
        const newPendingChanges = await computeDiff(state.previewBranch);
        setState((prev) => ({
          ...prev,
          pendingChanges: newPendingChanges,
          loading: false,
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : "Failed to reject change",
        }));
      }
    },
    [legitFs, state.previewBranch, state.pendingChanges, readBranchEvents, computeDiff]
  );

  /**
   * Refresh the preview diff
   */
  const refreshPreview = useCallback(async () => {
    if (!state.previewBranch) return;
    setState((prev) => ({ ...prev, loading: true }));
    try {
      const pendingChanges = await computeDiff(state.previewBranch);
      setState((prev) => ({ ...prev, pendingChanges, loading: false }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to refresh preview",
      }));
    }
  }, [state.previewBranch, computeDiff]);

  const contextValue = useMemo<AgentPreviewContextValue>(
    () => ({
      ...state,
      startPreview,
      stopPreview,
      acceptAllChanges,
      rejectAllChanges,
      acceptChange,
      rejectChange,
      refreshPreview,
    }),
    [
      state,
      startPreview,
      stopPreview,
      acceptAllChanges,
      rejectAllChanges,
      acceptChange,
      rejectChange,
      refreshPreview,
    ]
  );

  return (
    <AgentPreviewContext.Provider value={contextValue}>
      {children}
    </AgentPreviewContext.Provider>
  );
}

/**
 * Hook to access agent preview functionality
 */
export function useAgentPreview(): AgentPreviewContextValue {
  const context = useContext(AgentPreviewContext);
  if (!context) {
    throw new Error(
      "useAgentPreview must be used within an AgentPreviewProvider"
    );
  }
  return context;
}
