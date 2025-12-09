"use client";

import { useWebMCP } from "@mcp-b/react-webmcp";
import { useLegitContext } from "@legit-sdk/react/server";
import { z } from "zod";
import type { HistoryItem } from "@legit-sdk/core";
import { CALENDAR_PATHS } from "@/legit-webmcp/types";
import { useMultiAgentCoordination } from "@/legit-webmcp";

// =============================================================================
// Types
// =============================================================================

/** Event with ID for comparison */
interface EventWithId {
  id: number;
  title?: string;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * MCP tools for version history and undo/rollback functionality.
 *
 * Leverages Legit's Git-like versioning to provide:
 * - View change history with commit messages and timestamps
 * - Undo/rollback changes to any previous state
 * - Compare states between different commits
 *
 * @example
 * ```tsx
 * function CalendarMCPTools() {
 *   useHistoryTools();
 *   // Tools are now registered: calendar_show_history, calendar_undo, calendar_compare_states
 * }
 * ```
 */
export function useHistoryTools(): void {
  const { legitFs } = useLegitContext();
  const { getCommitHistory } = useMultiAgentCoordination();

  // ---------------------------------------------------------------------------
  // Tool: Show change history
  // ---------------------------------------------------------------------------
  useWebMCP({
    name: "calendar_show_history",
    description: `Show the history of calendar changes with commit messages, authors, and timestamps.
Use this to see what changes have been made and by whom.

Each history entry can be used with calendar_undo to rollback to that state.`,
    inputSchema: {
      limit: z.coerce
        .number()
        .default(10)
        .describe("Maximum number of history entries to return (default: 10)"),
    },
    outputSchema: {
      currentBranch: z.string().describe("Current git branch name"),
      totalEntries: z.number().describe("Total number of commits in history"),
      entries: z
        .array(
          z.object({
            position: z.number().describe("Position in history (0 = current)"),
            commitId: z.string().describe("Git commit hash"),
            message: z.string().describe("Commit message"),
            author: z.string().describe("Author name (agent ID if from agent commit)"),
            timestamp: z.string().describe("ISO timestamp"),
            canRollbackTo: z
              .boolean()
              .describe("Whether this commit can be rolled back to"),
            changes: z
              .object({
                eventsAdded: z.number(),
                eventsRemoved: z.number(),
                eventsModified: z.number(),
              })
              .optional()
              .describe("Change summary (if available from agent commit)"),
          })
        )
        .describe("History entries"),
      message: z.string().describe("Human-readable summary"),
      tip: z.string().optional().describe("Helpful tip for the user"),
    },
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
    },
    handler: async ({ limit }) => {
      if (!legitFs) {
        throw new Error("Version history not available");
      }

      try {
        const branch = await legitFs.getCurrentBranch();
        const historyPath = `/.legit/branches/${branch}/.legit/history`;
        const historyContent = await legitFs.promises.readFile(
          historyPath,
          "utf8"
        );
        const history: HistoryItem[] = JSON.parse(historyContent as string);

        // Get our custom commit history with agent messages and authors
        const customHistory = getCommitHistory();

        const entries = history.slice(0, limit).map((h, i) => {
          // Try to match with custom commit history by timestamp proximity
          // Custom commits are stored when mergeAgentChanges is called
          const commitTimestamp = h.author?.timestamp
            ? h.author.timestamp * 1000
            : 0;

          // Find a custom commit that was made within 5 seconds of this git commit
          const matchingCustomCommit = customHistory.find((c) => {
            const customTime = c.timestamp.getTime();
            return Math.abs(customTime - commitTimestamp) < 5000;
          });

          return {
            position: i,
            commitId: h.oid,
            // Use custom message if available, otherwise fall back to SDK message
            message: matchingCustomCommit?.message || h.message || "No message",
            // Use custom author (agent ID) if available, otherwise fall back to SDK author
            author: matchingCustomCommit?.agentId || h.author?.name || "Unknown",
            timestamp: h.author?.timestamp
              ? new Date(h.author.timestamp * 1000).toISOString()
              : "Unknown",
            canRollbackTo: i > 0,
            // Include change summary if available from custom history
            ...(matchingCustomCommit?.summary && {
              changes: matchingCustomCommit.summary,
            }),
          };
        });

        return {
          currentBranch: branch,
          totalEntries: history.length,
          entries,
          message: `Found ${history.length} changes in history. Showing ${entries.length} most recent.`,
          tip: "Use calendar_undo with a position number to rollback to that state.",
        };
      } catch {
        // If no Legit history, try showing just our custom commit history
        const customHistory = getCommitHistory();
        if (customHistory.length > 0) {
          const entries = customHistory.slice(0, limit).map((c, i) => ({
            position: i,
            commitId: c.id,
            message: c.message,
            author: c.agentId,
            timestamp: c.timestamp.toISOString(),
            canRollbackTo: false,
            changes: c.summary,
          }));

          return {
            currentBranch: "main",
            totalEntries: customHistory.length,
            entries,
            message: `Found ${customHistory.length} agent commits. Showing ${entries.length} most recent.`,
            tip: "These are commits made by AI agents through the sandbox system.",
          };
        }

        return {
          currentBranch: "unknown",
          entries: [],
          totalEntries: 0,
          message: "No history available yet. Make some changes first!",
        };
      }
    },
  });

