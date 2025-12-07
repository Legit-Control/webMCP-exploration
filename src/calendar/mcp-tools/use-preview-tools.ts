"use client";

import { useWebMCP } from "@mcp-b/react-webmcp";
import { z } from "zod";
import { useAgentPreview } from "@/calendar/contexts/agent-preview-context";

/**
 * MCP tools for controlling the agent preview UI.
 *
 * These tools allow AI agents to trigger the phantom event preview mode
 * in the calendar UI, letting users visually see proposed changes before approval.
 *
 * ## Registered Tools
 *
 * - `calendar_show_preview` - Show phantom events from an agent branch
 * - `calendar_hide_preview` - Exit preview mode
 * - `calendar_get_preview_status` - Check if preview mode is active
 */
export function usePreviewTools(): void {
  const {
    isPreviewMode,
    previewAgentId,
    pendingChanges, // Still needed for calendar_get_preview_status
    loading,
    startPreview,
    stopPreview,
  } = useAgentPreview();

  // ---------------------------------------------------------------------------
  // Tool: Show agent preview in the UI
  // ---------------------------------------------------------------------------
  useWebMCP({
    name: "calendar_show_preview",
    description: `Show a visual preview of an agent's pending changes in the calendar UI.

When activated:
- Added events appear as green dashed "phantom" events
- Modified events appear as amber dashed events showing the new state
- Removed events appear as red dashed strikethrough events
- A banner appears at the top with Accept/Reject buttons

This lets users visually review AI-proposed changes before approving them.`,
    inputSchema: {
      agentId: z
        .string()
        .describe("ID of the agent whose changes to preview"),
    },
    outputSchema: {
      success: z.boolean().describe("Whether preview mode was activated"),
      message: z.string().describe("Human-readable result message"),
      agentId: z.string().optional().describe("Agent being previewed"),
      changes: z
        .object({
          added: z.number(),
          modified: z.number(),
          removed: z.number(),
        })
        .optional()
        .describe("Summary of pending changes"),
      tip: z.string().optional().describe("Helpful tip for the user"),
    },
    annotations: {
      readOnlyHint: false,
      idempotentHint: true,
      destructiveHint: false,
    },
    handler: async ({ agentId }) => {
      try {
        // startPreview now returns the computed changes directly,
        // avoiding the stale closure issue with React state
        const changes = await startPreview(agentId);

        return {
          success: true,
          message: `Now previewing changes from agent "${agentId}". Phantom events are now visible in the calendar.`,
          agentId,
          changes: {
            added: changes.added.length,
            modified: changes.modified.length,
            removed: changes.removed.length,
          },
          tip: "Users can click Accept All or Reject All in the preview banner, or click individual phantom events to review them.",
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to start preview: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    },
  });

  // ---------------------------------------------------------------------------
  // Tool: Hide preview mode
  // ---------------------------------------------------------------------------
  useWebMCP({
    name: "calendar_hide_preview",
    description: `Exit the agent preview mode and return to normal calendar view.

This hides all phantom events and removes the preview banner.
The agent's changes are NOT affected - they remain on their branch.`,
    inputSchema: {},
    outputSchema: {
      success: z.boolean().describe("Whether preview mode was deactivated"),
      message: z.string().describe("Human-readable result message"),
    },
    annotations: {
      readOnlyHint: false,
      idempotentHint: true,
      destructiveHint: false,
    },
    handler: async () => {
      if (!isPreviewMode) {
        return {
          success: true,
          message: "Preview mode was not active.",
        };
      }

      stopPreview();

      return {
        success: true,
        message: "Exited preview mode. Calendar is now showing main branch state.",
      };
    },
  });

  // ---------------------------------------------------------------------------
  // Tool: Get preview status
  // ---------------------------------------------------------------------------
  useWebMCP({
    name: "calendar_get_preview_status",
    description: `Check if the calendar is currently in preview mode.

Returns information about which agent is being previewed and what changes are pending.`,
    inputSchema: {},
    outputSchema: {
      isPreviewMode: z.boolean().describe("Whether preview mode is active"),
      previewAgentId: z.string().nullable().describe("ID of the agent being previewed"),
      loading: z.boolean().describe("Whether preview data is loading"),
      pendingChanges: z
        .object({
          added: z.number(),
          modified: z.number(),
          removed: z.number(),
          total: z.number(),
        })
        .optional()
        .describe("Summary of pending changes"),
      message: z.string().describe("Human-readable status message"),
    },
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
    },
    handler: async () => {
      if (!isPreviewMode) {
        return {
          isPreviewMode: false,
          previewAgentId: null,
          loading: false,
          message: "Preview mode is not active. Calendar is showing main branch.",
        };
      }

      const total =
        pendingChanges.added.length +
        pendingChanges.modified.length +
        pendingChanges.removed.length;

      return {
        isPreviewMode: true,
        previewAgentId,
        loading,
        pendingChanges: {
          added: pendingChanges.added.length,
          modified: pendingChanges.modified.length,
          removed: pendingChanges.removed.length,
          total,
        },
        message: `Previewing ${total} pending changes from agent "${previewAgentId}".`,
      };
    },
  });
}
