"use client";

import { useEventTools } from "./use-event-tools";
import { useFilterTools } from "./use-filter-tools";
import { useSmartTools } from "./use-smart-tools";
import { useHistoryTools } from "./use-history-tools";
import { useAgentTools } from "./use-agent-tools";
import { usePreviewTools } from "./use-preview-tools";
import { useAgentPrompts } from "./agent-prompts";

/**
 * This component registers all calendar MCP tools.
 * It must be rendered inside CalendarProvider context.
 * It renders nothing but registers tools via useWebMCP hooks.
 *
 * ## Tool Categories (focused on Legit integration)
 *
 * ### Legit-Powered Tools (11 tools) - THE MAIN DEMO
 * - **Multi-Agent Sandboxing**: calendar_start_sandbox, calendar_preview_changes,
 *   calendar_commit_changes, calendar_list_agents, calendar_switch_branch
 * - **Version History**: calendar_show_history, calendar_undo, calendar_compare_states
 * - **Phantom Preview UI**: calendar_show_preview, calendar_hide_preview, calendar_get_preview_status
 *
 * ### Essential Calendar Tools (8 tools)
 * - **CRUD**: calendar_list_events, calendar_update_event, calendar_delete_event
 * - **Scheduling**: calendar_schedule_meeting, calendar_find_free_time
 * - **State & Navigation**: calendar_get_state, calendar_filter_by_user, calendar_navigate
 *
 * Total: 19 tools (down from 42)
 */
export function CalendarMCPTools() {
  // =========================================================================
  // LEGIT-POWERED TOOLS (Core Demo)
  // =========================================================================

  // Version history and rollback (3 tools)
  useHistoryTools();

  // Multi-agent coordination (5 tools)
  useAgentTools();

  // Phantom event preview UI (3 tools)
  usePreviewTools();

  // =========================================================================
  // ESSENTIAL CALENDAR TOOLS
  // =========================================================================

  // Event CRUD operations (3 tools)
  useEventTools();

  // Calendar state, filtering, and navigation (3 tools)
  useFilterTools();

  // Scheduling tools (2 tools)
  useSmartTools();

  // =========================================================================
  // AGENT PROMPTS (WebMCP-Legit Integration Guidance)
  // =========================================================================

  // Register prompts that help agents understand the demo
  useAgentPrompts();

  return null;
}
