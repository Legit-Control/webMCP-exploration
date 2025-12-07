"use client";

import { useState } from "react";
import { Bot, Play, Users, Zap, RotateCcw } from "lucide-react";
import { useMultiAgentCoordination } from "@/legit-webmcp";
import { useCalendar } from "@/calendar/contexts/calendar-context";
import { useActivityFeed } from "@/calendar/contexts/activity-feed-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { IEvent } from "@/calendar/interfaces";
import { addDays, format, setHours, setMinutes } from "date-fns";

/**
 * Demo control panel for showcasing multi-agent capabilities
 */
export function DemoControls() {
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const { createAgentSession, activeSessions, mergeAgentChanges, getAgentPreview } = useMultiAgentCoordination();
  const { events, setLocalEvents, users, selectedDate } = useCalendar();
  const { addActivity } = useActivityFeed();

  // Create a demo event for an agent
  const createDemoEvent = (
    title: string,
    dayOffset: number,
    hour: number,
    durationMinutes: number,
    color: string
  ): IEvent => {
    const startDate = setMinutes(setHours(addDays(selectedDate, dayOffset), hour), 0);
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

    return {
      id: Date.now() + Math.random() * 1000,
      title,
      description: "AI-scheduled meeting",
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      color: color as IEvent["color"],
      user: users[0] || { id: "1", name: "User", picturePath: null },
    };
  };

  // Demo Scenario 1: Single agent schedules meetings
  const runSingleAgentDemo = async () => {
    setIsRunning(true);
    addActivity({
      type: "branch_created",
      agentName: "Claude Scheduler",
      description: "Starting single-agent demo...",
    });

    try {
      // Create agent sandbox
      await createAgentSession("scheduler", "claude");

      addActivity({
        type: "event_created",
        agentName: "scheduler",
        description: "Scheduling team standup...",
        status: "pending",
      });

      // Simulate agent adding events
      await new Promise((r) => setTimeout(r, 500));

      const events = [
        createDemoEvent("Team Standup", 1, 9, 30, "blue"),
        createDemoEvent("Sprint Planning", 2, 10, 60, "green"),
        createDemoEvent("1:1 with Manager", 3, 14, 30, "purple"),
      ];

      // Add events to the agent's branch (they're already on it after createAgentSession)
      setLocalEvents((prev) => [...prev, ...events]);

      addActivity({
        type: "event_created",
        agentName: "scheduler",
        description: `Created ${events.length} meetings for the week`,
        status: "success",
      });

    } catch (error) {
      addActivity({
        type: "tool_result",
        agentName: "scheduler",
        description: `Demo failed: ${error}`,
        status: "error",
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Demo Scenario 2: Two agents with conflicting changes
  const runConflictDemo = async () => {
    setIsRunning(true);
    addActivity({
      type: "branch_created",
      description: "Starting multi-agent conflict demo...",
    });

    try {
      // Create first agent
      await createAgentSession("alice-assistant", "claude");

      addActivity({
        type: "event_created",
        agentName: "alice-assistant",
        description: "Alice's assistant scheduling meetings...",
        status: "pending",
      });

      await new Promise((r) => setTimeout(r, 300));

      // Alice's agent adds events
      const aliceEvents = [
        createDemoEvent("Alice: Client Call", 1, 14, 60, "blue"),
        createDemoEvent("Alice: Team Sync", 2, 10, 30, "green"),
      ];
      setLocalEvents((prev) => [...prev, ...aliceEvents]);

      addActivity({
        type: "event_created",
        agentName: "alice-assistant",
        description: "Created 2 meetings for Alice",
        status: "success",
      });

      // Create second agent
      await createAgentSession("bob-assistant", "gpt4");

      addActivity({
        type: "event_created",
        agentName: "bob-assistant",
        description: "Bob's assistant scheduling meetings...",
        status: "pending",
      });

      await new Promise((r) => setTimeout(r, 300));

      // Bob's agent adds events (one conflicts!)
      const bobEvents = [
        createDemoEvent("Bob: Strategy Meeting", 1, 14, 90, "orange"), // Conflicts with Alice!
        createDemoEvent("Bob: Review", 3, 11, 45, "purple"),
      ];
      setLocalEvents((prev) => [...prev, ...bobEvents]);

      addActivity({
        type: "event_created",
        agentName: "bob-assistant",
        description: "Created 2 meetings for Bob (potential conflict on Tuesday!)",
        status: "success",
      });

      addActivity({
        type: "changes_previewed",
        description: "Two agents have pending changes. Review them using the preview feature!",
      });

    } catch (error) {
      addActivity({
        type: "tool_result",
        description: `Demo failed: ${error}`,
        status: "error",
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Reset demo state
  const resetDemo = () => {
    // Clear localStorage sessions
    localStorage.removeItem("legit-agent-sessions");
    // Reload to get fresh state
    window.location.reload();
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 gap-2 shadow-lg"
      >
        <Zap className="size-4" />
        Demo Controls
      </Button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <Zap className="size-4 text-amber-500" />
          <h3 className="font-semibold">Demo Controls</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(false)}
          className="h-8 w-8 p-0"
        >
          ×
        </Button>
      </div>

      {/* Content */}
      <div className="space-y-4 p-4">
        {/* Active agents */}
        {activeSessions.length > 0 && (
          <div className="rounded-lg bg-purple-50 p-3 dark:bg-purple-950/30">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-purple-700 dark:text-purple-300">
              <Users className="size-4" />
              Active Agents: {activeSessions.length}
            </div>
            <div className="space-y-1">
              {activeSessions.map((session) => (
                <div
                  key={session.agentId}
                  className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400"
                >
                  <Bot className="size-3" />
                  {session.agentId} ({session.modelName})
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Demo scenarios */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase">Demo Scenarios</p>

          <Button
            variant="outline"
            size="sm"
            onClick={runSingleAgentDemo}
            disabled={isRunning}
            className="w-full justify-start gap-2"
          >
            <Bot className={cn("size-4", isRunning && "animate-pulse")} />
            Single Agent: Schedule Week
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={runConflictDemo}
            disabled={isRunning}
            className="w-full justify-start gap-2"
          >
            <Users className={cn("size-4", isRunning && "animate-pulse")} />
            Multi-Agent: Conflict Demo
          </Button>
        </div>

        {/* Reset */}
        <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetDemo}
            className="w-full justify-start gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950"
          >
            <RotateCcw className="size-4" />
            Reset Demo
          </Button>
        </div>

        {/* Tips */}
        <p className="text-xs text-gray-500">
          After running a demo, use the Activity feed to see what happened, and the Preview feature to review changes.
        </p>
      </div>
    </div>
  );
}
