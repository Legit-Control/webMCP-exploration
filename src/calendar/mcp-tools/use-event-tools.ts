"use client";

import { useWebMCP } from "@mcp-b/react-webmcp";
import { z } from "zod";
import { useCalendar } from "@/calendar/contexts/calendar-context";
import type { IEvent } from "@/calendar/interfaces";
import type { TEventColor } from "@/calendar/types";
import { format, parseISO } from "date-fns";

/**
 * MCP tools for basic event CRUD operations.
 *
 * These tools work on the current branch (main or agent sandbox).
 * When an agent is in a sandbox, changes are isolated until committed.
 *
 * ## Registered Tools
 *
 * - `calendar_list_events` - Query events with optional filters
 * - `calendar_update_event` - Modify an existing event's properties
 * - `calendar_delete_event` - Remove an event by ID
 *
 * @example
 * ```tsx
 * function CalendarMCPTools() {
 *   useEventTools();
 *   // Tools are now registered and available to AI agents
 * }
 * ```
 */
export function useEventTools(): void {
  const { events, setLocalEvents, users } = useCalendar();

  // Tool: List events
  useWebMCP({
    name: "calendar_list_events",
    description: `List all calendar events, optionally filtered by date range or user.

Returns event IDs needed for update/delete operations.
Shows events from the current branch (main or agent sandbox).`,
    inputSchema: {
      startDate: z
        .string()
        .optional()
        .describe("Filter events starting from this date (YYYY-MM-DD)"),
      endDate: z
        .string()
        .optional()
        .describe("Filter events ending before this date (YYYY-MM-DD)"),
      userId: z.string().optional().describe("Filter events by user ID"),
    },
    outputSchema: {
      events: z
        .array(
          z.object({
            id: z.number(),
            title: z.string(),
            startDate: z.string(),
            endDate: z.string(),
            color: z.string(),
            user: z.string(),
            description: z.string().optional(),
          })
        )
        .describe("List of events"),
      count: z.number().describe("Total number of events returned"),
    },
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
    },
    handler: async ({ startDate, endDate, userId }) => {
      let filteredEvents = [...events];

      if (startDate) {
        const start = new Date(startDate);
        filteredEvents = filteredEvents.filter(
          (e) => new Date(e.endDate) >= start
        );
      }

      if (endDate) {
        const end = new Date(endDate);
        filteredEvents = filteredEvents.filter(
          (e) => new Date(e.startDate) <= end
        );
      }

      if (userId) {
        filteredEvents = filteredEvents.filter((e) => e.user.id === userId);
      }

      return {
        events: filteredEvents.map((e) => ({
          id: e.id,
          title: e.title,
          startDate: e.startDate,
          endDate: e.endDate,
          color: e.color,
          user: e.user.name,
          description: e.description,
        })),
        count: filteredEvents.length,
      };
    },
  });

  // Tool: Update event
  useWebMCP({
    name: "calendar_update_event",
    description: `Update an existing calendar event. Provide only the fields you want to change.

Changes are made on the current branch. Use calendar_commit_changes to save to main.`,
    inputSchema: {
      eventId: z.coerce.number().describe("The ID of the event to update"),
      title: z.string().optional().describe("New event title"),
      description: z.string().optional().describe("New event description"),
      startDate: z
        .string()
        .optional()
        .describe("New start date/time (ISO format or 'YYYY-MM-DDTHH:MM')"),
      endDate: z
        .string()
        .optional()
        .describe("New end date/time (ISO format or 'YYYY-MM-DDTHH:MM')"),
      color: z
        .enum(["blue", "green", "red", "yellow", "purple", "orange", "gray"])
        .optional()
        .describe("New event color"),
      userId: z.string().optional().describe("New user ID"),
    },
    outputSchema: {
      success: z.boolean().describe("Whether the update succeeded"),
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
        .describe("The updated event"),
    },
    annotations: {
      readOnlyHint: false,
      idempotentHint: true,
      destructiveHint: false,
    },
    handler: async ({ eventId, ...updates }) => {
      const eventIndex = events.findIndex((e) => e.id === eventId);
      if (eventIndex === -1) {
        throw new Error(`Event with ID ${eventId} not found`);
      }

      const existingEvent = events[eventIndex];
      let updatedUser = existingEvent.user;

      if (updates.userId) {
        const user = users.find((u) => u.id === updates.userId);
        if (!user) {
          throw new Error(`User with ID ${updates.userId} not found`);
        }
        updatedUser = user;
      }

      const updatedEvent: IEvent = {
        ...existingEvent,
        ...(updates.title && { title: updates.title }),
        ...(updates.description && { description: updates.description }),
        ...(updates.startDate && { startDate: updates.startDate }),
        ...(updates.endDate && { endDate: updates.endDate }),
        ...(updates.color && { color: updates.color as TEventColor }),
        user: updatedUser,
      };

      setLocalEvents((prev) => {
        const newEvents = [...prev];
        const idx = newEvents.findIndex((e) => e.id === eventId);
        if (idx !== -1) {
          newEvents[idx] = updatedEvent;
        }
        return newEvents;
      });

      const eventDate = parseISO(updatedEvent.startDate);

      return {
        success: true,
        message: `Event "${updatedEvent.title}" updated on ${format(eventDate, "MMM d")}.`,
        event: {
          id: updatedEvent.id,
          title: updatedEvent.title,
          startDate: updatedEvent.startDate,
          endDate: updatedEvent.endDate,
          color: updatedEvent.color,
          user: updatedEvent.user.name,
        },
      };
    },
  });

  // Tool: Delete event
  useWebMCP({
    name: "calendar_delete_event",
    description: `Delete a calendar event by ID.

Changes are made on the current branch. Use calendar_commit_changes to save to main.`,
    inputSchema: {
      eventId: z.coerce.number().describe("The ID of the event to delete"),
    },
    outputSchema: {
      success: z.boolean().describe("Whether the deletion succeeded"),
      message: z.string().describe("Human-readable result message"),
      deletedEvent: z
        .object({
          id: z.number(),
          title: z.string(),
          wasScheduledFor: z.string(),
        })
        .describe("Information about the deleted event"),
    },
    annotations: {
      readOnlyHint: false,
      idempotentHint: true,
      destructiveHint: true,
    },
    handler: async ({ eventId }) => {
      const event = events.find((e) => e.id === eventId);
      if (!event) {
        throw new Error(`Event with ID ${eventId} not found`);
      }

      const eventDate = parseISO(event.startDate);

      setLocalEvents((prev) => prev.filter((e) => e.id !== eventId));

      return {
        success: true,
        message: `Event "${event.title}" deleted.`,
        deletedEvent: {
          id: eventId,
          title: event.title,
          wasScheduledFor: format(eventDate, "EEEE, MMMM d 'at' h:mm a"),
        },
      };
    },
  });
}
