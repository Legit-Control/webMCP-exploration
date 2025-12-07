"use client";

import { useRouter, usePathname } from "next/navigation";
import { useWebMCP } from "@mcp-b/react-webmcp";
import { z } from "zod";
import { useCalendar } from "@/calendar/contexts/calendar-context";
import type { TCalendarView } from "@/calendar/types";

const VIEW_ROUTES: Record<TCalendarView, string> = {
  day: "/day-view",
  week: "/week-view",
  month: "/month-view",
  year: "/year-view",
  agenda: "/agenda-view",
};

/**
 * MCP tools for calendar state, filtering, and navigation.
 *
 * These tools provide read-only access to calendar state and allow
 * navigation between views and dates.
 *
 * ## Registered Tools
 *
 * - `calendar_get_state` - Get current view, date, filter, settings, and users
 * - `calendar_filter_by_user` - Filter events by a specific user
 * - `calendar_navigate` - Change the calendar view or date
 *
 * ## Implementation Note
 *
 * Navigation uses a deferred approach (setTimeout) to allow the tool response
 * to return before the component unmounts due to route change.
 *
 * @example
 * ```tsx
 * function CalendarMCPTools() {
 *   useFilterTools();
 *   // Tools are now registered and available to AI agents
 * }
 * ```
 */
export function useFilterTools(): void {
  const router = useRouter();
  const pathname = usePathname();
  const {
    users,
    selectedUserId,
    setSelectedUserId,
    selectedDate,
    setSelectedDate,
    badgeVariant,
    visibleHours,
    workingHours,
  } = useCalendar();

  // Consolidated state getter - combines get_current_view, get_settings, get_current_filter, list_users
  useWebMCP({
    name: "calendar_get_state",
    description: `Get the current calendar state including view, date, filter, settings, and available users. Use this to understand the current context before making changes.`,
    inputSchema: {},
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
    },
    handler: async () => {
      const currentView = pathname?.replace("-view", "").replace("/", "") || "month";
      const currentUser =
        selectedUserId === "all"
          ? null
          : users.find((u) => u.id === selectedUserId);

      return {
        // Current view and date
        currentView,
        selectedDate: selectedDate.toISOString(),

        // User filter
        filter: {
          userId: selectedUserId,
          userName: currentUser?.name || "All Users",
          isFiltered: selectedUserId !== "all",
        },

        // Display settings
        settings: {
          badgeVariant,
          visibleHours,
          workingHours,
        },

        // Available users (for filtering/event assignment)
        users: users.map((u) => ({
          id: u.id,
          name: u.name,
        })),
      };
    },
  });

  // Tool: Filter events by user (keep as separate since it's a common action)
  useWebMCP({
    name: "calendar_filter_by_user",
    description:
      "Filter calendar events to show only events for a specific user, or 'all' to show everyone. The view updates immediately to reflect the filter.",
    inputSchema: {
      userId: z
        .string()
        .describe("User ID to filter by, or 'all' to show all users. Get user IDs from calendar_get_state."),
    },
    annotations: {
      readOnlyHint: false,
      idempotentHint: true,
      destructiveHint: false,
    },
    handler: async ({ userId }) => {
      if (userId !== "all") {
        const user = users.find((u) => u.id === userId);
        if (!user) {
          throw new Error(
            `User with ID "${userId}" not found. Use calendar_get_state to see available users.`
          );
        }
      }

      setSelectedUserId(userId);

      const userName = userId === "all"
        ? "all users"
        : users.find((u) => u.id === userId)?.name;

      return {
        success: true,
        message: `Now showing events for ${userName}`,
        currentFilter: userId,
      };
    },
  });

  // Tool: Navigate the calendar view and date
  useWebMCP({
    name: "calendar_navigate",
    description: `Navigate the calendar to a specific view and/or date.

Available views: day, week, month, year, agenda

NOTE: Navigation happens AFTER this tool returns. The page will change but you'll
still receive the success response. This is expected behavior.

Examples:
- Show today in week view: { "view": "week", "today": true }
- Go to specific date: { "date": "2025-12-25" }
- Switch to month view: { "view": "month" }`,
    inputSchema: {
      view: z
        .enum(["day", "week", "month", "year", "agenda"])
        .optional()
        .describe("Calendar view to switch to"),
      date: z
        .string()
        .optional()
        .describe("Date to navigate to (YYYY-MM-DD format)"),
      today: z.coerce
        .boolean()
        .optional()
        .describe("Set to true to navigate to today's date"),
    },
    outputSchema: {
      success: z.boolean().describe("Whether navigation was initiated"),
      message: z.string().describe("Human-readable result message"),
      navigatingTo: z
        .object({
          view: z.string().optional(),
          date: z.string(),
        })
        .describe("Where the calendar is navigating to"),
    },
    annotations: {
      readOnlyHint: false,
      idempotentHint: true,
      destructiveHint: false,
    },
    handler: async ({ view, date, today }) => {
      let targetDate = selectedDate;

      // Handle date changes (these don't cause unmount)
      if (today) {
        targetDate = new Date();
        setSelectedDate(targetDate);
      } else if (date) {
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
          throw new Error(`Invalid date format: "${date}". Use YYYY-MM-DD format.`);
        }
        targetDate = parsedDate;
        setSelectedDate(targetDate);
      }

      const currentView = pathname?.replace("-view", "").replace("/", "") || "month";
      const targetView = view || currentView;

      // Schedule navigation AFTER returning the response
      // This allows the tool to return successfully before the component unmounts
      if (view && view !== currentView) {
        setTimeout(() => {
          router.push(VIEW_ROUTES[view]);
        }, 50);
      }

      return {
        success: true,
        message: view && view !== currentView
          ? `Navigating to ${targetView} view for ${targetDate.toDateString()}. The view will update shortly.`
          : `Selected date: ${targetDate.toDateString()}`,
        navigatingTo: {
          view: targetView,
          date: targetDate.toISOString(),
        },
      };
    },
  });
}
