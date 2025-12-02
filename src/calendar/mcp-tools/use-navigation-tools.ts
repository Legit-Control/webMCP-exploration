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

export function useNavigationTools() {
  const router = useRouter();
  const pathname = usePathname();
  const { selectedDate, setSelectedDate } = useCalendar();

  // Tool: Switch calendar view
  useWebMCP({
    name: "calendar_switch_view",
    description:
      "Switch to a different calendar view (day, week, month, year, or agenda)",
    inputSchema: {
      view: z
        .enum(["day", "week", "month", "year", "agenda"])
        .describe("The calendar view to switch to"),
    },
    annotations: {
      readOnlyHint: false,
      idempotentHint: true,
      destructiveHint: false,
    },
    handler: async ({ view }) => {
      router.push(VIEW_ROUTES[view as TCalendarView]);

      return {
        success: true,
        message: `Switched to ${view} view`,
        currentView: view,
      };
    },
  });

  // Tool: Get current view
  useWebMCP({
    name: "calendar_get_current_view",
    description: "Get the current calendar view being displayed",
    inputSchema: {},
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
    },
    handler: async () => {
      const viewFromPath =
        pathname?.replace("-view", "").replace("/", "") || "month";
      return {
        currentView: viewFromPath,
        selectedDate: selectedDate.toISOString(),
      };
    },
  });

  // Tool: Navigate to specific date
  useWebMCP({
    name: "calendar_navigate_to_date",
    description: "Navigate the calendar to a specific date",
    inputSchema: {
      date: z
        .string()
        .describe("ISO date string or natural date like '2025-01-15'"),
    },
    annotations: {
      readOnlyHint: false,
      idempotentHint: true,
      destructiveHint: false,
    },
    handler: async ({ date }) => {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        throw new Error("Invalid date format");
      }
      setSelectedDate(parsedDate);
      return {
        success: true,
        message: `Navigated to ${parsedDate.toDateString()}`,
        selectedDate: parsedDate.toISOString(),
      };
    },
  });

  // Tool: Navigate to today
  useWebMCP({
    name: "calendar_go_to_today",
    description: "Navigate the calendar to today's date",
    inputSchema: {},
    annotations: {
      readOnlyHint: false,
      idempotentHint: true,
      destructiveHint: false,
    },
    handler: async () => {
      const today = new Date();
      setSelectedDate(today);
      return {
        success: true,
        message: "Navigated to today",
        selectedDate: today.toISOString(),
      };
    },
  });
}
