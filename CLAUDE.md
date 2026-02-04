# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RCCA Helper — a React single-page application for Root Cause Corrective Action (RCCA) investigations using interactive Fault Tree Analysis. Built for facilitator-led meetings where engineers collaboratively identify, verify, and track potential failure causes. Works fully offline on Mac and Windows.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server on http://0.0.0.0:3000
npm run build        # Production build via Vite
npm run preview      # Preview production build
```

No test runner or linter is configured.

## Architecture

**Stack:** React 19 + TypeScript + Vite + D3.js + Tailwind CSS v4 (PostCSS)

All dependencies are bundled via Vite from node_modules. No CDN or external network dependencies. The `@/*` path alias in `tsconfig.json` and `vite.config.ts` resolves to the project root.

### Key Files

- **App.tsx** — Main container. Manages multi-tree state (`SavedTree[]`), derives active tree data, and passes data + callbacks to child components. Handles tree CRUD, node CRUD, persistence, and all state transitions.
- **components/TreeVisualizer.tsx** — D3-based SVG fault tree rendering with zoom/pan, foreignObject HTML nodes, color-coded status indicators, and curved connecting paths.
- **components/InspectorPanel.tsx** — Right-side panel with three tabs: Details (edit node), RAIL (action item tracking), and Notes (evidence/general notes). Enforces evidence-required policy when ruling out causes.
- **components/TreeManager.tsx** — Dropdown in the navbar for managing investigations: create, switch, rename, delete, export (JSON download), and import (JSON file upload).
- **persistence.ts** — localStorage read/write (`loadAppState`/`saveAppState`) and JSON file export/import (`exportTreeAsJson`/`importTreeFromJson`).
- **types.ts** — Core data model: `CauseNode` (hierarchical tree), `ActionItem` (RAIL entries), `Note` (evidence/notes), `SavedTree` (full investigation bundle), `AppState` (all trees + active ID). Node statuses: PENDING, ACTIVE, RULED_OUT, CONFIRMED.
- **constants.ts** — Color mappings, `createInitialTree()` factory function, layout dimensions.

### Data Flow

Unidirectional React state — App.tsx holds a `trees[]` array and `activeTreeId`. The active tree's data, actions, and notes are derived and passed down. All mutations go through `updateActiveTree()` which immutably updates the active tree and sets `updatedAt`. A debounced `useEffect` auto-saves the full state to localStorage.

## Mission Context (mission.md)

The tool is designed for facilitator-led RCCA meetings with real-time brainstorming capture and strict state tracking.
