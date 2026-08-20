# 🎨 UI/UX Specification
## College Course Prerequisite Explorer

---

## 1. Design System

### 1.1 Color Palette

```css
:root {
  /* Background */
  --bg-primary: #0a0a0f;       /* Near-black — main background */
  --bg-secondary: #12121a;     /* Slightly lighter — cards, panels */
  --bg-tertiary: #1a1a2e;      /* Sidebar, modal backgrounds */
  --bg-glass: rgba(255,255,255,0.04); /* Glassmorphism surfaces */

  /* Brand */
  --brand-primary: #6366f1;    /* Indigo — primary actions, selected state */
  --brand-secondary: #8b5cf6;  /* Purple — secondary accent */
  --brand-glow: rgba(99,102,241,0.3); /* Glow effect color */

  /* Department Colors (for graph nodes) */
  --dept-cs: #6366f1;          /* Indigo — Computer Science */
  --dept-math: #10b981;        /* Emerald — Mathematics */
  --dept-ee: #f59e0b;          /* Amber — Electrical Engineering */
  --dept-phys: #ec4899;        /* Pink — Physics */
  --dept-ds: #06b6d4;          /* Cyan — Data Science */

  /* Status Colors */
  --status-unlocked: #10b981;  /* Green — course is now available */
  --status-locked: #6b7280;    /* Gray — prerequisites not met */
  --status-completed: #3b82f6; /* Blue — student has completed */
  --status-almost: #f59e0b;    /* Amber — one prerequisite away */

  /* Text */
  --text-primary: #f1f5f9;     /* Near-white */
  --text-secondary: #94a3b8;   /* Muted */
  --text-muted: #475569;       /* Very muted */

  /* Borders */
  --border-subtle: rgba(255,255,255,0.08);
  --border-focus: rgba(99,102,241,0.5);
}
```

### 1.2 Typography

```css
/* Import from Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  /* Scale */
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 1.875rem;  /* 30px */
}
```

### 1.3 Spacing & Layout

```css
:root {
  --sidebar-width: 280px;
  --panel-width: 360px;
  --header-height: 60px;
  --border-radius-sm: 6px;
  --border-radius-md: 10px;
  --border-radius-lg: 16px;
  --border-radius-xl: 24px;
}
```

### 1.4 Animations

```css
:root {
  --transition-fast: 150ms ease;
  --transition-base: 250ms ease;
  --transition-slow: 400ms ease;
}

/* Standard micro-animation for interactive elements */
.interactive {
  transition: transform var(--transition-fast), 
              box-shadow var(--transition-base),
              background var(--transition-fast);
}
.interactive:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}
```

---

## 2. App Layout

```
┌─────────────────────────────────────────────────────────┐
│  HEADER (60px)                                          │
│  [🎓 Logo + Name]  [Nav: Explore | Check | Plan | Degree]│
└─────────────────────────────────────────────────────────┘
│                                                         │
│  SIDEBAR (280px)  │     MAIN CANVAS                    │
│  ─────────────── │     (Graph visualization or         │
│  Search Bar       │      content area)                  │
│  ─────────────── │                                     │
│  Filters:         │                                     │
│  · Department     │                                     │
│  · Level          │                                     │
│  · Semester       │                                     │
│  ─────────────── │                                     │
│  [View: Explore]  │                                     │
│  Quick stats:     │                                     │
│  · X courses      │                              │      │
│  · Y depts        │                              │      │
│                   │                              ▼      │
│                   │              DETAIL PANEL (360px)   │
│                   │              (slides in from right) │
└───────────────────┴─────────────────────────────────────┘
```

---

## 3. Views / Screens

### 3.1 Home / Overview (`#home`)
**Purpose:** First impression — show the full course graph

**Elements:**
- Full-viewport Cytoscape graph of all courses
- Each node = one course (colored by department)
- Edges = prerequisite relationships with arrows
- Subtle animated particle background behind the graph
- Top overlay: "Click any course to explore it" tooltip (dismissible)
- Bottom-left legend: department color mapping
- Zoom controls (+ / - / fit)

**Empty State:** If DB is unreachable: centered error card with university illustration, retry button, and error message from server

---

### 3.2 Prerequisite Explorer (`#explore`)
**Purpose:** Search and explore a specific course's full prerequisite tree

**Layout:** Sidebar (search + results) + Main canvas (subgraph)

**Flow:**
1. Student types in search bar → debounced autocomplete dropdown appears (300ms delay)
2. Autocomplete shows: course code + name + department badge
3. Student selects a course → subgraph loads showing prerequisite chain
4. Nodes at different hop levels have different visual weight (hop 1 = larger, hop 3+ = smaller)
5. Direct prerequisite edges = solid bright lines
6. Transitive (2+ hop) edges = dimmer, dashed

