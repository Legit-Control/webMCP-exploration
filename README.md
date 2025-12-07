# WebMCP + Legit SDK Calendar Demo

A demonstration of **WebMCP** (Model Context Protocol for the web) integrated with **Legit SDK** (Git-like versioning for application state).

This project showcases how AI agents can safely make changes to application state using isolated sandbox branches, visual previews, and a commit-based workflow.

## Features

- **Multi-Agent Sandboxing**: Each AI agent works in an isolated Git branch
- **Visual Previews**: Phantom events show proposed changes before committing
- **Version History**: Full commit history with undo/rollback capabilities
- **MCP Tool Integration**: 19 tools for calendar operations via WebMCP
- **Agent Prompts**: Built-in guidance for AI agents using the system

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Application                        │
├─────────────────────────────────────────────────────────────┤
│  <LegitProvider>          ← Git-like versioned filesystem   │
│    <WebMCPProvider>       ← MCP tool registration           │
│      <LegitCalendarProvider>  ← Calendar state on branches  │
│        <CalendarMCPTools />   ← Tool & prompt registration  │
│        <Calendar Views />     ← UI components               │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Project Structure

```
src/
├── legit-webmcp/           # WebMCP + Legit SDK integration layer
│   ├── index.ts            # Public API exports
│   ├── types.ts            # Type definitions
│   ├── use-legit-webmcp.ts # Legit-enabled MCP tool hook
│   ├── use-multi-agent.ts  # Multi-agent coordination
│   └── legit-calendar-context.tsx  # Calendar state on Legit
│
├── calendar/
│   ├── mcp-tools/          # MCP tool implementations
│   │   ├── CalendarMCPTools.tsx  # Tool registry component
│   │   ├── agent-prompts.ts      # Agent guidance prompts
│   │   ├── use-agent-tools.ts    # Multi-agent sandbox tools
│   │   ├── use-event-tools.ts    # Event CRUD tools
│   │   ├── use-filter-tools.ts   # State & navigation tools
│   │   ├── use-history-tools.ts  # Version history tools
│   │   ├── use-preview-tools.ts  # Phantom preview tools
│   │   └── use-smart-tools.ts    # Scheduling tools
│   │
│   ├── contexts/           # React contexts
│   ├── components/         # UI components
│   └── interfaces.ts       # Type definitions
```

## WebMCP-Legit Integration

### Key Hooks

#### `useLegitWebMCP`

Create MCP tools with Legit-powered versioned state:

```tsx
import { useLegitWebMCP } from "@/legit-webmcp";

useLegitWebMCP({
  name: "calendar_add_event",
  description: "Add a new calendar event",
  inputSchema: {
    title: z.string().describe("Event title"),
    date: z.string().describe("Event date (YYYY-MM-DD)"),
  },
  mutates: true,
  handler: async (args, legit) => {
    // Read current state from versioned filesystem
    const events = await legit.readState<IEvent[]>("/calendar/events.json");

    // Create new event
    const newEvent = { id: Date.now(), ...args };

    // Write to current branch (creates commit)
    await legit.writeState("/calendar/events.json", [...events, newEvent]);

    return { success: true, event: newEvent };
  },
});
```

#### `useMultiAgentCoordination`

Manage multi-agent sandboxes with Git-like branching:

```tsx
import { useMultiAgentCoordination } from "@/legit-webmcp";

function AgentTools() {
  const {
    createAgentSession,  // Create isolated branch
    getAgentPreview,     // Preview changes vs main
    mergeAgentChanges,   // Commit to main branch
    activeSessions,      // List active agents
    switchToMain,        // Return to main branch
  } = useMultiAgentCoordination();

  // Create a sandbox for the agent
  const branch = await createAgentSession("scheduler", "claude");

  // Preview what's changed
  const preview = await getAgentPreview("scheduler");
  if (preview?.hasChanges) {
    console.log(`${preview.summary.eventsAdded} events added`);
  }

  // Merge when approved
  await mergeAgentChanges("scheduler", {
    message: "Added team sync meeting",
  });
}
```

#### `useLegitCalendar`

Access calendar state backed by Legit filesystem:

```tsx
import { useLegitCalendar } from "@/legit-webmcp";

function CalendarComponent() {
  const {
    events,           // Current events on active branch
    setLocalEvents,   // Update events (writes to branch)
    users,            // Available users
    getCurrentBranch, // Get active branch name
  } = useLegitCalendar();
}
```

### The LegitToolContext

