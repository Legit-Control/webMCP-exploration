"use client";

import { useWebMCP } from "@mcp-b/react-webmcp";
import { useLegitContext } from "@legit-sdk/react/server";
import type { z, ZodRawShape, ZodTypeAny } from "zod";
import type { LegitToolContext } from "@/legit-webmcp/types";
import type { HistoryItem } from "@legit-sdk/core";

// =============================================================================
// Types
// =============================================================================

/**
 * Output schema shape - a record of Zod types for output validation.
 */
type OutputSchemaShape = Record<string, ZodTypeAny>;

/**
 * Options for creating a Legit-enabled WebMCP tool.
 *
 * @typeParam TInputShape - Zod raw shape for input validation
 * @typeParam TOutputShape - Zod raw shape for output validation (optional)
 */
export interface UseLegitWebMCPOptions<
  TInputShape extends ZodRawShape,
  TOutputShape extends OutputSchemaShape = OutputSchemaShape,
> {
  /**
   * Unique tool name. Should follow the pattern `[domain]_[action]`.
   * @example "calendar_add_event"
   */
  name: string;

  /**
   * Description shown to AI models. Should explain what the tool does,
   * when to use it, and what it returns.
   */
  description: string;

  /**
   * Zod input schema as a raw shape (not wrapped in z.object).
   * The hook will wrap it automatically.
   * @example { title: z.string(), date: z.string() }
   */
  inputSchema: TInputShape;

  /**
   * Optional Zod output schema as a raw shape for response validation.
   * Helps ensure consistent, type-safe responses.
   * @example { success: z.boolean(), event: EventSchema }
   */
  outputSchema?: TOutputShape;

  /**
   * Whether this tool mutates state. Used to set default annotations.
   * @default false
   */
  mutates?: boolean;

  /**
   * MCP tool annotations for AI model hints.
   */
  annotations?: {
    /** Tool only reads data, no side effects */
    readOnlyHint?: boolean;
    /** Safe to retry without side effects */
    idempotentHint?: boolean;
    /** May cause irreversible changes */
    destructiveHint?: boolean;
  };

  /**
   * Tool handler function. Receives parsed input and Legit context.
   * @param args - Validated input arguments
   * @param legit - Legit context for versioned state operations
   * @returns Tool result (should match outputSchema if provided)
   */
  handler: (
    args: z.infer<z.ZodObject<TInputShape>>,
    legit: LegitToolContext
  ) => Promise<z.infer<z.ZodObject<TOutputShape>>>;
}

// =============================================================================
// Default Values for Missing Files
// =============================================================================

/**
 * Default values returned when a file doesn't exist yet.
 * Keyed by path substring for matching.
 */
const DEFAULT_VALUES: Record<string, unknown> = {
  events: [],
  users: [],
  settings: {
    badgeVariant: "colored",
    visibleHours: { from: 7, to: 18 },
    workingHours: {},
  },
};

/**
 * Get default value for a path when file doesn't exist.
 */
