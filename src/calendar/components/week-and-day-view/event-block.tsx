import { cva } from "class-variance-authority";
import { format, differenceInMinutes, parseISO } from "date-fns";
import { Bot } from "lucide-react";

import { useCalendar } from "@/calendar/contexts/calendar-context";

import { DraggableEvent } from "@/calendar/components/dnd/draggable-event";
import { EventDetailsDialog } from "@/calendar/components/dialogs/event-details-dialog";

import { cn } from "@/lib/utils";

import type { HTMLAttributes } from "react";
import type { IEvent, TPhantomStatus } from "@/calendar/interfaces";
import type { VariantProps } from "class-variance-authority";

const calendarWeekEventCardVariants = cva(
  "flex select-none flex-col gap-0.5 truncate whitespace-nowrap rounded-md border px-2 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
  {
    variants: {
      color: {
        // Colored and mixed variants
        blue: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300 [&_.event-dot]:fill-blue-600",
        green: "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300 [&_.event-dot]:fill-green-600",
        red: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300 [&_.event-dot]:fill-red-600",
        yellow: "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-300 [&_.event-dot]:fill-yellow-600",
        purple: "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300 [&_.event-dot]:fill-purple-600",
        orange: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300 [&_.event-dot]:fill-orange-600",
        gray: "border-neutral-200 bg-neutral-50 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 [&_.event-dot]:fill-neutral-600",

        // Dot variants
        "blue-dot": "bg-neutral-50 dark:bg-neutral-900 [&_.event-dot]:fill-blue-600",
        "green-dot": "bg-neutral-50 dark:bg-neutral-900 [&_.event-dot]:fill-green-600",
        "red-dot": "bg-neutral-50 dark:bg-neutral-900 [&_.event-dot]:fill-red-600",
        "orange-dot": "bg-neutral-50 dark:bg-neutral-900 [&_.event-dot]:fill-orange-600",
        "purple-dot": "bg-neutral-50 dark:bg-neutral-900 [&_.event-dot]:fill-purple-600",
        "yellow-dot": "bg-neutral-50 dark:bg-neutral-900 [&_.event-dot]:fill-yellow-600",
        "gray-dot": "bg-neutral-50 dark:bg-neutral-900 [&_.event-dot]:fill-neutral-600",
      },
    },
    defaultVariants: {
      color: "blue-dot",
    },
  }
);

/**
 * Styles for phantom events (pending agent changes)
 * Uses CSS animations defined in globals.css for pulsing glow effect
 */
const phantomStyles: Record<TPhantomStatus, string> = {
  added: "border-dashed border-2 border-green-500 bg-green-50/50 dark:bg-green-950/30 phantom-added",
  modified: "border-dashed border-2 border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 phantom-modified",
  removed: "border-dashed border-2 border-red-500 bg-red-50/50 dark:bg-red-950/30 opacity-50 line-through phantom-removed",
};

interface IProps extends HTMLAttributes<HTMLDivElement>, Omit<VariantProps<typeof calendarWeekEventCardVariants>, "color"> {
  event: IEvent;
}

export function EventBlock({ event, className }: IProps) {
  const { badgeVariant } = useCalendar();

  const start = parseISO(event.startDate);
  const end = parseISO(event.endDate);
  const durationInMinutes = differenceInMinutes(end, start);
  const heightInPixels = (durationInMinutes / 60) * 96 - 8;

  const color = (badgeVariant === "dot" ? `${event.color}-dot` : event.color) as VariantProps<typeof calendarWeekEventCardVariants>["color"];

  // Apply phantom styles if this is a pending agent change
  const phantomClass = event._phantom ? phantomStyles[event._phantom] : "";

  const calendarWeekEventCardClasses = cn(
    calendarWeekEventCardVariants({ color, className }),
    durationInMinutes < 35 && "py-0 justify-center",
    phantomClass
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (e.currentTarget instanceof HTMLElement) e.currentTarget.click();
    }
  };

  // For phantom events, wrap differently (no drag, show indicator)
  const content = (
    <div role="button" tabIndex={0} className={calendarWeekEventCardClasses} style={{ height: `${heightInPixels}px` }} onKeyDown={handleKeyDown}>
      <div className="flex items-center gap-1.5 truncate">
        {/* Show bot icon for phantom events */}
        {event._phantom && (
          <Bot className="size-3.5 shrink-0 text-purple-600 dark:text-purple-400" />
        )}

        {["mixed", "dot"].includes(badgeVariant) && !event._phantom && (
          <svg width="8" height="8" viewBox="0 0 8 8" className="event-dot shrink-0">
            <circle cx="4" cy="4" r="4" />
          </svg>
        )}

        <p className="truncate font-semibold">{event.title}</p>
      </div>

      {durationInMinutes > 25 && (
        <p>
          {format(start, "h:mm a")} - {format(end, "h:mm a")}
        </p>
      )}

      {/* Phantom status badge */}
      {event._phantom && durationInMinutes > 40 && (
        <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide opacity-70">
          {event._phantom === "added" && "AI Proposed"}
          {event._phantom === "modified" && "AI Modified"}
          {event._phantom === "removed" && "AI Removed"}
        </span>
      )}
    </div>
  );

  // Don't allow dragging phantom events
  if (event._phantom) {
    return <EventDetailsDialog event={event}>{content}</EventDetailsDialog>;
  }

  return (
    <DraggableEvent event={event}>
      <EventDetailsDialog event={event}>{content}</EventDetailsDialog>
    </DraggableEvent>
  );
}
