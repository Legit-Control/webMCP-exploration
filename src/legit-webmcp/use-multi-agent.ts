"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useLegitContext } from "@legit-sdk/react";
import type { AgentSession, AgentPreview } from "@/legit-webmcp/types";
import { CALENDAR_PATHS } from "@/legit-webmcp/types";
import type { IEvent } from "@/calendar/interfaces";

// =============================================================================
// LocalStorage Keys
// =============================================================================

const STORAGE_KEYS = {
  SESSIONS: "legit-agent-sessions",
  DEFAULT_BRANCH: "legit-default-branch",
  COMMIT_HISTORY: "legit-commit-history",
} as const;

// =============================================================================
// Types
// =============================================================================

/** A record of a commit in our custom history */
export interface CommitRecord {
  /** Unique ID for this commit */
  id: string;
  /** When the commit was made */
  timestamp: Date;
  /** Agent ID that made the commit */
  agentId: string;
  /** Custom commit message */
  message: string;
  /** Summary of changes */
  summary: {
    eventsAdded: number;
    eventsRemoved: number;
    eventsModified: number;
  };
}

/** Options for merging agent changes */
export interface MergeOptions {
  /** Custom commit message */
  message?: string;
  /** Agent ID making the commit (for authorship tracking) */
  agentId?: string;
}

/** Result of a merge operation */
export interface MergeResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Whether changes were actually merged (false if no changes) */
  merged: boolean;
  /** The commit record if successful */
  commit?: CommitRecord;
}

/** Return type for the useMultiAgentCoordination hook */
export interface UseMultiAgentReturn {
  /** Currently active agent sessions */
  activeSessions: AgentSession[];

  /** The default/main branch name (where agents fork from) */
  defaultBranch: string;

  /** Currently active branch (null if not switched) */
  currentBranch: string | null;

  /**
   * Create a new isolated session for an agent.
   * Creates a new git branch forked from the default branch.
   * @param agentId - Unique identifier for the agent
   * @param modelName - AI model name (e.g., "claude", "gpt4")
   * @returns The created branch name
   */
  createAgentSession: (agentId: string, modelName: string) => Promise<string>;

  /**
   * Merge an agent's changes back to the default branch.
   * Can accept either an agentId or a branch name directly.
   * @param agentIdOrBranch - Agent ID or branch name to merge
   * @param options - Optional merge options (message, agentId for authorship)
   * @returns Result indicating success, whether changes were merged, and commit record
   */
  mergeAgentChanges: (agentIdOrBranch: string, options?: MergeOptions) => Promise<MergeResult>;

  /**
   * Get the commit history for display in UI.
   * @returns Array of commit records, most recent first
   */
  getCommitHistory: () => CommitRecord[];

  /**
   * Preview what changes an agent has pending compared to main.
   * Can accept either an agentId or a branch name directly.
   * @param agentIdOrBranch - Agent ID or branch name to preview
   * @returns Preview with change summary, or null if branch not found
   */
  getAgentPreview: (agentIdOrBranch: string) => Promise<AgentPreview | null>;

  /**
   * Switch the current branch to an agent's branch.
   * @param agentIdOrBranch - Agent ID or branch name to switch to
   */
  switchToAgentBranch: (agentIdOrBranch: string) => Promise<void>;

  /**
   * Switch back to the default branch.
   */
  switchToMain: () => Promise<void>;

  /**
   * Find an agent session by ID.
   * @param agentId - Agent ID to find
   * @returns Agent session or undefined
   */
  findSession: (agentId: string) => AgentSession | undefined;

  /**
   * Get the current agent ID from the current branch (if on an agent branch).
   * @returns Agent ID or null if not on an agent branch
   */
  getCurrentAgentId: () => Promise<string | null>;
}

// =============================================================================
// Constants
// =============================================================================

/** Default branch name - using "main" for consistency */
const DEFAULT_BRANCH = "main";

// =============================================================================
// Helper Functions
// =============================================================================

/** Agent branch name prefix */
const AGENT_BRANCH_PREFIX = "agent-";

/**
 * Generate a branch name for an agent session.
 */
function generateBranchName(modelName: string, agentId: string): string {
  return `${AGENT_BRANCH_PREFIX}${modelName}-${agentId}`;
}