Tool handlers receive a `LegitToolContext` with these methods:

| Method | Description |
|--------|-------------|
| `readState<T>(path)` | Read JSON from versioned file |
| `writeState<T>(path, data)` | Write JSON, creating a commit |
| `getCurrentBranch()` | Get the active branch name |
| `getHistory()` | Get commit history for branch |
| `rollback(commitOid)` | Revert to a previous commit |
| `getPastState<T>(oid, path)` | Read file at a specific commit |

## MCP Tools Reference

### Sandbox & Multi-Agent Tools

| Tool | Description |
|------|-------------|
| `calendar_start_sandbox` | Create isolated branch for agent |
| `calendar_preview_changes` | Preview pending changes vs main |
| `calendar_commit_changes` | Merge agent changes to main |
| `calendar_list_agents` | List active agent sessions |
| `calendar_switch_branch` | Switch between branches |

### Version History Tools

| Tool | Description |
|------|-------------|
| `calendar_show_history` | View commit history |
| `calendar_undo` | Rollback to previous state |
| `calendar_compare_states` | Diff between commits |

### Visual Preview Tools

| Tool | Description |
|------|-------------|
| `calendar_show_preview` | Display phantom events in UI |
| `calendar_hide_preview` | Exit preview mode |
| `calendar_get_preview_status` | Check preview state |

### Calendar Operations

| Tool | Description |
|------|-------------|
| `calendar_list_events` | Query events with filters |
| `calendar_schedule_meeting` | Create new events |
| `calendar_update_event` | Modify event properties |
| `calendar_delete_event` | Remove events |
| `calendar_find_free_time` | Find available time slots |

### State & Navigation

| Tool | Description |
|------|-------------|
| `calendar_get_state` | Get complete calendar state |
| `calendar_filter_by_user` | Filter by participant |
| `calendar_navigate` | Change view/date |

## Agent Prompts

Built-in prompts help AI agents understand the system:

| Prompt | Description |
|--------|-------------|
| `legit_demo_guide` | Comprehensive integration overview |
| `legit_quick_start` | Concise sandbox workflow |
| `legit_multi_agent_guide` | Multi-agent coordination |
| `scheduling_assistant` | Calendar assistant role |
| `legit_phantom_events` | Visual preview explanation |
| `legit_history_guide` | Version history guide |

## The Sandbox Workflow

AI agents should follow this workflow when making changes:

```
1. Start Sandbox     → Creates isolated branch
        ↓
2. Make Changes      → Events created on agent branch
        ↓
3. Preview Changes   → See diff vs main branch
        ↓
4. Show Preview      → Display phantom events in UI
        ↓
5. Wait for Approval → User reviews visual changes
        ↓
6. Commit Changes    → Merge to main branch
```

This ensures:
- Changes are invisible until approved
- Users can review before committing
- Multiple agents can work concurrently
- Full history for auditing

## Type Definitions

### Core Types

```typescript
interface AgentSession {
  agentId: string;      // Unique agent identifier
  modelName: string;    // AI model (claude, gpt4, etc.)
  branch: string;       // Git branch name
  createdAt: Date;
  lastActivity: Date;
}

interface AgentPreview {
  hasChanges: boolean;
  agentState: unknown;
  mainState: unknown;
  summary?: {
    eventsAdded: number;
    eventsRemoved: number;
    eventsModified: number;
  };
}

interface CommitRecord {
  id: string;
  timestamp: Date;
  agentId: string;
  message: string;
  summary: {
    eventsAdded: number;
    eventsRemoved: number;
    eventsModified: number;
  };
}
```

### Calendar Types

```typescript
interface IEvent {
  id: number;
  startDate: string;
  endDate: string;
  title: string;
  color: TEventColor;
  description: string;
  user: IUser;
  _phantom?: "added" | "modified" | "removed";
  _agentId?: string;
}

interface IUser {
  id: string;
  name: string;
  picturePath: string | null;
}
```

## Dependencies

- **@mcp-b/react-webmcp** - WebMCP React hooks for tool registration
- **@legit-sdk/react** - Legit SDK React bindings
- **@legit-sdk/core** - Legit SDK core functionality
- **Next.js 16** - React framework
- **Zod** - Schema validation

## License

MIT

## Credits

- Calendar UI based on [big-calendar](https://github.com/lramos33/big-calendar)
- WebMCP by [MCP-B](https://github.com/anthropics/mcp-b)
- Legit SDK for versioned state management