function getDefaultForPath(path: string): unknown {
  for (const [key, value] of Object.entries(DEFAULT_VALUES)) {
    if (path.includes(key)) {
      return value;
    }
  }
  return {};
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * A hook that combines WebMCP tool registration with Legit SDK context.
 *
 * Provides versioned state operations to tool handlers, enabling:
 * - Automatic commit creation on writes
 * - History tracking
 * - Rollback capabilities
 * - Multi-agent branch isolation
 *
 * @example
 * ```tsx
 * useLegitWebMCP({
 *   name: "calendar_add_event",
 *   description: "Add a new calendar event",
 *   inputSchema: {
 *     title: z.string().describe("Event title"),
 *     date: z.string().describe("Event date (YYYY-MM-DD)"),
 *   },
 *   outputSchema: {
 *     success: z.boolean(),
 *     event: EventSchema,
 *   },
 *   mutates: true,
 *   handler: async (args, legit) => {
 *     const events = await legit.readState<IEvent[]>('/calendar/events.json');
 *     const newEvent = { id: Date.now(), ...args };
 *     await legit.writeState('/calendar/events.json', [...events, newEvent]);
 *     return { success: true, event: newEvent };
 *   }
 * });
 * ```
 *
 * @param options - Tool configuration options
 */
export function useLegitWebMCP<
  TInputShape extends ZodRawShape,
  TOutputShape extends OutputSchemaShape = OutputSchemaShape,
>(options: UseLegitWebMCPOptions<TInputShape, TOutputShape>): void {
  const { legitFs } = useLegitContext();

  /**
   * Create the Legit context object for tool handlers.
   * Provides versioned state operations backed by Legit's filesystem.
   */
  const createLegitContext = (): LegitToolContext => {
    if (!legitFs) {
      throw new Error(
        "LegitFS not initialized. Ensure LegitProvider wraps your component tree."
      );
    }

    return {
      readState: async <T>(path: string): Promise<T> => {
        try {
          const branch = await legitFs.getCurrentBranch();
          const fullPath = `/.legit/branches/${branch}${path}`;
          const content = await legitFs.promises.readFile(fullPath, "utf8");
          return JSON.parse(content as string) as T;
        } catch (error: unknown) {
          const fsError = error as { code?: string };
          if (fsError?.code === "ENOENT") {
            return getDefaultForPath(path) as T;
          }
          throw error;
        }
      },

      writeState: async <T>(path: string, data: T): Promise<void> => {
        const branch = await legitFs.getCurrentBranch();
        const fullPath = `/.legit/branches/${branch}${path}`;
        await legitFs.promises.writeFile(
          fullPath,
          JSON.stringify(data, null, 2),
          "utf8"
        );
      },

      getCurrentBranch: async (): Promise<string> => {
        return legitFs.getCurrentBranch();
      },

      getHistory: async (): Promise<HistoryItem[]> => {
        try {
          const branch = await legitFs.getCurrentBranch();
          const historyPath = `/.legit/branches/${branch}/.legit/history`;
          const historyContent = await legitFs.promises.readFile(
            historyPath,
            "utf8"
          );
          return JSON.parse(historyContent as string) as HistoryItem[];
        } catch {
          return [];
        }
      },

      rollback: async (commitOid: string): Promise<void> => {
        const branch = await legitFs.getCurrentBranch();
        await legitFs.promises.writeFile(
          `/.legit/branches/${branch}/.legit/head`,
          commitOid,
          "utf8"
        );
      },

      getPastState: async <T>(commitOid: string, path: string): Promise<T> => {
        const gitPath = path.startsWith("/") ? path.slice(1) : path;
        const commitPath = `/.legit/commits/${commitOid.slice(0, 2)}/${commitOid.slice(2)}/${gitPath}`;
        const content = await legitFs.promises.readFile(commitPath, "utf8");
        return JSON.parse(content as string) as T;
      },
    };
  };

  /**
   * Wrapped handler that injects Legit context.
   */
  const wrappedHandler = async (
    args: z.infer<z.ZodObject<TInputShape>>
  ) => {
    const legitContext = createLegitContext();
    return options.handler(args, legitContext);
  };

  // Register the tool with WebMCP
  // Note: The type cast is required because useWebMCP's handler type
  // doesn't account for outputSchema's generic type parameter. Our handler
  // returns Promise<z.infer<z.ZodObject<TOutputShape>>> which is type-safe
  // at the call site, but useWebMCP expects a simpler handler signature.
  useWebMCP({
    name: options.name,
    description: options.description,
    inputSchema: options.inputSchema,
    outputSchema: options.outputSchema,
    annotations: {
      readOnlyHint: options.annotations?.readOnlyHint ?? !options.mutates,
      idempotentHint: options.annotations?.idempotentHint ?? true,
      destructiveHint: options.annotations?.destructiveHint ?? false,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: wrappedHandler as any,
  });
}
