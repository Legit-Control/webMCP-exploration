"use client";

import { useWebMCP } from "@mcp-b/react-webmcp";
import { z } from "zod";
import { useMultiAgentCoordination } from "@/legit-webmcp";

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * MCP tools for multi-agent coordination.
 *
 * Provides tools that allow multiple AI agents to work on the calendar concurrently
 * by giving each agent its own isolated git branch.
 *
 * ## Features
 *
 * - **Sandbox Sessions**: Start isolated branches for experimentation
 * - **Change Preview**: See what changes an agent has pending
 * - **Merge to Main**: Commit agent changes back to the shared calendar
 * - **Agent Visibility**: See what other agents are working on
 *
 * ## Registered Tools
 *
 * - `calendar_start_sandbox` - Create an isolated sandbox for an agent
 * - `calendar_preview_changes` - Preview pending changes vs main
 * - `calendar_commit_changes` - Merge changes back to main
 * - `calendar_list_agents` - List active agent sessions
 * - `calendar_switch_branch` - Switch between branches (admin)
 *
 * @example
 * ```tsx
 * function CalendarMCPTools() {
 *   useAgentTools();
 *   // Tools are now registered and available to AI agents
 * }
 * ```
 */
export function useAgentTools(): void {
  const {
    activeSessions,
    createAgentSession,
    mergeAgentChanges,
    getAgentPreview,
    switchToAgentBranch,
    switchToMain,
    currentBranch,
    getCurrentAgentId,
  } = useMultiAgentCoordination();

  // ---------------------------------------------------------------------------
  // Tool: Start a sandbox session
  // ---------------------------------------------------------------------------
  useWebMCP({
    name: "calendar_start_sandbox",
    description: `Start an isolated sandbox session for making calendar changes.

When in a sandbox:
- Your changes won't affect other agents or the main calendar
- You can experiment freely and rollback if needed
- Changes are only applied to main when you explicitly commit them

Use this when you want to make multiple changes that should be reviewed together,
or when multiple agents need to work on the calendar concurrently.`,
    inputSchema: {
      agentName: z
        .string()
        .describe(
          "A unique identifier for this agent session (e.g., 'claude-scheduler')"
        ),
      modelName: z
        .string()
        .default("claude")
        .describe(
          "The AI model name (e.g., 'claude', 'gpt4', 'gemini'). Used for tracking."
        ),
    },
    outputSchema: {
      success: z.boolean().describe("Whether sandbox creation succeeded"),
      message: z.string().describe("Human-readable result message"),
      branch: z.string().describe("Git branch name for the sandbox"),
      agentId: z.string().describe("Unique agent identifier"),
      tips: z.array(z.string()).describe("Helpful tips for using the sandbox"),
    },
    annotations: {
      readOnlyHint: false,
      idempotentHint: false,
      destructiveHint: false,
    },
    handler: async ({ agentName, modelName }) => {
      try {
        const branchName = await createAgentSession(agentName, modelName);

        return {
          success: true,
          message: `Started sandbox session "${agentName}" on branch ${branchName}`,
          branch: branchName,
          agentId: agentName,
          tips: [
            "Your sandbox branch has been created with a copy of current state",
            "Use calendar_preview_changes to see differences from main",
            "Use calendar_commit_changes to merge your changes to main",
            "Use calendar_switch_branch to view different branches",
          ],
        };
      } catch (error) {
        throw new Error(`Failed to create sandbox: ${error}`);
      }
    },
  });

  // ---------------------------------------------------------------------------
  // Tool: Preview pending changes
  // ---------------------------------------------------------------------------
  useWebMCP({
    name: "calendar_preview_changes",
    description: `Preview what changes this agent has pending compared to the main calendar.

Shows:
- Events that were added
- Events that were removed
- Events that were modified

Use this before committing to review your changes.`,
    inputSchema: {
      agentId: z
        .string()
        .optional()
        .describe(
          "Agent ID or branch name to preview (defaults to current agent if in a sandbox)"
        ),
    },
    outputSchema: {
      hasChanges: z.boolean().describe("Whether the agent has pending changes"),
      agentId: z.string().optional().describe("Agent ID being previewed"),
      currentBranch: z.string().optional().describe("Current branch name"),
      summary: z
        .object({
          eventsAdded: z.number(),
          eventsRemoved: z.number(),
          eventsModified: z.number(),
        })
        .optional()
        .describe("Summary of changes"),
      message: z.string().describe("Human-readable summary"),
      tip: z.string().optional().describe("Helpful tip"),
    },
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
    },
    handler: async ({ agentId }) => {
      // Priority: explicit agentId > current branch agent > first active session
      let targetAgentId = agentId;

      if (!targetAgentId) {
        // Try to detect from current branch
        const currentAgent = await getCurrentAgentId();
        targetAgentId = currentAgent || activeSessions[0]?.agentId;
      }

      if (!targetAgentId) {
        return {
          hasChanges: false,
          currentBranch: currentBranch || undefined,
          message:
            "No active sandbox session. Use calendar_start_sandbox to create one.",
        };
      }

      const preview = await getAgentPreview(targetAgentId);

      if (!preview) {
        return {
          hasChanges: false,
          agentId: targetAgentId,
          currentBranch: currentBranch || undefined,
          message: `Could not read branch for agent "${targetAgentId}". The branch may not exist.`,
        };
      }

      if (!preview.hasChanges) {
        return {
          hasChanges: false,
          agentId: targetAgentId,
          currentBranch: currentBranch || undefined,
          message: "No pending changes compared to main. Make some changes first!",
        };
      }

      return {
        hasChanges: true,
        agentId: targetAgentId,
        currentBranch: currentBranch || undefined,
        summary: preview.summary,
        message: `${preview.summary?.eventsAdded || 0} events added, ${preview.summary?.eventsRemoved || 0} removed, ${preview.summary?.eventsModified || 0} modified.`,
        tip: "Use calendar_commit_changes to apply these changes to the main calendar.",
      };
    },
  });

  // ---------------------------------------------------------------------------
  // Tool: Commit changes to main
  // ---------------------------------------------------------------------------
  useWebMCP({
    name: "calendar_commit_changes",
    description: `Commit your sandbox changes to the main calendar.

This merges all your pending changes into the shared calendar that everyone sees.
Use calendar_preview_changes first to review what will be committed.`,
    inputSchema: {
      agentId: z
        .string()
        .optional()
        .describe("Agent ID or branch name to commit (defaults to current agent)"),
      message: z
        .string()
        .optional()
        .describe(
          "Description of the changes being committed (for the audit log)"
        ),
    },
    outputSchema: {
      success: z.boolean().describe("Whether the commit succeeded"),
      message: z.string().describe("Human-readable result message"),
      committed: z
        .object({
          eventsAdded: z.number(),
          eventsRemoved: z.number(),
          eventsModified: z.number(),
        })
        .optional()
        .describe("What was committed"),
      tip: z.string().optional().describe("Helpful tip"),
    },
    annotations: {
      readOnlyHint: false,
      idempotentHint: false,
      destructiveHint: false,
    },
    handler: async ({ agentId, message }) => {
      // Priority: explicit agentId > current branch agent > first active session
      let targetAgentId = agentId;

      if (!targetAgentId) {
        // Try to detect from current branch
        const currentAgent = await getCurrentAgentId();
        targetAgentId = currentAgent || activeSessions[0]?.agentId;
      }

      if (!targetAgentId) {
        throw new Error(
          "No active sandbox session. Use calendar_start_sandbox first."
        );
      }

      const preview = await getAgentPreview(targetAgentId);

      if (!preview?.hasChanges) {
        return {
          success: false,
          message: "No changes to commit compared to main.",
        };
      }

      // Pass custom message and agent ID for commit history tracking
      const result = await mergeAgentChanges(targetAgentId, {
        message,
        agentId: targetAgentId,
      });

      if (!result.success) {
        throw new Error("Failed to commit changes. There may be a conflict.");
      }

      return {
        success: true,
        message: message
          ? `Committed: ${message}`
          : "Changes committed to main calendar successfully!",
        committed: {
          eventsAdded: result.commit?.summary.eventsAdded || preview.summary?.eventsAdded || 0,
          eventsRemoved: result.commit?.summary.eventsRemoved || preview.summary?.eventsRemoved || 0,
          eventsModified: result.commit?.summary.eventsModified || preview.summary?.eventsModified || 0,
        },
        tip: "Your changes are now visible to everyone.",
      };
    },
  });

  // ---------------------------------------------------------------------------
  // Tool: List active agents
  // ---------------------------------------------------------------------------
  useWebMCP({
    name: "calendar_list_agents",
    description: `See what AI agents are currently working on the calendar.

Shows all active sandbox sessions with their last activity time.
Useful for coordination when multiple agents are making changes.`,
    inputSchema: {},
    outputSchema: {
      agents: z
        .array(
          z.object({
            agentId: z.string().describe("Agent identifier"),
            model: z.string().describe("AI model name"),
            branch: z.string().describe("Git branch name"),
            startedAt: z.string().describe("ISO timestamp when session started"),
            lastActivity: z.string().describe("ISO timestamp of last activity"),
          })
        )
        .describe("List of active agents"),
      totalActive: z.number().describe("Total number of active agents"),
      currentBranch: z.string().optional().describe("Currently active branch"),
      message: z.string().describe("Human-readable summary"),
      tip: z.string().optional().describe("Helpful tip"),
    },
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
    },
    handler: async () => {
      if (activeSessions.length === 0) {
        return {
          agents: [],
          totalActive: 0,
          message:
            "No agents currently working on the calendar. You have exclusive access!",
        };
      }

      const agents = activeSessions.map((session) => ({
        agentId: session.agentId,
        model: session.modelName,
        branch: session.branch,
        startedAt: session.createdAt.toISOString(),
        lastActivity: session.lastActivity.toISOString(),
      }));

      return {
        agents,
        totalActive: agents.length,
        currentBranch: currentBranch || "main",
        message: `${agents.length} agent(s) currently working on the calendar.`,
        tip: "Use calendar_preview_changes with an agentId to see what another agent is doing.",
      };
    },
  });

  // ---------------------------------------------------------------------------
  // Tool: Switch branches (for debugging/admin)
  // ---------------------------------------------------------------------------
  useWebMCP({
    name: "calendar_switch_branch",
    description: `Switch to a different calendar branch.

This is an advanced tool for viewing what different agents have done.
- Switch to an agent's branch to see their pending changes
- Switch to "main" or "default" to see the shared calendar state`,
    inputSchema: {
      branch: z
        .string()
        .describe("Branch name to switch to ('main', 'default', or an agent branch name)"),
    },
    outputSchema: {
      success: z.boolean().describe("Whether the switch succeeded"),
      message: z.string().describe("Human-readable result message"),
      currentBranch: z.string().describe("The branch that is now active"),
      agent: z
        .object({
          id: z.string(),
          model: z.string(),
        })
        .optional()
        .describe("Agent info if switched to an agent branch"),
    },
    annotations: {
      readOnlyHint: false,
      idempotentHint: true,
      destructiveHint: false,
    },
    handler: async ({ branch }) => {
      // Handle "main" or "default" as alias for the default branch
      if (branch === "main" || branch === "default") {
        await switchToMain();
        return {
          success: true,
          message: "Switched to main branch",
          currentBranch: "main",
        };
      }

      const session = activeSessions.find(
        (s) => s.branch === branch || s.agentId === branch
      );

      if (!session) {
        throw new Error(
          `Branch "${branch}" not found. Use calendar_list_agents to see available branches.`
        );
      }

      await switchToAgentBranch(session.agentId);

      return {
        success: true,
        message: `Switched to agent branch: ${session.branch}`,
        currentBranch: session.branch,
        agent: {
          id: session.agentId,
          model: session.modelName,
        },
      };
    },
  });
}