**Node Legend:**
- 🔴 Selected course (center)
- 🟡 Direct prerequisite (1 hop)
- 🟠 2nd-level prerequisite (2 hops)
- ⚪ 3rd+ level prerequisite (3+ hops)

---

### 3.3 Eligibility Checker (`#eligibility`)
**Purpose:** Student inputs completed courses → sees what's unlocked

**Layout:** Split — Left: completed courses selector / Right: results

**Flow:**
1. Left panel: "Your Completed Courses" — searchable multi-select list
2. Student checks boxes → results update in real time (debounced 500ms)
3. Right panel shows three sections:
   - ✅ **Unlocked Now** (green cards) — all prereqs satisfied
   - ⚡ **Almost There** (amber cards) — exactly 1 prereq away, shows which one
   - 🔒 **Still Locked** (gray, collapsed by default) — show count

**Card Design (each course):**
```
┌──────────────────────────────────┐
│ [CS badge]  CS 401               │
│ Machine Learning          4 cr   │
│ ─────────────────────────────── │
│ 🟢 Unlocked! Ready to enroll     │
│                                  │
│ [View Prerequisites] [Add to Plan]│
└──────────────────────────────────┘
```

---

### 3.4 Learning Path Planner (`#planner`)
**Purpose:** Pick a target course → see exact sequence of courses to get there

**Layout:** Two-column — Left: target course picker / Right: path visualization

**Flow:**
1. Student enters their completed courses (same as eligibility checker — persists via `AppState`)
2. Student searches for a target course
3. App calls shortest path API → renders the path as a linear flow diagram
4. Each step in the path is a course card with:
   - Step number
   - Course code + name
   - Credits
   - Semester offered
   - Whether student has already completed it (highlighted in blue)
5. At bottom: "Total new courses needed: X | Total credits: Y"

**Path Visualization:**
```
[CS 101] ──→ [CS 201] ──→ [CS 301] ──→ [CS 401]  ← TARGET
✅ Done      ✅ Done      🔓 Next       🎯 Goal
```

---

### 3.5 Degree Map (`#degree`)
**Purpose:** Full degree program view with locked/unlocked status

**Layout:** Degree selector dropdown + grid of course cards grouped by category

**Flow:**
1. Student selects degree from dropdown (BS CS, BS DS, MS CS)
2. Progress bar shows: "X of Y required courses completed (Z%)"
3. Cards grouped by category: Core | Electives | Concentration | Capstone
4. Each card is color-coded:
   - Blue border = completed
   - Green border = unlocked and ready
   - Amber border = almost there
   - Gray border = locked (prereqs not met)
5. Click any card → opens course detail panel

---

### 3.6 Course Detail Panel (Slide-in from right)
**Purpose:** Deep dive into a single course

**Triggered by:** Clicking any course node or card

**Content:**
```
┌─────────────────────────────────────────┐
│  ← Back          [CS] badge             │
│                                         │
│  CS 401                                 │
│  Machine Learning              ⭐        │
│  ─────────────────────────────────── │
│  4 credits | 400 level | Fall/Spring   │
│                                         │
│  Dr. Sarah Chen · Computer Science     │
│                                         │
│  DESCRIPTION                            │
│  Introduction to machine learning...   │
│                                         │
│  PREREQUISITES (2)                      │
│  [CS 301] Algorithms                   │
│  [MATH 301] Probability & Statistics   │
│                                         │
│  UNLOCKS (3)                            │
│  [CS 499] Senior Capstone              │
│  [CS 450] Deep Learning                │
│  ...                                    │
│                                         │
│  TOPICS COVERED                         │
│  [ML] [Statistics] [Python] [AI]       │
│                                         │
│  RELATED COURSES                        │
│  [CS 402] Artificial Intelligence      │
│  ...                                    │
│                                         │
│  [View Full Prerequisite Graph]        │
└─────────────────────────────────────────┘
```

---

## 4. Components

### 4.1 Search Bar
```html
<div class="search-container">
  <div class="search-icon">🔍</div>
  <input 
    type="text" 
    id="course-search"
    class="search-input"
    placeholder="Search courses by name or code..."
    autocomplete="off"
    aria-label="Search courses"
  />
  <div class="search-results" id="search-dropdown" role="listbox" aria-live="polite">
    <!-- Populated by search.js -->
  </div>
</div>
```

