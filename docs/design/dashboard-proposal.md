# Feature: Dashboard Widgets

## Overview

A customisable dashboard page where users can add, arrange, and resize widgets on a fixed-width grid layout. Each widget is powered by a saved filter and adapts its rendering based on grid size.

## Tech Stack

- **react-grid-layout** (v2) — drag-and-drop grid layout with `GridLayout` (static, non-responsive)
- **Recharts** — charting library for pie, bar, and line charts
- **Storybook** (v10) — component development and testing for widgets
- **Saved filters** — each widget references a saved filter by ID for its data source

## Data Model

### Tables

```sql
dashboards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
)

dashboard_widgets (
  id TEXT PRIMARY KEY,
  dashboard_id TEXT NOT NULL REFERENCES dashboards(id),
  type TEXT NOT NULL,        -- 'summary' | 'categoryBreakdown' | 'trend' | 'transactionList'
  title TEXT NOT NULL,
  filter_id TEXT REFERENCES saved_filters(id),
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  w INTEGER NOT NULL,
  h INTEGER NOT NULL,
  config TEXT NOT NULL DEFAULT '{}',  -- JSON, type-specific configuration
  created_at TEXT NOT NULL
)
```

### Relationships

```
dashboards ||--o{ dashboard_widgets : contains
dashboard_widgets }o--|| saved_filters : "powered by"
```

## Widget Types

### 1. Summary

- Shows income, expenses, net totals with custom title (e.g. "Total Groceries This Week")
- Adapts based on grid width: compact (net only at gridW <= 2), medium (full layout), wide (larger text at gridW >= 6)
- Configurable: `showTransactionCount` (boolean)
- **Constraints**: `minW: 1, minH: 1`

### 2. Category Breakdown

- Spending by category as pie chart (Recharts)
- Configurable: `maxCategories` (1-20), `showTable` (boolean)
- **Constraints**: `minW: 3, minH: 3`

### 3. Trend (planned)

- Spending over time (line/bar chart)
- Configurable: `groupBy` (day/week/month), `chartType` (line/bar)
- **Constraints**: `minW: 4, minH: 3`

### 4. Transaction List (planned)

- Filtered transaction table (reuses DataTable)
- Configurable: `pageSize` (5-100)
- **Constraints**: `minW: 6, minH: 4`

## Static Grid Layout

Using `react-grid-layout`'s `<GridLayout>` with a fixed width for predictable positioning:

```typescript
const GRID_COLS = 12;
const GRID_WIDTH = 1200; // fixed pixel width
```

- Fixed 12-column grid at 1200px — no responsive breakpoints
- Grid is centered when viewport is wider, scrolls horizontally when narrower
- Positions saved to DB on drag/resize via `onDragStop`/`onResizeStop`
- Dashed border shows grid boundaries

## Widget Configuration

Each widget type defines its own config shape, stored as JSON in the `config` column:

```typescript
type WidgetConfig =
  | { type: "summary"; showTransactionCount: boolean }
  | { type: "categoryBreakdown"; maxCategories: number; showTable: boolean }
  | {
      type: "trend";
      groupBy: "day" | "week" | "month";
      chartType: "line" | "bar";
    }
  | { type: "transactionList"; pageSize: number };
```

- Default config applied when creating a widget
- Config validated with per-type Zod schemas on the API
- Edit dialog renders a type-specific config form

## Widget Size Awareness

Widgets adapt based on their grid `w` value (not pixel width):

```typescript
function getSize(gridW: number): "compact" | "medium" | "wide" {
  if (gridW <= 2) return "compact";
  if (gridW >= 6) return "wide";
  return "medium";
}
```

- Grid size passed from `GridLayout` through `WidgetContainer` to widget components
- In Storybook, grid size updates live via render prop pattern

## Architecture

```
/ (page.tsx)                        — Dashboard list (create/delete)
/dashboards/[id] (page.tsx)         — Dashboard view with grid

Sidebar
├── Dashboards (link to list)
│   ├── Dashboard 1 (dynamic sublink)
│   ├── Dashboard 2
│   └── ...

Dashboard View
├── Header (rename, add widget button)
├── GridLayout (fixed 1200px, centered)
│   ├── WidgetContainer { widget, onRemove, onEdit }
│   │   └── WidgetRenderer { type, title, data, config, gridW, gridH }
│   │       └── SummaryWidget | CategoryBreakdownWidget | ...
│   └── ...
└── WidgetDialog (add/edit modal with config form)

Storybook
├── WidgetStoryLayout (resizable grid with header chrome)
│   └── Widget (receives live gridW/gridH via render prop)
```

## API Routes

```
GET    /api/dashboards                              — list dashboards
POST   /api/dashboards                              — create dashboard
PATCH  /api/dashboards/:id                           — rename dashboard
DELETE /api/dashboards/:id                           — delete dashboard and widgets

GET    /api/dashboards/:id/widgets                   — list widgets
POST   /api/dashboards/:id/widgets                   — add widget (auto-assigns default config)
PUT    /api/dashboards/:id/widgets                   — bulk update positions
PATCH  /api/dashboards/:dashboardId/widgets/:widgetId — update widget config/title/filter
DELETE /api/dashboards/:dashboardId/widgets/:widgetId — remove widget
```

## Implementation Status

### Phase 1: Foundation — Done

- [x] Install react-grid-layout v2, recharts
- [x] Create dashboards + dashboard_widgets tables and API
- [x] Dashboard list page with create/delete
- [x] Dashboard view with static GridLayout
- [x] Widget container with size-aware rendering

### Phase 2: Widget Types — Partial

- [x] Summary widget (income/expenses/net, responsive to grid size)
- [x] Category breakdown widget (pie chart with configurable max categories + table)
- [ ] Trend widget (line/bar chart over time)
- [ ] Transaction list widget (reuses DataTable)

### Phase 3: Dashboard Management — Done

- [x] Add/edit widget dialog with type-specific config form
- [x] Remove widget button (stopPropagation to avoid drag)
- [x] Save layout on drag/resize via onDragStop/onResizeStop
- [x] Create/delete/rename dashboards
- [x] Dynamic sidebar with dashboard sublinks

### Phase 4: Development Tools — Done

- [x] Storybook v10 setup with Tailwind/shadcn styles
- [x] Widget stories with resizable grid layout (WidgetStoryLayout)
- [x] Edit dialog in Storybook (standalone, no API)
- [x] Live gridW/gridH passed to widgets via render prop

### Phase 5: Polish — Partial

- [x] Widget config (JSON in DB, type-specific forms, defaults)
- [x] Tabular numbers for aligned currency formatting
- [x] CORS fix for PUT/PATCH/DELETE methods
- [x] apiFetch only sets Content-Type when body is present
- [ ] Widget loading states
- [ ] Empty states
