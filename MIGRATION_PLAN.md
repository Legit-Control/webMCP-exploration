# Implementation Plan: Next.js → TanStack Router + Vite (Full CSR)

## Overview

Migrate this calendar app from Next.js to Vite + TanStack Router with full client-side rendering. The app is already ~98% client-side, making this straightforward.

---

## Step 1: Initialize New Vite Project Structure

### 1.1 Update package.json

Remove Next.js, add Vite and TanStack Router:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@tanstack/react-router": "^1.120.3"
  },
  "devDependencies": {
    "vite": "^6.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "@tanstack/router-devtools": "^1.120.3",
    "@tanstack/router-vite-plugin": "^1.120.3"
  }
}
```

**Remove these packages:**
- `next`
- `@vercel/analytics` (optional, Vercel-specific)

### 1.2 Create vite.config.ts

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-vite-plugin'
import path from 'path'

export default defineConfig({
  plugins: [react(), TanStackRouterVite()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### 1.3 Create index.html (new entry point)

Create `index.html` in project root:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Big Calendar</title>
    <meta name="description" content="A beautiful week, month, year and agenda view calendar" />
    <link rel="icon" href="/favicon.ico" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

## Step 2: Create Router Configuration

### 2.1 Create src/main.tsx

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import './styles/globals.css'

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
```

### 2.2 Create src/routes directory structure

```
src/routes/
├── __root.tsx           # Root layout (replaces app/layout.tsx)
├── index.tsx            # Redirect to /month-view
├── _calendar.tsx        # Calendar layout (replaces app/(calendar)/layout.tsx)
├── _calendar.month-view.tsx
├── _calendar.week-view.tsx
├── _calendar.day-view.tsx
├── _calendar.year-view.tsx
└── _calendar.agenda-view.tsx
```

### 2.3 Create src/routes/__root.tsx

```tsx
import { Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { MyProvider } from '@/app/MyProvider'
import { WebMCPProvider } from '@/app/WebMCPProvider'
import { Header } from '@/components/header'
import WebMCPAgent from '@/app/WebMCPAgent'
import { ThemeProvider } from '@/components/theme-provider'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <ThemeProvider>
      <WebMCPProvider>
        <MyProvider>
          <div className="h-dvh flex flex-col font-sans antialiased">
            <Header />
            <WebMCPAgent />
            <main className="flex-1 overflow-hidden">
              <Outlet />
            </main>
          </div>
          <TanStackRouterDevtools />
        </MyProvider>
      </WebMCPProvider>
    </ThemeProvider>
  )
}
```

### 2.4 Create src/routes/index.tsx (redirect)

```tsx
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/month-view' })
  },
  component: () => null,
})
```

### 2.5 Create src/routes/_calendar.tsx

```tsx
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { LegitCalendarProvider } from '@/legit-webmcp/legit-calendar-context'
import { ActivityFeedProvider } from '@/calendar/contexts/activity-feed-context'
import { AgentPreviewProvider } from '@/calendar/contexts/agent-preview-context'
import CalendarMCPTools from '@/calendar/mcp-tools/CalendarMCPTools'
import { AgentPreviewBanner } from '@/calendar/components/agent-preview-banner'
import { ActivityFeed } from '@/calendar/components/activity-feed'
import { TimeTravelSlider } from '@/calendar/components/time-travel-slider'

export const Route = createFileRoute('/_calendar')({
  component: CalendarLayout,
})

function CalendarLayout() {
  return (
    <LegitCalendarProvider>
      <ActivityFeedProvider>
        <AgentPreviewProvider>
          <CalendarMCPTools />
          <div className="flex h-full">
            <div className="flex-1 flex flex-col">
              <AgentPreviewBanner />
              <Outlet />
              <TimeTravelSlider />
            </div>
            <ActivityFeed />
          </div>
        </AgentPreviewProvider>
      </ActivityFeedProvider>
    </LegitCalendarProvider>
  )
}
```

### 2.6 Create view routes

Example for `src/routes/_calendar.month-view.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { ClientContainer } from '@/calendar/components/client-container'

export const Route = createFileRoute('/_calendar/month-view')({
  component: MonthViewPage,
})

function MonthViewPage() {
  return <ClientContainer view="month" />
}
```

Create similar files for:
- `_calendar.week-view.tsx` → `view="week"`
- `_calendar.day-view.tsx` → `view="day"`
- `_calendar.year-view.tsx` → `view="year"`
- `_calendar.agenda-view.tsx` → `view="agenda"`

---

## Step 3: Fix Cookie/Theme Handling

### 3.1 Update src/cookies/get.ts

Replace server-side `next/headers` with localStorage:

```tsx
import { THEME_COOKIE_NAME, TTheme } from "./constants";

export function getTheme(): TTheme {
  if (typeof window === 'undefined') return 'light';

  const stored = localStorage.getItem(THEME_COOKIE_NAME);
  if (stored === 'light' || stored === 'dark') return stored;

  // Check system preference
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}
```