  // ---------------------------------------------------------------------------
  // Tool: Undo changes
  // ---------------------------------------------------------------------------
  useWebMCP({
    name: "calendar_undo",
    description: `Undo calendar changes by rolling back to a previous state.

You can either:
- Undo a number of steps: { "steps": 1 } to undo the last change
- Rollback to a specific commit: { "commitId": "abc123..." }

Use calendar_show_history first to see available states to rollback to.`,
    inputSchema: {
      steps: z.coerce
        .number()
        .optional()
        .describe(
          "Number of changes to undo (default: 1). Use this OR commitId, not both."
        ),
      commitId: z
        .string()
        .optional()
        .describe(
          "Specific commit ID to rollback to (get from calendar_show_history)"
        ),
    },
    outputSchema: {
      success: z.boolean().describe("Whether the undo was successful"),
      message: z.string().describe("Human-readable result message"),
      rolledBackTo: z
        .string()
        .optional()
        .describe("Commit ID that was rolled back to"),
      stepsUndone: z.number().optional().describe("Number of steps undone"),
    },
    annotations: {
      readOnlyHint: false,
      idempotentHint: true,
      destructiveHint: false,
    },
    handler: async ({ steps, commitId }) => {
      if (!legitFs) {
        throw new Error("Version history not available");
      }

      const branch = await legitFs.getCurrentBranch();
      const historyPath = `/.legit/branches/${branch}/.legit/history`;
      const historyContent = await legitFs.promises.readFile(
        historyPath,
        "utf8"
      );
      const history: HistoryItem[] = JSON.parse(historyContent as string);

      let targetCommit: string;
      let stepsUndone: number;

      if (commitId) {
        const entry = history.find((h) => h.oid === commitId);
        if (!entry) {
          throw new Error(
            `Commit ${commitId} not found. Use calendar_show_history to see available commits.`
          );
        }
        targetCommit = commitId;
        stepsUndone = history.findIndex((h) => h.oid === commitId);
      } else {
        const stepsToUndo = steps || 1;
        if (stepsToUndo >= history.length) {
          throw new Error(
            `Cannot undo ${stepsToUndo} steps - only ${history.length - 1} changes available to undo.`
          );
        }
        targetCommit = history[stepsToUndo].oid;
        stepsUndone = stepsToUndo;
      }

      await legitFs.promises.writeFile(
        `/.legit/branches/${branch}/.legit/head`,
        targetCommit,
        "utf8"
      );

      return {
        success: true,
        message: `Rolled back ${stepsUndone} change(s). The calendar UI will update to show the previous state.`,
        rolledBackTo: targetCommit,
        stepsUndone,
      };
    },
  });

  // ---------------------------------------------------------------------------
  // Tool: Compare states
  // ---------------------------------------------------------------------------
  useWebMCP({
    name: "calendar_compare_states",
    description: `Compare calendar states between two commits to see what changed.

Useful for understanding the difference between the current state and a previous state,
or between any two points in history.`,
    inputSchema: {
      oldCommitId: z
        .string()
        .optional()
        .describe("The older commit to compare from (defaults to one step back)"),
      newCommitId: z
        .string()
        .optional()
        .describe("The newer commit to compare to (defaults to current state)"),
    },
    outputSchema: {
      hasChanges: z.boolean().describe("Whether there are any differences"),
      oldCommit: z.string().describe("The older commit being compared"),
      newCommit: z.string().describe("The newer commit being compared"),
      events: z
        .object({
          added: z.array(z.unknown()).describe("Events added"),
          removed: z.array(z.unknown()).describe("Events removed"),
          modified: z.array(z.unknown()).describe("Events modified"),
        })
        .describe("Event changes"),
      message: z.string().describe("Human-readable summary"),
    },
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
    },
    handler: async ({ oldCommitId, newCommitId }) => {
      if (!legitFs) {
        throw new Error("Version history not available");
      }

      const branch = await legitFs.getCurrentBranch();

      const historyPath = `/.legit/branches/${branch}/.legit/history`;
      const historyContent = await legitFs.promises.readFile(
        historyPath,
        "utf8"
      );
      const history: HistoryItem[] = JSON.parse(historyContent as string);

      if (history.length < 2) {
        return {
          hasChanges: false,
          oldCommit: "",
          newCommit: "",
          events: { added: [], removed: [], modified: [] },
          message: "Not enough history to compare. Make more changes first.",
        };
      }

      const newOid = newCommitId || history[0].oid;
      const oldOid = oldCommitId || history[1].oid;

      const readEventsAtCommit = async (oid: string): Promise<EventWithId[]> => {
        try {
          const eventsPath = CALENDAR_PATHS.EVENTS.slice(1);
          const content = await legitFs.promises.readFile(
            `/.legit/commits/${oid.slice(0, 2)}/${oid.slice(2)}/${eventsPath}`,
            "utf8"
          );
          return JSON.parse(content as string);
        } catch {
          return [];
        }
      };

      const [oldEvents, newEvents] = await Promise.all([
        readEventsAtCommit(oldOid),
        readEventsAtCommit(newOid),
      ]);

      const oldIds = new Set(oldEvents.map((e) => e.id));
      const newIds = new Set(newEvents.map((e) => e.id));

      const added = newEvents.filter((e) => !oldIds.has(e.id));
      const removed = oldEvents.filter((e) => !newIds.has(e.id));
      const modified = newEvents.filter((e) => {
        if (!oldIds.has(e.id)) return false;
        const oldEvent = oldEvents.find((o) => o.id === e.id);
        return JSON.stringify(oldEvent) !== JSON.stringify(e);
      });

      const hasChanges =
        added.length > 0 || removed.length > 0 || modified.length > 0;

      return {
        hasChanges,
        oldCommit: oldOid.slice(0, 8),
        newCommit: newOid.slice(0, 8),
        events: {
          added: added.map((e) => ({ id: e.id, title: e.title })),
          removed: removed.map((e) => ({ id: e.id, title: e.title })),
          modified: modified.map((e) => ({ id: e.id, title: e.title })),
        },
        message: hasChanges
          ? `Found ${added.length} added, ${removed.length} removed, ${modified.length} modified events.`
          : "No differences found between these states.",
      };
    },
  });
}