/**
 * Check if a branch name is an agent branch.
 */
function isAgentBranch(branchName: string): boolean {
  return branchName.startsWith(AGENT_BRANCH_PREFIX);
}

/**
 * Parse agent info from a branch name.
 * Branch format: agent-{modelName}-{agentId}
 */
function parseAgentBranch(branchName: string): { modelName: string; agentId: string } | null {
  if (!isAgentBranch(branchName)) return null;

  const parts = branchName.slice(AGENT_BRANCH_PREFIX.length).split("-");
  if (parts.length < 2) return null;

  // Model name is first part, agent ID is the rest (in case agent ID has hyphens)
  const modelName = parts[0];
  const agentId = parts.slice(1).join("-");

  return { modelName, agentId };
}

/**
 * Resolve an agent ID or branch name to the actual branch name.
 * If given a full branch name (starts with "agent-"), returns it.
 * If given just an agent ID, constructs the branch name.
 */
function resolveBranchName(agentIdOrBranch: string, sessions: AgentSession[]): string {
  // If it's already a full branch name
  if (isAgentBranch(agentIdOrBranch)) {
    return agentIdOrBranch;
  }

  // Look up in sessions first
  const session = sessions.find(s => s.agentId === agentIdOrBranch);
  if (session) {
    return session.branch;
  }

  // Fallback: assume it's an agent ID with default model
  return generateBranchName("claude", agentIdOrBranch);
}

/**
 * Load sessions from localStorage.
 */
function loadStoredSessions(): AgentSession[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as Array<{
      agentId: string;
      modelName: string;
      branch: string;
      createdAt: string;
      lastActivity: string;
    }>;
    return parsed.map(s => ({
      ...s,
      createdAt: new Date(s.createdAt),
      lastActivity: new Date(s.lastActivity),
    }));
  } catch {
    return [];
  }
}

/**
 * Save sessions to localStorage.
 */
function saveStoredSessions(sessions: AgentSession[]): void {
  if (typeof window === "undefined") return;
  try {
    const serialized = sessions.map(s => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
      lastActivity: s.lastActivity.toISOString(),
    }));
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(serialized));
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Load default branch from localStorage.
 */
function loadStoredDefaultBranch(): string {
  if (typeof window === "undefined") return DEFAULT_BRANCH;
  try {
    return localStorage.getItem(STORAGE_KEYS.DEFAULT_BRANCH) || DEFAULT_BRANCH;
  } catch {
    return DEFAULT_BRANCH;
  }
}

/**
 * Save default branch to localStorage.
 */
function saveStoredDefaultBranch(branch: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.DEFAULT_BRANCH, branch);
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Load commit history from localStorage.
 */
function loadStoredCommitHistory(): CommitRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.COMMIT_HISTORY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as Array<{
      id: string;
      timestamp: string;
      agentId: string;
      message: string;
      summary: {
        eventsAdded: number;
        eventsRemoved: number;
        eventsModified: number;
      };
    }>;
    return parsed.map(c => ({
      ...c,
      timestamp: new Date(c.timestamp),
    }));
  } catch {
    return [];
  }
}

/**
 * Save commit history to localStorage.
 */
