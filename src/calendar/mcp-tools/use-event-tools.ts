"use client";

import { useWebMCP } from "@mcp-b/react-webmcp";
import { z } from "zod";
import { useCalendar } from "@/calendar/contexts/calendar-context";
import type { IEvent } from "@/calendar/interfaces";
import type { TEventColor } from "@/calendar/types";

export function useEventTools() {
  const { events, setLocalEvents, users } = useCalendar();

  // Tool: List events
  useWebMCP({
    name: "calendar_list_events",
    description:
      "List all calendar events, optionally filtered by date range or user",
    inputSchema: {
      startDate: z
        .string()
        .optional()
        .describe("Filter events starting from this date (ISO format)"),
      endDate: z
        .string()
        .optional()
        .describe("Filter events ending before this date (ISO format)"),
      userId: z.string().optional().describe("Filter events by user ID"),
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

  // Tool: Get event details
  useWebMCP({
    name: "calendar_get_event",
    description: "Get detailed information about a specific event by ID",
    inputSchema: {
      eventId: z.number().describe("The ID of the event to retrieve"),
    },
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
    },
    handler: async ({ eventId }) => {
      const event = events.find((e) => e.id === eventId);
      if (!event) {
        throw new Error(`Event with ID ${eventId} not found`);
      }
      return { event };
    },
  });

  // Tool: Create event
  useWebMCP({
    name: "calendar_create_event",
    description: "Create a new calendar event",
    inputSchema: {
      title: z.string().min(1).describe("Event title"),
      description: z.string().describe("Event description"),
      startDate: z.string().describe("Start date and time in ISO format"),
      endDate: z.string().describe("End date and time in ISO format"),
      color: z
        .enum(["blue", "green", "red", "yellow", "purple", "orange", "gray"])
        .describe("Event color"),
      userId: z
        .string()
        .describe("ID of the user responsible for this event"),
    },
    annotations: {
      readOnlyHint: false,
      idempotentHint: false,
      destructiveHint: false,
    },
    handler: async ({ title, description, startDate, endDate, color, userId }) => {
      const user = users.find((u) => u.id === userId);
      if (!user) {
        throw new Error(
          `User with ID ${userId} not found. Available users: ${users.map((u) => `${u.name} (${u.id})`).join(", ")}`
        );
      }

      const newEvent: IEvent = {
        id: Date.now(),
        title,
        description,
        startDate,
        endDate,
        color: color as TEventColor,
        user,
      };

      setLocalEvents((prev) => [...prev, newEvent]);

      return {
        success: true,
        message: `Event "${title}" created successfully`,
        event: newEvent,
      };
    },
  });

  // Tool: Update event
  useWebMCP({
    name: "calendar_update_event",
    description: "Update an existing calendar event",
    inputSchema: {
      eventId: z.number().describe("The ID of the event to update"),
      title: z.string().optional().describe("New event title"),
      description: z.string().optional().describe("New event description"),
      startDate: z
        .string()
        .optional()
        .describe("New start date and time in ISO format"),
      endDate: z
        .string()
        .optional()
        .describe("New end date and time in ISO format"),
      color: z
        .enum(["blue", "green", "red", "yellow", "purple", "orange", "gray"])
        .optional()
        .describe("New event color"),
      userId: z.string().optional().describe("New user ID"),
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

      return {
        success: true,
        message: `Event "${updatedEvent.title}" updated successfully`,
        event: updatedEvent,
      };
    },
  });

  // Tool: Delete event
  useWebMCP({
    name: "calendar_delete_event",
    description: "Delete a calendar event by ID",
    inputSchema: {
      eventId: z.number().describe("The ID of the event to delete"),
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

      setLocalEvents((prev) => prev.filter((e) => e.id !== eventId));

      return {
        success: true,
        message: `Event "${event.title}" deleted successfully`,
        deletedEventId: eventId,
      };
    },
  });
}
