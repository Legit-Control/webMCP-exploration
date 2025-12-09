"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useLegitContext, useLegitFile } from "@legit-sdk/react/server";
import type { HistoryItem } from "@legit-sdk/core";
import type { IEvent, IUser } from "@/calendar/interfaces";
import type {
  TBadgeVariant,
  TVisibleHours,
  TWorkingHours,
} from "@/calendar/types";
import type { Dispatch, SetStateAction } from "react";

/**
 * Calendar settings stored in Legit
 */
interface CalendarSettings {
  badgeVariant: TBadgeVariant;
  visibleHours: TVisibleHours;
  workingHours: TWorkingHours;
}

/**
 * Default settings
 */
const DEFAULT_SETTINGS: CalendarSettings = {
  badgeVariant: "colored",
  visibleHours: { from: 7, to: 18 },
  workingHours: {
    0: { from: 0, to: 0 },
    1: { from: 8, to: 17 },
    2: { from: 8, to: 17 },
    3: { from: 8, to: 17 },
    4: { from: 8, to: 17 },
    5: { from: 8, to: 17 },
    6: { from: 8, to: 12 },
  },
};

/**
 * Context interface - extends original CalendarContext with Legit capabilities
 */
interface ILegitCalendarContext {
  // Original calendar state
  selectedDate: Date;
  setSelectedDate: (date: Date | undefined) => void;
  selectedUserId: IUser["id"] | "all";
  setSelectedUserId: (userId: IUser["id"] | "all") => void;
  badgeVariant: TBadgeVariant;
  setBadgeVariant: (variant: TBadgeVariant) => void;
  users: IUser[];
  workingHours: TWorkingHours;
  setWorkingHours: Dispatch<SetStateAction<TWorkingHours>>;
  visibleHours: TVisibleHours;
  setVisibleHours: Dispatch<SetStateAction<TVisibleHours>>;
  events: IEvent[];
  setLocalEvents: Dispatch<SetStateAction<IEvent[]>>;

  // Legit-specific capabilities
  history: HistoryItem[];
  rollback: (commitOid: string) => Promise<void>;
  getCurrentBranch: () => Promise<string>;
  loading: boolean;
  error?: Error;

  // Multi-agent support
  agentId?: string;
  setAgentId: (id: string | undefined) => void;
}

const LegitCalendarContext = createContext<ILegitCalendarContext | null>(null);

interface LegitCalendarProviderProps {
  children: React.ReactNode;
  initialEvents: IEvent[];
  initialUsers: IUser[];
}

/**
 * LegitCalendarProvider - Provides calendar state backed by Legit versioned filesystem.
 *
 * Features:
 * - All state changes are versioned (can rollback)
 * - Full audit history
 * - Multi-agent support via branching
 */
export function LegitCalendarProvider({
  children,
  initialEvents,
  initialUsers,
}: LegitCalendarProviderProps) {
  const { legitFs, rollback } = useLegitContext();

  // Use Legit files for persistent state
  const {
    data: eventsData,
    setData: setEventsData,
    history,
    loading: eventsLoading,
    error: eventsError,
  } = useLegitFile("/calendar/events.json", {
    initialData: JSON.stringify(initialEvents),
  });

  const { data: usersData } = useLegitFile(
    "/calendar/users.json",
    {
      initialData: JSON.stringify(initialUsers),
    }
  );

  const { data: settingsData, setData: setSettingsData } = useLegitFile(
    "/calendar/settings.json",
    {
      initialData: JSON.stringify(DEFAULT_SETTINGS),
    }
  );

  // Parse JSON data
  const events: IEvent[] = useMemo(
    () => (eventsData ? JSON.parse(eventsData) : []),
    [eventsData]
  );
  const users: IUser[] = useMemo(
    () => (usersData ? JSON.parse(usersData) : []),
    [usersData]
  );
  const settings: CalendarSettings = useMemo(
    () => (settingsData ? JSON.parse(settingsData) : DEFAULT_SETTINGS),
    [settingsData]
  );

  // Local UI state (not persisted to Legit)
  const [selectedDate, setSelectedDateState] = useState(new Date());
  const [selectedUserId, setSelectedUserId] = useState<IUser["id"] | "all">(
    "all"
  );
  const [agentId, setAgentId] = useState<string | undefined>();

  // Setters that write to Legit
  const setLocalEvents: Dispatch<SetStateAction<IEvent[]>> = useCallback(
    (action) => {
      const newEvents =
        typeof action === "function" ? action(events) : action;
      setEventsData(JSON.stringify(newEvents, null, 2));
    },
    [events, setEventsData]
  );

  const setBadgeVariant = useCallback(
    (variant: TBadgeVariant) => {
      const newSettings = { ...settings, badgeVariant: variant };
      setSettingsData(JSON.stringify(newSettings, null, 2));
    },
    [settings, setSettingsData]
  );

  const setVisibleHours: Dispatch<SetStateAction<TVisibleHours>> = useCallback(
    (action) => {
      const newVisibleHours =
        typeof action === "function" ? action(settings.visibleHours) : action;
      const newSettings = { ...settings, visibleHours: newVisibleHours };
      setSettingsData(JSON.stringify(newSettings, null, 2));
    },
    [settings, setSettingsData]
  );

  const setWorkingHours: Dispatch<SetStateAction<TWorkingHours>> = useCallback(
    (action) => {
      const newWorkingHours =
        typeof action === "function" ? action(settings.workingHours) : action;
      const newSettings = { ...settings, workingHours: newWorkingHours };
      setSettingsData(JSON.stringify(newSettings, null, 2));
    },
    [settings, setSettingsData]
  );

  const setSelectedDate = useCallback((date: Date | undefined) => {
    if (date) {
      setSelectedDateState(date);
    }
  }, []);

  const getCurrentBranch = useCallback(async () => {
    if (!legitFs) return "main";
    return legitFs.getCurrentBranch();
  }, [legitFs]);

  const contextValue: ILegitCalendarContext = useMemo(
    () => ({
      // Original calendar state
      selectedDate,
      setSelectedDate,
      selectedUserId,
      setSelectedUserId,
      badgeVariant: settings.badgeVariant,
      setBadgeVariant,
      users,
      workingHours: settings.workingHours,
      setWorkingHours,
      visibleHours: settings.visibleHours,
      setVisibleHours,
      events,
      setLocalEvents,

      // Legit capabilities
      history: history || [],
      rollback,
      getCurrentBranch,
      loading: eventsLoading,
      error: eventsError,

      // Multi-agent
      agentId,
      setAgentId,
    }),
    [
      selectedDate,
      setSelectedDate,
      selectedUserId,
      settings,
      setBadgeVariant,
      users,
      setWorkingHours,
      setVisibleHours,
      events,
      setLocalEvents,
      history,
      rollback,
      getCurrentBranch,
      eventsLoading,
      eventsError,
      agentId,
    ]
  );

  return (
    <LegitCalendarContext.Provider value={contextValue}>
      {children}
    </LegitCalendarContext.Provider>
  );
}

/**
 * Hook to access the Legit-backed calendar context
 */
export function useLegitCalendar(): ILegitCalendarContext {
  const context = useContext(LegitCalendarContext);
  if (!context) {
    throw new Error(
      "useLegitCalendar must be used within a LegitCalendarProvider"
    );
  }
  return context;
}

/**
 * Hook for backward compatibility with original useCalendar
 * Returns the same interface as the original CalendarContext
 */
export function useCalendar() {
  return useLegitCalendar();
}