### 3.2 Update src/cookies/set.ts

```tsx
import { THEME_COOKIE_NAME, TTheme } from "./constants";

export function setTheme(theme: TTheme) {
  localStorage.setItem(THEME_COOKIE_NAME, theme);
  document.documentElement.classList.toggle('dark', theme === 'dark');
}
```

### 3.3 Create src/components/theme-provider.tsx

```tsx
import { createContext, useContext, useEffect, useState } from 'react'
import { getTheme } from '@/cookies/get'
import { setTheme as persistTheme } from '@/cookies/set'
import { TTheme } from '@/cookies/constants'

const ThemeContext = createContext<{
  theme: TTheme
  setTheme: (theme: TTheme) => void
}>({ theme: 'light', setTheme: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<TTheme>('light')

  useEffect(() => {
    const stored = getTheme()
    setThemeState(stored)
    document.documentElement.classList.toggle('dark', stored === 'dark')
  }, [])

  const setTheme = (newTheme: TTheme) => {
    setThemeState(newTheme)
    persistTheme(newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
```

---

## Step 4: Replace Navigation Imports

### Files to update:

1. `src/calendar/components/calendar-header/index.tsx`
2. `src/calendar/mcp-tools/use-navigation-tools.ts`
3. `src/calendar/mcp-tools/use-smart-tools.ts`
4. `src/components/header.tsx` (if exists)
5. Any other files using `useRouter` or `usePathname`

### Replacement patterns:

**useRouter:**
```tsx
// Before
import { useRouter } from 'next/navigation'
const router = useRouter()
router.push('/month-view')

// After
import { useRouter } from '@tanstack/react-router'
const router = useRouter()
router.navigate({ to: '/month-view' })
```

**usePathname:**
```tsx
// Before
import { usePathname } from 'next/navigation'
const pathname = usePathname()

// After
import { useLocation } from '@tanstack/react-router'
const location = useLocation()
const pathname = location.pathname
```

**Link component:**
```tsx
// Before
import Link from 'next/link'
<Link href="/month-view">Month</Link>

// After
import { Link } from '@tanstack/react-router'
<Link to="/month-view">Month</Link>
```

---

## Step 5: Remove "use client" Directives

Remove all `"use client"` directives - not needed in Vite:
- All files in `src/calendar/`
- All files in `src/components/`
- All files in `src/legit-webmcp/`
- `src/app/MyProvider.tsx`
- `src/app/WebMCPProvider.tsx`
- `src/app/WebMCPAgent.tsx`

---

## Step 6: Update Tailwind Config

```ts
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  // ... rest stays the same
}
```

---

## Step 7: Update globals.css

```css
:root {
  --font-inter: 'Inter', sans-serif;
}

body {
  font-family: var(--font-inter);
}
```

---

## Step 8: Files to Delete

- `next.config.mjs`
- `next-env.d.ts`
- `src/app/layout.tsx`
- `src/app/(calendar)/layout.tsx`
- `src/app/(calendar)/*/page.tsx` (all 5 view pages)
- `.next/` directory

---

## Step 9: Files to Keep (No Changes Needed)

- All files in `src/calendar/components/` (except navigation hook updates)
- All files in `src/calendar/contexts/`
- All files in `src/calendar/hooks/`
- All files in `src/legit-webmcp/`
- `src/calendar/mcp-tools/` (except navigation hook updates)
- `src/calendar/requests.ts`
- `src/calendar/mocks.ts`
- `src/calendar/interfaces.ts`
- All Radix UI components in `src/components/ui/`
- `src/lib/utils.ts`
- `src/lib/webmcp-init.ts`
- `tailwind.config.ts` (minor content path update)
- `postcss.config.mjs`

---

## Step 10: Update tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

Create `tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

---

## Summary Checklist

- [ ] Update package.json (add Vite + TanStack Router, remove Next.js)
- [ ] Create vite.config.ts
- [ ] Create index.html
- [ ] Create src/main.tsx
- [ ] Create src/routes/__root.tsx
- [ ] Create src/routes/index.tsx (redirect)
- [ ] Create src/routes/_calendar.tsx
- [ ] Create 5 view route files (_calendar.*.tsx)
- [ ] Update src/cookies/get.ts (localStorage instead of next/headers)
- [ ] Update src/cookies/set.ts (localStorage)
- [ ] Create ThemeProvider component
- [ ] Replace next/navigation imports in ~5 files
- [ ] Replace next/link with TanStack Link
- [ ] Remove "use client" directives
- [ ] Update Tailwind content paths
- [ ] Update tsconfig.json
- [ ] Delete Next.js files (next.config.mjs, etc.)
- [ ] Run `npm install` and test

---

## Verification Steps

After migration, verify:
1. All 5 calendar views render correctly
2. Navigation between views works
3. Theme toggle persists across refreshes
4. Legit SDK versioning/history works
5. WebMCP tools register and function
6. Drag-and-drop events work
7. Agent preview/merge functionality works
