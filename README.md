# st0nks_web

> **Stock Alert Dashboard** — A React + Vite frontend for managing stock price alert profiles and records, backed by the `st0nks_bot` API.

## Overview

`st0nks_web` is the **UI layer** of the st0nks ecosystem. It provides a dashboard for performing full CRUD operations on:
- **Profiles** — groups of Telegram targets that receive alert notifications.
- **Records** — individual stock price alert rules (upper/lower limits, alert mode).

```
st0nks_web  →  st0nks_bot (REST API at :3000)
```

## Prerequisites

| Requirement | Version |
|---|---|
| Node.js | ≥ 18 |
| npm | ≥ 9 |
| `st0nks_bot` | Running on port 3000 |

## Installation

```bash
cd st0nks_web
npm install
```

## Configuration

The API base URL is configured in `src/api/client.ts`. By default it points to:

```
http://localhost:3000
```

If `st0nks_bot` runs on a different host/port, update the `baseURL` in that file accordingly (or use a `.env` file with a `VITE_API_URL` variable).

## Running Locally

```bash
# Development server with Hot Module Replacement
npm run dev
```

The app will be available at **http://localhost:5173**.

```bash
# Type-check + Production build
npm run build

# Preview the production build locally
npm run preview
```

## Tech Stack

| Layer | Library |
|---|---|
| Framework | React 19 + TypeScript |
| Build tool | Vite 8 |
| Styling | Tailwind CSS v4 |
| UI components | Radix UI primitives |
| Data fetching | TanStack Query (React Query) v5 |
| HTTP client | Axios 1.15.x |
| Forms | React Hook Form + Zod |
| Routing | React Router DOM v7 |
| State | Zustand |
| Notifications | Sonner |

## Project Structure

```
st0nks_web/
├── src/
│   ├── api/
│   │   ├── client.ts         # Axios instance (baseURL config)
│   │   ├── profiles.ts       # Profile CRUD API calls
│   │   └── records.ts        # Record CRUD API calls
│   ├── components/
│   │   └── layout/           # Shared layout (sidebar, nav)
│   ├── pages/
│   │   ├── ProfilesPage.tsx  # Profiles list & management
│   │   └── RecordsPage.tsx   # Records list & management
│   ├── types/                # Shared TypeScript interfaces
│   ├── lib/                  # Utility helpers
│   ├── App.tsx               # Route definitions
│   └── main.tsx              # Entry point
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Pages

| Path | Description |
|---|---|
| `/profiles` | List, create, update, delete Profiles |
| `/records` | List, create, update, delete Records |

## Linting

```bash
npm run lint
```
