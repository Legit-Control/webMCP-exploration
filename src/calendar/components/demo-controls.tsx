"use client";

import { useState } from "react";
import {
  Bot,
  Users,
  Zap,
  RotateCcw,
  GitBranch,
  GitMerge,
  Eye,
  Play,
  CheckCircle2,
  Info,
} from "lucide-react";
import { useMultiAgentCoordination } from "@/legit-webmcp";
import { useCalendar } from "@/calendar/contexts/calendar-context";
import { useActivityFeed } from "@/calendar/contexts/activity-feed-context";
import { useAgentPreview } from "@/calendar/contexts/agent-preview-context";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { IEvent } from "@/calendar/interfaces";
import { addDays, setHours, setMinutes } from "date-fns";

/**
 * Enhanced Demo Control Panel
 * Showcases the Legit SDK + WebMCP integration with guided demos
 */
export function DemoControls() {
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<number | null>(null);

  const {
    createAgentSession,
    activeSessions,
    switchToMain,
    defaultBranch,
  } = useMultiAgentCoordination();
  const { setLocalEvents, users, selectedDate } = useCalendar();
  const { addActivity } = useActivityFeed();
  const { startPreview, isPreviewMode } = useAgentPreview();

  // Create a demo event for an agent
  const createDemoEvent = (
    title: string,
    dayOffset: number,
    hour: number,
    durationMinutes: number,
    color: string
  ): IEvent => {
    const startDate = setMinutes(
      setHours(addDays(selectedDate, dayOffset), hour),
      0
    );
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

  // Demo: Single Agent Sandbox Workflow
  const runSandboxDemo = async () => {
    setIsRunning(true);
    setCurrentStep(1);

    try {
      addActivity({
        type: "branch_created",
        agentName: "Claude Scheduler",
        description: "Creating isolated sandbox for AI agent...",
      });

      // Step 1: Create agent sandbox
      await createAgentSession("scheduler-demo", "claude");
      await new Promise((r) => setTimeout(r, 800));

      setCurrentStep(2);
      addActivity({
        type: "event_created",
        agentName: "scheduler-demo",
        description: "Agent is scheduling events in its sandbox...",
        status: "pending",
      });

      // Step 2: Add events
      await new Promise((r) => setTimeout(r, 600));
      const events = [
        createDemoEvent("Team Standup", 1, 9, 30, "blue"),
        createDemoEvent("Sprint Planning", 2, 10, 60, "green"),
        createDemoEvent("Code Review", 3, 14, 45, "purple"),
      ];
      setLocalEvents((prev) => [...prev, ...events]);

      setCurrentStep(3);
      addActivity({
        type: "event_created",
        agentName: "scheduler-demo",
        description: `Created ${events.length} meetings in sandbox`,
        status: "success",
      });

      await new Promise((r) => setTimeout(r, 500));

      // Step 3: Show preview
      setCurrentStep(4);
      addActivity({
        type: "changes_previewed",
        agentName: "scheduler-demo",
        description:
          "Changes ready for review! Open Version Control panel to see them.",
      });

      // Auto-preview if not already
      if (!isPreviewMode) {
        await startPreview("scheduler-demo");
      }
    } catch (error) {
      addActivity({
        type: "tool_result",
        description: `Demo failed: ${error}`,
        status: "error",
      });
    } finally {
      setIsRunning(false);
      setCurrentStep(null);
    }
  };

  // Demo: Multi-Agent Collaboration
  const runMultiAgentDemo = async () => {
    setIsRunning(true);
    setCurrentStep(1);

    try {
      // Agent 1
      addActivity({
        type: "branch_created",
        agentName: "Alice's Assistant",
        description: "Creating sandbox for Alice's assistant...",
      });
      await createAgentSession("alice-scheduler", "claude");
      await new Promise((r) => setTimeout(r, 500));

      const aliceEvents = [
        createDemoEvent("Alice: Client Call", 1, 10, 60, "blue"),
        createDemoEvent("Alice: Team Sync", 2, 14, 30, "green"),
      ];
      setLocalEvents((prev) => [...prev, ...aliceEvents]);

      addActivity({
        type: "event_created",
        agentName: "alice-scheduler",
        description: "Created 2 meetings for Alice",
        status: "success",
      });

      setCurrentStep(2);

      // Switch back to main, then create second agent
      await switchToMain();
      await new Promise((r) => setTimeout(r, 300));

      // Agent 2
      addActivity({
        type: "branch_created",
        agentName: "Bob's Assistant",
        description: "Creating sandbox for Bob's assistant...",
      });
      await createAgentSession("bob-scheduler", "gpt4");
      await new Promise((r) => setTimeout(r, 500));

      const bobEvents = [
        createDemoEvent("Bob: Strategy Meeting", 1, 11, 90, "orange"),
        createDemoEvent("Bob: 1:1 Review", 3, 15, 45, "purple"),
      ];
      setLocalEvents((prev) => [...prev, ...bobEvents]);

      addActivity({
        type: "event_created",
        agentName: "bob-scheduler",
        description: "Created 2 meetings for Bob",
        status: "success",
      });

      setCurrentStep(3);

      addActivity({
        type: "changes_previewed",
        description:
          "Both agents have pending changes. Use Version Control to review and merge each!",
      });
    } catch (error) {
      addActivity({
        type: "tool_result",
        description: `Demo failed: ${error}`,
        status: "error",
      });
    } finally {
      setIsRunning(false);
      setCurrentStep(null);
    }
  };

  // Reset demo state
  const resetDemo = () => {
    localStorage.removeItem("legit-agent-sessions");
    localStorage.removeItem("legit-commit-history");
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
        <Zap className="size-4 text-amber-500" />
        Demo
      </Button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 overflow-hidden rounded-lg border border-border bg-card shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Zap className="size-5 text-amber-500" />
          <div>
            <h3 className="font-semibold">Legit + WebMCP Demo</h3>
            <p className="text-xs text-muted-foreground">
              Git-like versioning for AI agents
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(false)}
          className="size-8 p-0"
        >
          ×
        </Button>
      </div>

      <ScrollArea className="max-h-[60vh]">
        <div className="space-y-4 p-4">
          {/* Info card */}
          <div className="rounded-lg border border-border bg-muted/50 p-3">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 size-4 shrink-0 text-foreground" />
              <div className="text-xs text-foreground">
                <p className="font-medium">What this demo shows:</p>
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-muted-foreground">
                  <li>AI agents work in isolated Git branches</li>
                  <li>Human reviews changes before they apply</li>
                  <li>Full history with rollback capability</li>
                  <li>Multi-agent collaboration without conflicts</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Active agents indicator */}
          {activeSessions.length > 0 && (
            <div className="rounded-lg bg-secondary p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-secondary-foreground">
                <Users className="size-4" />
                Active Agent Branches: {activeSessions.length}
              </div>
              <div className="space-y-1">
                {activeSessions.map((session) => (
                  <div
                    key={session.agentId}
                    className="flex items-center gap-2 text-xs"
                  >
                    <GitBranch className="size-3 text-foreground" />
                    <span className="font-mono text-foreground">
                      {session.agentId}
                    </span>
                    <span className="text-muted-foreground">({session.modelName})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Demo scenarios */}
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Interactive Demos
            </p>

            {/* Demo 1: Sandbox Workflow */}
            <div className="rounded-lg border border-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="size-4 text-foreground" />
                  <span className="font-medium text-sm">Sandbox Workflow</span>
                </div>
                <Button
                  size="sm"
                  onClick={runSandboxDemo}
                  disabled={isRunning}
                  className="h-7 gap-1 px-2 text-xs"
                >
                  {isRunning && currentStep ? (
                    <>
                      <Play className="size-3 animate-pulse" />
                      Step {currentStep}/4
                    </>
                  ) : (
                    <>
                      <Play className="size-3" />
                      Run
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Shows: Agent creates sandbox → makes changes → human reviews →
                merges to main
              </p>
              {currentStep && currentStep <= 4 && (
                <div className="mt-2 space-y-1">
                  <Step
                    num={1}
                    text="Create sandbox branch"
                    active={currentStep === 1}
                    done={currentStep > 1}
                  />
                  <Step
                    num={2}
                    text="Agent schedules meetings"
                    active={currentStep === 2}
                    done={currentStep > 2}
                  />
                  <Step
                    num={3}
                    text="Changes saved to branch"
                    active={currentStep === 3}
                    done={currentStep > 3}
                  />
                  <Step
                    num={4}
                    text="Preview for human review"
                    active={currentStep === 4}
                    done={false}
                  />
                </div>
              )}
            </div>

            {/* Demo 2: Multi-Agent */}
            <div className="rounded-lg border border-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-foreground" />
                  <span className="font-medium text-sm">Multi-Agent</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={runMultiAgentDemo}
                  disabled={isRunning}
                  className="h-7 gap-1 px-2 text-xs"
                >
                  <Play className="size-3" />
                  Run
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Shows: Two agents work independently on separate branches
              </p>
            </div>
          </div>

          {/* Instructions */}
          <div className="rounded-lg bg-muted p-3">
            <p className="mb-2 text-xs font-medium text-foreground">
              After running a demo:
            </p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <GitBranch className="size-3" />
                <span>Use the branch switcher to navigate</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="size-3" />
                <span>Preview changes with diff viewer</span>
              </div>
              <div className="flex items-center gap-2">
                <GitMerge className="size-3" />
                <span>Merge approved changes to main</span>
              </div>
            </div>
          </div>

          {/* Reset */}
          <Button
            variant="ghost"
            size="sm"
            onClick={resetDemo}
            className="w-full justify-start gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950"
          >
            <RotateCcw className="size-4" />
            Reset Demo (Clear All Branches)
          </Button>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-border bg-muted/50 px-4 py-2">
        <p className="text-center text-[10px] text-muted-foreground">
          Powered by Legit SDK + WebMCP
        </p>
      </div>
    </div>
  );
}

function Step({
  num,
  text,
  active,
  done,
}: {
  num: number;
  text: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 text-xs",
        active && "text-foreground font-medium",
        done && "text-green-600",
        !active && !done && "text-muted-foreground"
      )}
    >
      {done ? (
        <CheckCircle2 className="size-3" />
      ) : (
        <span
          className={cn(
            "flex size-4 items-center justify-center rounded-full text-[10px]",
            active
              ? "bg-secondary text-secondary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {num}
        </span>
      )}
      <span>{text}</span>
    </div>
  );
}
