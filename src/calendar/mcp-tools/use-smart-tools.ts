"use client";

import { useWebMCP } from "@mcp-b/react-webmcp";
import { z } from "zod";
import { useCalendar } from "@/calendar/contexts/calendar-context";
import type { IEvent } from "@/calendar/interfaces";
import type { TEventColor } from "@/calendar/types";
import {
  format,
  startOfDay,
  endOfDay,
  addHours,
  parseISO,
  areIntervalsOverlapping,
} from "date-fns";

/**
 * MCP tools for high-level calendar operations.
 *
 * These tools provide smart operations like scheduling meetings and finding
 * free time slots. They work on the current branch (main or agent sandbox).
 *
 * ## Registered Tools
 *
 * - `calendar_schedule_meeting` - Create a new event with full details
 * - `calendar_find_free_time` - Find available time slots for scheduling
 *
 * @example
 * ```tsx
 * function CalendarMCPTools() {
 *   useSmartTools();
 *   // Tools are now registered and available to AI agents
 * }
 * ```
 */
export function useSmartTools(): void {
  const { events, setLocalEvents, users } = useCalendar();

  // Tool: Schedule a meeting - THE primary way to create events
  useWebMCP({
    name: "calendar_schedule_meeting",
    description: `Create a new calendar event. This is the PRIMARY way to create events.

Example: Schedule a 1-hour meeting tomorrow at 2pm:
{ "title": "Team Sync", "date": "2025-12-08", "startTime": "14:00", "durationMinutes": 60 }

After creating events, use calendar_commit_changes to save them to the main calendar,
or use calendar_show_preview to show the user what you've created.`,
    inputSchema: {
      title: z.string().min(1).describe("Meeting title"),
      description: z
        .string()
        .optional()
        .default("")
        .describe("Meeting description (optional)"),
      date: z.string().describe("Date of the meeting (YYYY-MM-DD format, e.g., '2025-12-08')"),
      startTime: z
        .string()
        .describe("Start time in 24h format (HH:MM, e.g., '14:00' for 2pm)"),
      durationMinutes: z.coerce
        .number()
        .default(60)
        .describe("Duration in minutes (default: 60)"),
      color: z
        .enum(["blue", "green", "red", "yellow", "purple", "orange", "gray"])
        .default("blue")
        .describe("Event color (default: blue)"),
      userId: z
        .string()
        .optional()
        .describe("User ID to assign (uses first user if not specified). Get IDs from calendar_get_state."),
    },
    outputSchema: {
      success: z.boolean().describe("Whether the event was created"),
      message: z.string().describe("Human-readable result message"),
      event: z
        .object({
          id: z.number(),
          title: z.string(),
          startDate: z.string(),
          endDate: z.string(),
          color: z.string(),
          user: z.string(),
        })
        .describe("The created event"),
      tip: z.string().optional().describe("Helpful next step"),
    },
    annotations: {
      readOnlyHint: false,
      idempotentHint: false,
      destructiveHint: false,
    },
    handler: async ({
      title,
      description,
      date,
      startTime,
      durationMinutes,
      color,
      userId,
    }) => {
      // Find user
      const user = userId
        ? users.find((u) => u.id === userId)
        : users[0];
      if (!user) {
        throw new Error(
          `User not found. Use calendar_get_state to see available users.`
        );
      }

      // Parse date and time
      const startDate = new Date(`${date}T${startTime}:00`);
      if (isNaN(startDate.getTime())) {
        throw new Error(`Invalid date/time: "${date}T${startTime}". Use YYYY-MM-DD and HH:MM format.`);
      }
      const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

      const newEvent: IEvent = {
        id: Date.now(),
        title,
        description: description || "",
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        color: color as TEventColor,
        user,
      };

      setLocalEvents((prev) => [...prev, newEvent]);

      return {
        success: true,
        message: `Created "${title}" on ${format(startDate, "EEEE, MMMM d, yyyy")} at ${format(startDate, "h:mm a")} for ${durationMinutes} minutes.`,
        event: {
          id: newEvent.id,
          title: newEvent.title,
          startDate: newEvent.startDate,
          endDate: newEvent.endDate,
          color: newEvent.color,
          user: newEvent.user.name,
        },
        tip: "Use calendar_show_preview to show users the new event, or calendar_commit_changes to save it.",
      };
    },
  });

  // Tool: Find free time slots - essential for scheduling
  useWebMCP({
    name: "calendar_find_free_time",
    description: `Find available time slots on a given day. Use this BEFORE scheduling to avoid conflicts.

Returns a list of free time slots that meet the minimum duration requirement.
Checks against all events on the current branch (main or agent sandbox).`,
    inputSchema: {
      date: z.string().describe("Date to check (YYYY-MM-DD format, e.g., '2025-12-08')"),
      durationMinutes: z.coerce
        .number()
        .default(60)
        .describe("Minimum duration needed in minutes (default: 60)"),
      workingHoursOnly: z.coerce
        .boolean()
        .default(true)
        .describe("Only show slots during working hours 9am-5pm (default: true)"),
      userId: z
        .string()
        .optional()
        .describe("Check availability for a specific user only"),
    },
    outputSchema: {
      date: z.string().describe("The date that was checked"),
      freeSlots: z
        .array(
          z.object({
            start: z.string().describe("Start time (HH:MM)"),
            end: z.string().describe("End time (HH:MM)"),
            durationMinutes: z.number().describe("Duration in minutes"),
          })
        )
        .describe("Available time slots"),
      totalFreeMinutes: z.number().describe("Total free time in minutes"),
      existingEventsCount: z.number().describe("Number of existing events on this day"),
      message: z.string().describe("Human-readable summary"),
    },
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
    },
    handler: async ({ date, durationMinutes, workingHoursOnly, userId }) => {
      const dayStart = startOfDay(parseISO(date));
      const dayEnd = endOfDay(parseISO(date));

      // Get events for this day
      let dayEvents = events.filter((e) => {
        const eventStart = parseISO(e.startDate);
        const eventEnd = parseISO(e.endDate);
        return areIntervalsOverlapping(
          { start: eventStart, end: eventEnd },
          { start: dayStart, end: dayEnd }
        );
      });

      // Filter by user if specified
      if (userId) {
        dayEvents = dayEvents.filter((e) => e.user.id === userId);
      }

      // Define time range to check
      const startHour = workingHoursOnly ? 9 : 0;
      const endHour = workingHoursOnly ? 17 : 24;

      const freeSlots: { start: string; end: string; durationMinutes: number }[] = [];

      // Check each hour slot
      for (let hour = startHour; hour < endHour; hour++) {
        const slotStart = addHours(dayStart, hour);
        const slotEnd = addHours(slotStart, 1);

        // Check if this slot conflicts with any event
        const hasConflict = dayEvents.some((e) => {
          const eventStart = parseISO(e.startDate);
          const eventEnd = parseISO(e.endDate);
          return areIntervalsOverlapping(
            { start: slotStart, end: slotEnd },
            { start: eventStart, end: eventEnd }
          );
        });

        if (!hasConflict) {
          // Try to extend the slot
          let extendedEnd = slotEnd;
          for (let nextHour = hour + 1; nextHour < endHour; nextHour++) {
            const nextSlotStart = addHours(dayStart, nextHour);
            const nextSlotEnd = addHours(nextSlotStart, 1);

            const nextHasConflict = dayEvents.some((e) => {
              const eventStart = parseISO(e.startDate);
              const eventEnd = parseISO(e.endDate);
              return areIntervalsOverlapping(
                { start: nextSlotStart, end: nextSlotEnd },
                { start: eventStart, end: eventEnd }
              );
            });

            if (nextHasConflict) break;
            extendedEnd = nextSlotEnd;
            hour = nextHour; // Skip checked hours
          }

          const slotDuration = (extendedEnd.getTime() - slotStart.getTime()) / 60000;

          if (slotDuration >= durationMinutes) {
            freeSlots.push({
              start: format(slotStart, "HH:mm"),
              end: format(extendedEnd, "HH:mm"),
              durationMinutes: slotDuration,
            });
          }
        }
      }

      return {
        date: format(dayStart, "EEEE, MMMM d, yyyy"),
        freeSlots,
        totalFreeMinutes: freeSlots.reduce((sum, s) => sum + s.durationMinutes, 0),
        existingEventsCount: dayEvents.length,
        message:
          freeSlots.length > 0
            ? `Found ${freeSlots.length} free slot(s) on ${format(dayStart, "MMM d")} with ${durationMinutes}+ minutes available.`
            : `No free slots of ${durationMinutes}+ minutes available on ${format(dayStart, "MMM d")}.`,
      };
    },
  });
}
