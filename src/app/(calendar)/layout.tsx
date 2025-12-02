/* eslint-disable @typescript-eslint/ban-ts-comment */
"use client";

import { Settings } from "lucide-react";

import { CalendarProvider } from "@/calendar/contexts/calendar-context";
import { CalendarMCPTools } from "@/calendar/mcp-tools/CalendarMCPTools";

import { ChangeBadgeVariantInput } from "@/calendar/components/change-badge-variant-input";
import { ChangeVisibleHoursInput } from "@/calendar/components/change-visible-hours-input";
import { ChangeWorkingHoursInput } from "@/calendar/components/change-working-hours-input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useLegitContext, useLegitFile } from "@legit-sdk/react";
import { useEffect, useState } from "react";
import { getEvents, getUsers } from "@/calendar/requests";
import type { IEvent, IUser } from "@/calendar/interfaces";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { data: events, setData: setEvents, history } = useLegitFile("/events.json", { initialData: "[]" });
  const { data: users, setData: setUsers } = useLegitFile("/users.json", { initialData: "[]" });
  const { rollback } = useLegitContext();
  const [isInitialized, setIsInitialized] = useState(false);

  const seedData = async () => {
    await setEvents(JSON.stringify(await getEvents()));
    await setUsers(JSON.stringify(await getUsers()));
    setIsInitialized(true);
  };

  useEffect(() => {
    if (!events || !users) return;
    if (!isInitialized) {
      seedData();
    }
  }, [events, users, isInitialized]);

  const newTestEvent = {
    id: 6,
    startDate: "2025-12-02T18:49:51.377Z",
    endDate: "2025-12-02T20:49:51.377Z",
    title: "Test event",
    color: "blue",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    user: {
      id: "dd503cf9-6c38-43cf-94cc-0d4032e2f77a",
      name: "Leonardo Ramos",
      picturePath: null,
    },
  };

  const addNewTestEvent = () => {
    setEvents(JSON.stringify([...(JSON.parse(events || "[]") as IEvent[]), newTestEvent]));
  };

  const rollbackLastCommit = () => {
    const lastCommit = history[1]; // get one commit before the current one
    rollback(lastCommit.oid);
  };

  useEffect(() => {
    // @ts-ignore
    window.addNewTestEvent = addNewTestEvent;
    // @ts-ignore
    window.rollbackLastCommit = rollbackLastCommit;
  }, [addNewTestEvent, rollbackLastCommit]);

  return (
    <>
      {users && users.length > 0 && events && events.length > 0 ? (
        <CalendarProvider users={JSON.parse(users || "[]") as IUser[]} events={JSON.parse(events || "[]") as IEvent[]}>
          {/* Register MCP tools - must be inside CalendarProvider */}
          <CalendarMCPTools />
          <div className="mx-auto flex max-w-screen-2xl flex-col gap-4 px-8 py-4">
            {children}

            <Accordion type="single" collapsible>
              <AccordionItem value="item-1" className="border-none">
                <AccordionTrigger className="flex-none gap-2 py-0 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Settings className="size-4" />
                    <p className="text-base font-semibold">Calendar settings</p>
                  </div>
                </AccordionTrigger>

                <AccordionContent>
                  <div className="mt-4 flex flex-col gap-6">
                    <ChangeBadgeVariantInput />
                    <ChangeVisibleHoursInput />
                    <ChangeWorkingHoursInput />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </CalendarProvider>
      ) : (
        <div>Loading...</div>
      )}
    </>
  );
}
