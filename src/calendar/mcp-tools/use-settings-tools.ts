"use client";

import { useWebMCP } from "@mcp-b/react-webmcp";
import { z } from "zod";
import { useCalendar } from "@/calendar/contexts/calendar-context";
import type { TBadgeVariant, TVisibleHours } from "@/calendar/types";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function useSettingsTools() {
  const {
    badgeVariant,
    setBadgeVariant,
    visibleHours,
    setVisibleHours,
    workingHours,
    setWorkingHours,
  } = useCalendar();

  // Tool: Get display settings
  useWebMCP({
    name: "calendar_get_settings",
    description:
      "Get current calendar display settings including badge variant, visible hours, and working hours",
    inputSchema: {},
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
    },
    handler: async () => {
      return {
        badgeVariant,
        visibleHours,
        workingHours,
      };
    },
  });

  // Tool: Change badge variant
  useWebMCP({
    name: "calendar_set_badge_variant",
    description:
      "Change how event badges are displayed in the calendar (dot, colored, or mixed)",
    inputSchema: {
      variant: z
        .enum(["dot", "colored", "mixed"])
        .describe(
          "Badge display style: 'dot' shows small dots, 'colored' shows full colored badges, 'mixed' combines both"
        ),
    },
    annotations: {
      readOnlyHint: false,
      idempotentHint: true,
      destructiveHint: false,
    },
    handler: async ({ variant }) => {
      setBadgeVariant(variant as TBadgeVariant);
      return {
        success: true,
        message: `Badge variant changed to "${variant}"`,
        currentVariant: variant,
      };
    },
  });

  // Tool: Set visible hours
  useWebMCP({
    name: "calendar_set_visible_hours",
    description: "Set the range of hours visible in day and week views",
    inputSchema: {
      from: z.number().min(0).max(23).describe("Start hour (0-23)"),
      to: z.number().min(1).max(24).describe("End hour (1-24)"),
    },
    annotations: {
      readOnlyHint: false,
      idempotentHint: true,
      destructiveHint: false,
    },
    handler: async ({ from, to }) => {
      if (from >= to) {
        throw new Error("Start hour must be before end hour");
      }

      const newVisibleHours: TVisibleHours = { from, to };
      setVisibleHours(newVisibleHours);

      return {
        success: true,
        message: `Visible hours set to ${from}:00 - ${to}:00`,
        visibleHours: newVisibleHours,
      };
    },
  });

  // Tool: Set working hours for a day
  useWebMCP({
    name: "calendar_set_working_hours",
    description:
      "Set working hours for a specific day of the week (affects visual styling in week/day views)",
    inputSchema: {
      dayOfWeek: z
        .number()
        .min(0)
        .max(6)
        .describe("Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)"),
      from: z
        .number()
        .min(0)
        .max(23)
        .describe("Work start hour (0-23), or 0 if not a working day"),
      to: z
        .number()
        .min(0)
        .max(24)
        .describe("Work end hour (0-24), or 0 if not a working day"),
    },
    annotations: {
      readOnlyHint: false,
      idempotentHint: true,
      destructiveHint: false,
    },
    handler: async ({ dayOfWeek, from, to }) => {
      setWorkingHours((prev) => ({
        ...prev,
        [dayOfWeek]: { from, to },
      }));

      const isWorkingDay = from > 0 || to > 0;

      return {
        success: true,
        message: isWorkingDay
          ? `Working hours for ${DAY_NAMES[dayOfWeek]} set to ${from}:00 - ${to}:00`
          : `${DAY_NAMES[dayOfWeek]} marked as non-working day`,
        dayOfWeek,
        dayName: DAY_NAMES[dayOfWeek],
        workingHours: { from, to },
      };
    },
  });
}
