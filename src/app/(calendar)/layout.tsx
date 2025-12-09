"use client";

import { LegitCalendarProvider } from "@/legit-webmcp";
import { CalendarMCPTools } from "@/calendar/mcp-tools/CalendarMCPTools";
import { AgentPreviewProvider } from "@/calendar/contexts/agent-preview-context";
import { AgentPreviewBanner } from "@/calendar/components/agent-preview-banner";
import { ActivityFeedProvider } from "@/calendar/contexts/activity-feed-context";
import { ActivityFeed, ActivityFeedTrigger } from "@/calendar/components/activity-feed";
import { DemoControls } from "@/calendar/components/demo-controls";
import { BottomPanel } from "@/calendar/components/bottom-panel";

// New version control components
import {
  StatusBar,
  GitPanel,
  GitPanelTrigger,
} from "@/calendar/components/version-control";
import { useLegitContext, useLegitFile } from "@legit-sdk/react/server";
import { useEffect, useState, useCallback, useRef } from "react";
import { getEvents, getUsers } from "@/calendar/requests";
import type { IEvent, IUser } from "@/calendar/interfaces";

export default function Layout({ children }: { children: React.ReactNode }) {
  // Use Legit files for persistent state with version history
  const {
    data: eventsData,
    setData: setEventsData,
    history,
  } = useLegitFile("/calendar/events.json", { initialData: "[]" });
  const { data: usersData, setData: setUsersData } = useLegitFile(
    "/calendar/users.json",
    { initialData: "[]" }
  );
  const { rollback, legitFs, head } = useLegitContext();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isGitPanelOpen, setIsGitPanelOpen] = useState(false);

  // Track if seeding is in progress to prevent double-seeding
  const seedingRef = useRef(false);

  // Parse data
  const events: IEvent[] = eventsData ? JSON.parse(eventsData) : [];
  const users: IUser[] = usersData ? JSON.parse(usersData) : [];

  // Seed initial data - memoized to prevent recreation
  const seedData = useCallback(async () => {
    if (seedingRef.current) return; // Prevent double-seeding
    seedingRef.current = true;

    try {
      const initialEvents = await getEvents();
      const initialUsers = await getUsers();
      await setEventsData(JSON.stringify(initialEvents, null, 2));
      await setUsersData(JSON.stringify(initialUsers, null, 2));
    } finally {
      setIsInitialized(true);
    }
  }, [setEventsData, setUsersData]);

  useEffect(() => {
    if (!eventsData || !usersData) return;
    if (!isInitialized && events.length === 0 && !seedingRef.current) {
      seedData();
    } else if (!isInitialized) {
      setIsInitialized(true);
    }
  }, [eventsData, usersData, isInitialized, events.length, seedData]);

  const isLoading = !isInitialized || users.length === 0;

  // Always render the providers and MCP tools, just hide content visually while loading
  // This prevents MCP tools from unregistering/reregistering on state changes
  return (
    <LegitCalendarProvider initialEvents={events} initialUsers={users}>
      <ActivityFeedProvider>
        <AgentPreviewProvider>
          {/* Register MCP tools - always mounted to prevent unregister/reregister cycles */}
          <CalendarMCPTools />

          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="text-center">
                <div className="mb-2 text-lg">Loading Calendar...</div>
                <div className="text-sm text-gray-500">
                  Initializing versioned state
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Agent preview banner - shows when previewing agent changes */}
              <AgentPreviewBanner />

              {/* Activity feed panel */}
              <ActivityFeed />

              {/* Git panel - full version control sidebar */}
              <GitPanel
                isOpen={isGitPanelOpen}
                onClose={() => setIsGitPanelOpen(false)}
              />

              {/* Demo controls */}
              <DemoControls />

              <div className="mx-auto flex max-w-screen-2xl flex-col gap-4 px-8 py-4">
                {/* Status bar with branch switcher and version control */}
                <StatusBar />

                {/* Action bar with activity feed and git panel triggers */}
                <div className="flex items-center justify-end gap-2">
                  <GitPanelTrigger
                    onClick={() => setIsGitPanelOpen(!isGitPanelOpen)}
                    isOpen={isGitPanelOpen}
                  />
                  <ActivityFeedTrigger />
                </div>

                {children}

                {/* Integrated bottom panel with Time Travel and Settings */}
                <BottomPanel history={history || []} onRollback={rollback} />
              </div>
            </>
          )}
        </AgentPreviewProvider>
      </ActivityFeedProvider>
    </LegitCalendarProvider>
  );
}
