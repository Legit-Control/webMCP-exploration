"use client";

import { useNavigationTools } from "./use-navigation-tools";
import { useEventTools } from "./use-event-tools";
import { useFilterTools } from "./use-filter-tools";
import { useSettingsTools } from "./use-settings-tools";

/**
 * This component registers all calendar MCP tools.
 * It must be rendered inside CalendarProvider context.
 * It renders nothing but registers tools via useWebMCP hooks.
 */
export function CalendarMCPTools() {
  // Register all tool categories
  useNavigationTools();
  useEventTools();
  useFilterTools();
  useSettingsTools();

  return null; // No UI - just registers tools
}