function saveStoredCommitHistory(history: CommitRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    const serialized = history.map(c => ({
      ...c,
      timestamp: c.timestamp.toISOString(),
    }));
    localStorage.setItem(STORAGE_KEYS.COMMIT_HISTORY, JSON.stringify(serialized));
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Add a commit to history.
 */
function addCommitToHistory(commit: CommitRecord): void {
  const history = loadStoredCommitHistory();
  // Add new commit at the beginning (most recent first)
  history.unshift(commit);
  // Keep only the last 100 commits to avoid localStorage bloat
  const trimmed = history.slice(0, 100);
  saveStoredCommitHistory(trimmed);
}

/**
 * Generate a unique commit ID.
 */
function generateCommitId(): string {
  return `commit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Result of comparing two event arrays.
 */
interface EventDiff {
  /** Events that exist in agent but not in base */
  added: IEvent[];
  /** Events that exist in base but not in agent */
  removed: IEvent[];
  /** Events that exist in both but have different content */
  modified: IEvent[];
}

/**
 * Compare two arrays of events and return the diff.
 *
 * @param baseEvents - Events from the base/main branch
 * @param agentEvents - Events from the agent branch
 * @returns Object containing added, removed, and modified events
 */
function compareEvents(baseEvents: IEvent[], agentEvents: IEvent[]): EventDiff {
  const baseIds = new Set(baseEvents.map((e) => e.id));
  const agentIds = new Set(agentEvents.map((e) => e.id));

  const added = agentEvents.filter((e) => !baseIds.has(e.id));
  const removed = baseEvents.filter((e) => !agentIds.has(e.id));
  const modified = agentEvents.filter((e) => {
    const baseEvent = baseEvents.find((b) => b.id === e.id);
    return baseEvent && JSON.stringify(baseEvent) !== JSON.stringify(e);
  });

  return { added, removed, modified };
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for multi-agent coordination with Legit versioned filesystem.
 *
 * Enables multiple AI agents to work on the calendar concurrently without conflicts
 * by giving each agent its own git branch. Changes can be previewed and merged
 * back to the main branch when approved.
 *
 * ## Key Concepts
 *
 * - **Default Branch**: The shared "main" state (usually "anonymous" or "main")
 * - **Agent Branch**: Isolated branch for each agent (e.g., "agent-claude-scheduler")
 * - **Preview**: Compare agent's changes to main before merging
 * - **Merge**: Copy agent's state to main branch
 *
 * ## Important Notes
 *
 * - Agent sessions are tracked in React state, so they persist only during the
 *   current page session. The git branches themselves persist in Legit.
 * - When a sandbox is created, the current branch is automatically switched to
 *   the agent branch. All subsequent writes go to that branch.
 * - To preview/merge, you can pass the full branch name (e.g., "agent-claude-xyz")
 *   or just the agent ID if a session exists.
 *
 * ## Usage
 *
 * ```tsx
 * function AgentTools() {
 *   const {
 *     createAgentSession,
 *     getAgentPreview,
 *     mergeAgentChanges,
 *     activeSessions,
 *   } = useMultiAgentCoordination();
 *
 *   // Create sandbox for agent
 *   const branch = await createAgentSession("scheduler", "claude");
 *
 *   // Agent makes changes on their branch...
 *
 *   // Preview changes before merging
 *   const preview = await getAgentPreview("scheduler");
 *   if (preview?.hasChanges) {
 *     await mergeAgentChanges("scheduler");
 *   }
 * }
 * ```
 *
 * @returns Multi-agent coordination utilities
 */
export function useMultiAgentCoordination(): UseMultiAgentReturn {
  const { legitFs } = useLegitContext();

  // State - now backed by localStorage for persistence across page navigations
  const [activeSessions, setActiveSessions] = useState<AgentSession[]>(() => loadStoredSessions());
  const [currentBranch, setCurrentBranch] = useState<string | null>(null);
  const [defaultBranch, setDefaultBranch] = useState<string>(() => loadStoredDefaultBranch());

  // Sync sessions to localStorage whenever they change
  useEffect(() => {
    saveStoredSessions(activeSessions);
  }, [activeSessions]);

  // Sync default branch to localStorage whenever it changes
  useEffect(() => {
    if (defaultBranch !== DEFAULT_BRANCH) {
      saveStoredDefaultBranch(defaultBranch);
    }
  }, [defaultBranch]);

  // On mount, sync current branch from Legit
  useEffect(() => {
    if (!legitFs) return;

    let mounted = true;
    legitFs.getCurrentBranch().then((branch) => {
      if (mounted) {
        setCurrentBranch(branch);
      }
    });

    return () => {
      mounted = false;
    };
  }, [legitFs]);

  /**
   * Find an agent session by ID.
   */
  const findSession = useCallback(
    (agentId: string): AgentSession | undefined => {
      return activeSessions.find((s) => s.agentId === agentId);
    },
    [activeSessions]
  );

  /**
   * Create a new agent session with its own branch.
   */
  const createAgentSession = useCallback(
    async (agentId: string, modelName: string): Promise<string> => {
      if (!legitFs) {
        throw new Error(
          "LegitFS not initialized. Ensure LegitProvider wraps your component tree."
        );
      }

      const branchName = generateBranchName(modelName, agentId);

      try {
        // Get current branch to fork from
        const sourceBranch = await legitFs.getCurrentBranch();

        // Remember the default branch for switching back later
        if (activeSessions.length === 0) {
          setDefaultBranch(sourceBranch);
        }

        // Read the current calendar state from the source branch
        let eventsData = "[]";
        try {
          const data = await legitFs.promises.readFile(
            `/.legit/branches/${sourceBranch}${CALENDAR_PATHS.EVENTS}`,
            "utf8"
          );
          eventsData = data as string;
        } catch {
          // Events file might not exist yet, use empty array
        }

        // The Legit SDK automatically creates branches when you write to them!
        // Writing to /.legit/branches/[newBranch]/[path] will:
        // 1. Create the git branch from current HEAD if it doesn't exist
        // 2. Write the file to that branch
        await legitFs.promises.writeFile(
          `/.legit/branches/${branchName}${CALENDAR_PATHS.EVENTS}`,
          eventsData,
          "utf8"
        );

        // Also copy settings if they exist
        try {
          const settingsData = await legitFs.promises.readFile(
            `/.legit/branches/${sourceBranch}${CALENDAR_PATHS.SETTINGS}`,
            "utf8"
          );
          await legitFs.promises.writeFile(
            `/.legit/branches/${branchName}${CALENDAR_PATHS.SETTINGS}`,
            settingsData as string,
            "utf8"
          );
        } catch {
          // Settings file might not exist yet
        }

        // Track the session
        const session: AgentSession = {
          agentId,
          modelName,
          branch: branchName,
          createdAt: new Date(),
          lastActivity: new Date(),
        };

        setActiveSessions((prev) => [...prev, session]);

        // Switch to the agent branch so all subsequent writes go there
        await legitFs.setCurrentBranch(branchName);
        setCurrentBranch(branchName);

        return branchName;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Failed to create agent session: ${message}`);
      }
    },
    [legitFs, activeSessions.length]
  );

  /**
   * Get preview of what changes an agent has made.
   * Now supports both agent ID and branch name as input.
   */
  const getAgentPreview = useCallback(
    async (agentIdOrBranch: string): Promise<AgentPreview | null> => {
      if (!legitFs) return null;

      // Resolve to branch name (supports both agent ID and full branch name)
      const agentBranch = resolveBranchName(agentIdOrBranch, activeSessions);

      try {
        // Compare against the default branch (where agents forked from)
        // This ensures we always compare agent work against the shared state
        const baseBranch = defaultBranch;

        // Read states from both branches in parallel
        const [baseEvents, agentEvents] = await Promise.all([
          legitFs.promises
            .readFile(
              `/.legit/branches/${baseBranch}${CALENDAR_PATHS.EVENTS}`,
              "utf8"
            )
            .then((data) => JSON.parse(data as string) as IEvent[])
            .catch(() => [] as IEvent[]),
          legitFs.promises
            .readFile(
              `/.legit/branches/${agentBranch}${CALENDAR_PATHS.EVENTS}`,
              "utf8"
            )
            .then((data) => JSON.parse(data as string) as IEvent[])
            .catch(() => [] as IEvent[]),
        ]);

        const { added, removed, modified } = compareEvents(
          baseEvents,
          agentEvents
        );

        const hasChanges =
          added.length > 0 || removed.length > 0 || modified.length > 0;

        return {
          hasChanges,
          agentState: { events: agentEvents },
          mainState: { events: baseEvents },
          summary: {
            eventsAdded: added.length,
            eventsRemoved: removed.length,
            eventsModified: modified.length,
          },
        };
      } catch {
        return null;
      }
    },
    [legitFs, activeSessions, defaultBranch]
  );

  /**
   * Merge agent's changes back to the default branch.
   * Now supports both agent ID and branch name as input.
   * Also tracks commit history with custom messages and authorship.
   */
  const mergeAgentChanges = useCallback(
    async (agentIdOrBranch: string, options?: MergeOptions): Promise<MergeResult> => {
      if (!legitFs) {
        return { success: false, merged: false };
      }

      // Resolve to branch name (supports both agent ID and full branch name)
      const agentBranch = resolveBranchName(agentIdOrBranch, activeSessions);

      try {
        // Merge into the default branch (not current, which might be agent's own branch)
        const targetBranch = defaultBranch;

        // First, compute the diff for the commit record
        const [baseEvents, agentEvents] = await Promise.all([
          legitFs.promises
            .readFile(`/.legit/branches/${targetBranch}${CALENDAR_PATHS.EVENTS}`, "utf8")
            .then((data) => JSON.parse(data as string) as IEvent[])
            .catch(() => [] as IEvent[]),
          legitFs.promises
            .readFile(`/.legit/branches/${agentBranch}${CALENDAR_PATHS.EVENTS}`, "utf8")
            .then((data) => JSON.parse(data as string) as IEvent[])
            .catch(() => [] as IEvent[]),
        ]);

        const { added, removed, modified } = compareEvents(baseEvents, agentEvents);

        // Simple merge strategy: copy agent's files to default branch
        await legitFs.promises.writeFile(
          `/.legit/branches/${targetBranch}${CALENDAR_PATHS.EVENTS}`,
          JSON.stringify(agentEvents, null, 2),
          "utf8"
        );

        // Determine the agent ID for authorship
        const session = activeSessions.find(s => s.branch === agentBranch);
        const authorAgentId = options?.agentId || session?.agentId || parseAgentBranch(agentBranch)?.agentId || "unknown";

        // Create commit record with custom message and authorship
        const commitRecord: CommitRecord = {
          id: generateCommitId(),
          timestamp: new Date(),
          agentId: authorAgentId,
          message: options?.message || `Merged changes from ${authorAgentId}`,
          summary: {
            eventsAdded: added.length,
            eventsRemoved: removed.length,
            eventsModified: modified.length,
          },
        };

        // Save to our custom commit history
        addCommitToHistory(commitRecord);

        // Update agent's last activity if we have a session for them
        if (session) {
          setActiveSessions((prev) =>
            prev.map((s) =>
              s.agentId === session.agentId ? { ...s, lastActivity: new Date() } : s
            )
          );
        }

        return { success: true, merged: true, commit: commitRecord };
      } catch {
        return { success: false, merged: false };
      }
    },
    [legitFs, activeSessions, defaultBranch]
  );

  /**
   * Switch to an agent's branch.
   * Now supports both agent ID and branch name as input.
   */
  const switchToAgentBranch = useCallback(
    async (agentIdOrBranch: string): Promise<void> => {
      if (!legitFs) return;

      // Resolve to branch name (supports both agent ID and full branch name)
      const branchName = resolveBranchName(agentIdOrBranch, activeSessions);

      await legitFs.setCurrentBranch(branchName);
      setCurrentBranch(branchName);
    },
    [legitFs, activeSessions]
  );

  /**
   * Switch back to the default branch.
   */
  const switchToMain = useCallback(async (): Promise<void> => {
    if (!legitFs) return;
    await legitFs.setCurrentBranch(defaultBranch);
    setCurrentBranch(defaultBranch);
  }, [legitFs, defaultBranch]);

  /**
   * Get the current agent ID from the current branch (if on an agent branch).
   * This is useful when the agent needs to know their own identity.
   */
  const getCurrentAgentId = useCallback(async (): Promise<string | null> => {
    if (!legitFs) return null;

    const branch = await legitFs.getCurrentBranch();
    const parsed = parseAgentBranch(branch);

    return parsed?.agentId || null;
  }, [legitFs]);

  /**
   * Get the commit history for display in UI.
   * Returns commits with custom messages and agent authorship.
   */
  const getCommitHistory = useCallback((): CommitRecord[] => {
    return loadStoredCommitHistory();
  }, []);

  // Memoize return value
  return useMemo(
    () => ({
      activeSessions,
      defaultBranch,
      currentBranch,
      createAgentSession,
      mergeAgentChanges,
      getAgentPreview,
      switchToAgentBranch,
      switchToMain,
      findSession,
      getCurrentAgentId,
      getCommitHistory,
    }),
    [
      activeSessions,
      defaultBranch,
      currentBranch,
      createAgentSession,
      mergeAgentChanges,
      getAgentPreview,
      switchToAgentBranch,
      switchToMain,
      findSession,
      getCurrentAgentId,
      getCommitHistory,
    ]
  );
}
