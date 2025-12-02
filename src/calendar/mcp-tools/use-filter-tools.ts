"use client";

import { useWebMCP } from "@mcp-b/react-webmcp";
import { z } from "zod";
import { useCalendar } from "@/calendar/contexts/calendar-context";

export function useFilterTools() {
  const { users, selectedUserId, setSelectedUserId } = useCalendar();

  // Tool: List available users
  useWebMCP({
    name: "calendar_list_users",
    description: "List all users available for filtering events",
    inputSchema: {},
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
    },
    handler: async () => {
      return {
        users: users.map((u) => ({
          id: u.id,
          name: u.name,
          hasPicture: !!u.picturePath,
        })),
        count: users.length,
        currentFilter: selectedUserId,
      };
    },
  });

  // Tool: Filter events by user
  useWebMCP({
    name: "calendar_filter_by_user",
    description:
      "Filter calendar events to show only events for a specific user, or show all users",
    inputSchema: {
      userId: z
        .string()
        .describe("User ID to filter by, or 'all' to show all users"),
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
            `User with ID ${userId} not found. Available users: ${users.map((u) => `${u.name} (${u.id})`).join(", ")}`
          );
        }
      }

      setSelectedUserId(userId);

      return {
        success: true,
        message:
          userId === "all"
            ? "Now showing events for all users"
            : `Now filtering events for user ${users.find((u) => u.id === userId)?.name}`,
        currentFilter: userId,
      };
    },
  });

  // Tool: Get current filter
  useWebMCP({
    name: "calendar_get_current_filter",
    description: "Get the current user filter being applied to the calendar",
    inputSchema: {},
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
    },
    handler: async () => {
      const currentUser =
        selectedUserId === "all"
          ? null
          : users.find((u) => u.id === selectedUserId);

      return {
        currentFilter: selectedUserId,
        currentUserName: currentUser?.name || "All Users",
        isFilteringByUser: selectedUserId !== "all",
      };
    },
  });
}
