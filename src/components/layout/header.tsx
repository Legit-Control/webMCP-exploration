import Link from "next/link";
import {
  ArrowUpRight,
  Layers,
  GitBranch,
  Book,
  ExternalLink,
  Command,
  Keyboard,
} from "lucide-react";

import { ToggleTheme } from "@/components/layout/change-theme";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function Header() {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-[72px] w-full max-w-screen-2xl items-center justify-between px-8">
        {/* Left: Branding */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {/* WebMCP + Legit Logo */}
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Layers className="size-5" />
            </div>
            <div>
              <h1 className="flex items-center gap-1.5 text-lg font-bold">
                <span className="text-foreground">
                  WebMCP
                </span>
                <span className="text-muted-foreground">×</span>
                <span className="text-foreground">
                  Legit SDK
                </span>
              </h1>
              <p className="text-xs text-muted-foreground">
                Git-like versioning for AI agent tools
              </p>
            </div>
          </div>
        </div>

        {/* Center: Quick info */}
        <div className="hidden items-center gap-6 lg:flex">
          <div className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            <GitBranch className="size-3" />
            Multi-Agent Sandbox Demo
          </div>
          <KeyboardShortcutHint />
        </div>

        {/* Right: Links and actions */}
        <div className="flex items-center gap-2">
          {/* Docs dropdown */}
          <DocsDropdown />

          {/* GitHub */}
          <Button variant="ghost" size="sm" asChild className="gap-1.5">
            <Link
              href="https://github.com/WebMCP-org/webMCP-Legit-exploration"
              target="_blank"
            >
              <svg
                className="size-4"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
              <ArrowUpRight className="size-3" />
            </Link>
          </Button>

          <ToggleTheme />
        </div>
      </div>
    </header>
  );
}

function KeyboardShortcutHint() {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Keyboard className="size-3" />
      <span>Press</span>
      <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
        ⌘
      </kbd>
      <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
        ⇧
      </kbd>
      <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
        K
      </kbd>
      <span>for AI agent</span>
    </div>
  );
}

function DocsDropdown() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <Book className="size-4" />
          Docs
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="end">
        <div className="space-y-1">
          <p className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase">
            Documentation
          </p>

          {/* WebMCP / MCP-B Docs */}
          <Link
            href="https://docs.mcp-b.ai"
            target="_blank"
            className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent"
          >
            <div className="flex size-8 items-center justify-center rounded bg-secondary">
              <Layers className="size-4 text-secondary-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">MCP-B Docs</p>
              <p className="text-xs text-muted-foreground">MCP tools in the browser</p>
            </div>
            <ExternalLink className="size-3 text-muted-foreground" />
          </Link>

          {/* Legit SDK Docs */}
          <Link
            href="https://legitcontrol.com"
            target="_blank"
            className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent"
          >
            <div className="flex size-8 items-center justify-center rounded bg-secondary">
              <GitBranch className="size-4 text-secondary-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Legit SDK</p>
              <p className="text-xs text-muted-foreground">Git-like versioning</p>
            </div>
            <ExternalLink className="size-3 text-muted-foreground" />
          </Link>

          <div className="my-2 h-px bg-border" />

          <p className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase">
            Landing Pages
          </p>

          {/* MCP-B Landing */}
          <Link
            href="https://mcp-b.ai"
            target="_blank"
            className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent"
          >
            <div className="flex size-8 items-center justify-center rounded bg-secondary">
              <Layers className="size-4 text-secondary-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">MCP-B.ai</p>
              <p className="text-xs text-muted-foreground">Learn about WebMCP</p>
            </div>
            <ExternalLink className="size-3 text-muted-foreground" />
          </Link>

          {/* Legit Control Landing */}
          <Link
            href="https://legitcontrol.com"
            target="_blank"
            className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent"
          >
            <div className="flex size-8 items-center justify-center rounded bg-secondary">
              <GitBranch className="size-4 text-secondary-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">LegitControl.com</p>
              <p className="text-xs text-muted-foreground">Learn about Legit SDK</p>
            </div>
            <ExternalLink className="size-3 text-muted-foreground" />
          </Link>

          <div className="my-2 h-px bg-border" />

          <p className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase">
            Connect an Agent
          </p>

          <div className="rounded-md bg-muted p-2 text-xs">
            <p className="font-medium text-foreground">
              Ways to connect:
            </p>
            <ul className="mt-1 space-y-1 text-muted-foreground">
              <li className="flex items-start gap-1">
                <span className="text-foreground">•</span>
                <span>
                  <strong>Embedded Agent:</strong> Press{" "}
                  <kbd className="rounded bg-background px-1 border border-border">⌘⇧K</kbd>
                </span>
              </li>
              <li className="flex items-start gap-1">
                <span className="text-foreground">•</span>
                <span>
                  <strong>Chrome DevTools MCP:</strong> Use the{" "}
                  <Link
                    href="https://docs.mcp-b.ai/packages/chrome-devtools-mcp"
                    target="_blank"
                    className="text-foreground underline"
                  >
                    MCP server
                  </Link>
                </span>
              </li>
              <li className="flex items-start gap-1">
                <span className="text-foreground">•</span>
                <span>
                  <strong>MCP-B Extension:</strong> Install the{" "}
                  <Link
                    href="https://chromewebstore.google.com/detail/mcp-bextension/daohopfhkdelnpemnhlekblhnikhdhfa"
                    target="_blank"
                    className="text-foreground underline"
                  >
                    Chrome extension
                  </Link>
                </span>
              </li>
            </ul>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
