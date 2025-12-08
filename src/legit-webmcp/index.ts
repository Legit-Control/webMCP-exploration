// Core hooks
export { useLegitWebMCP } from "@/legit-webmcp/use-legit-webmcp";
export type { UseLegitWebMCPOptions } from "@/legit-webmcp/use-legit-webmcp";

// Calendar context
export {
  LegitCalendarProvider,
  useLegitCalendar,
  useCalendar,
} from "@/legit-webmcp/legit-calendar-context";

// Multi-agent coordination
export { useMultiAgentCoordination } from "@/legit-webmcp/use-multi-agent";
export type { UseMultiAgentReturn, MergeResult, CommitRecord } from "@/legit-webmcp/use-multi-agent";

// Types
export type {
  LegitToolContext,
  AgentSession,
  AgentPreview,
  CalendarLegitState,
} from "@/legit-webmcp/types";
export { CALENDAR_PATHS } from "@/legit-webmcp/types";