### 4.2 Course Card
```html
<article class="course-card" data-course-id="cs-401" data-status="unlocked">
  <div class="course-card__header">
    <span class="dept-badge" style="--dept-color: #6366f1">CS</span>
    <span class="course-code">CS 401</span>
    <span class="course-credits">4 cr</span>
  </div>
  <h3 class="course-name">Machine Learning</h3>
  <div class="course-meta">
    <span class="course-level">400 Level</span>
    <span class="course-semester">Fall/Spring</span>
  </div>
  <div class="course-status status--unlocked">
    <span class="status-dot"></span>
    Unlocked
  </div>
</article>
```

### 4.3 Loading State
```html
<div class="loading-state" aria-live="polite" aria-label="Loading courses">
  <div class="loading-spinner"></div>
  <p>Loading course graph...</p>
</div>
```
```css
.loading-spinner {
  width: 40px; height: 40px;
  border: 3px solid var(--border-subtle);
  border-top-color: var(--brand-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
```

### 4.4 Empty State
```html
<div class="empty-state">
  <div class="empty-state__icon">🔍</div>
  <h3>No courses found</h3>
  <p>Try searching with a different term or clearing your filters.</p>
  <button class="btn-secondary" onclick="clearFilters()">Clear Filters</button>
</div>
```

### 4.5 Error Banner (DB Unavailable)
```html
<div class="error-banner" role="alert">
  <span class="error-icon">⚠️</span>
  <div>
    <strong>Database Unavailable</strong>
    <p>Could not connect to the course database. Please try again in a moment.</p>
  </div>
  <button class="btn-retry" onclick="retryConnection()">Retry</button>
</div>
```

---

## 5. Graph Visualization (Cytoscape.js)

### 5.1 Node Styles
```javascript
const nodeStyle = {
  'label': 'data(label)',          // Shows course code
  'background-color': 'data(color)',
  'color': '#f1f5f9',
  'text-valign': 'bottom',
  'text-halign': 'center',
  'font-size': '11px',
  'font-family': 'Inter, sans-serif',
  'width': 'mapData(credits, 1, 4, 30, 55)',  // Bigger node = more credits
  'height': 'mapData(credits, 1, 4, 30, 55)',
  'border-width': 2,
  'border-color': 'rgba(255,255,255,0.15)',
  'transition-property': 'background-color, border-color, width, height',
  'transition-duration': '200ms',
};

// Hover state
const nodeHoverStyle = {
  'border-color': '#6366f1',
  'border-width': 3,
  'box-shadow': '0 0 20px rgba(99,102,241,0.5)',
};

// Selected state
const nodeSelectedStyle = {
  'background-color': '#6366f1',
  'border-color': '#818cf8',
  'border-width': 4,
};
```

### 5.2 Edge Styles
```javascript
const edgeStyle = {
  'width': 1.5,
  'line-color': 'rgba(255,255,255,0.2)',
  'target-arrow-color': 'rgba(255,255,255,0.3)',
  'target-arrow-shape': 'triangle',
  'curve-style': 'bezier',
  'arrow-scale': 0.8,
};

// Mandatory prerequisite edge
const mandatoryEdgeStyle = {
  'line-color': 'rgba(99,102,241,0.5)',
  'target-arrow-color': '#6366f1',
};

// Recommended prerequisite edge
const recommendedEdgeStyle = {
  'line-style': 'dashed',
  'line-color': 'rgba(99,102,241,0.25)',
};
```

### 5.3 Layout Configuration
```javascript
const layoutConfig = {
  name: 'dagre',
  rankDir: 'BT',           // Bottom to Top — entry courses at bottom, advanced at top
  ranker: 'tight-tree',
  nodeSep: 60,
  rankSep: 80,
  padding: 40,
  animate: true,
  animationDuration: 400,
  fit: true,
};
```

---

## 6. Responsive Behavior

The app is **desktop-first** (1024px+). At 768px–1023px (tablet):
- Sidebar collapses into a top toolbar
- Detail panel becomes a bottom sheet
- Graph takes full width

Below 768px: Display a "Best viewed on desktop" message.

---

## 7. Performance UX

| Scenario | UX Behavior |
|---|---|
| API call in progress | Spinner replaces content, not a full-page loader |
| Graph loading | Skeleton placeholder nodes animate before real graph renders |
| Search typing | 300ms debounce — no flicker |
| Eligibility recompute | 500ms debounce on checkbox changes |
| Course detail load | Panel slides in with 250ms animation; spinner inside panel |

---

## 8. Accessibility Checklist

- [ ] All interactive elements have `aria-label` or visible label
- [ ] Focus ring visible on keyboard navigation
- [ ] Color is not the only way to convey status (use icons + text alongside color)
- [ ] Graph has a fallback text list for screen readers
- [ ] Search dropdown has `role="listbox"` and keyboard navigation
- [ ] `aria-live="polite"` on result count changes
