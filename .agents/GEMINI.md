# AGENTS.md — AI Agent Rules
## College Course Prerequisite Explorer

> Read this file FIRST before writing any code for this project.
> Then read `.agents/skills/project-context/SKILL.md` for full technical context.

---

## Project Identity

**Name:** College Course Prerequisite Explorer  
**Assignment:** WEXA AI Take-Home — CognoDB Graph Database Application  
**Stack:** Node.js + Express + CognoDB (via neo4j-driver) + Vanilla HTML/CSS/JS + Cytoscape.js  
**Deadline:** 48 hours. Every decision should optimize for a polished, complete, working app.

---

## MANDATORY RULES (Zero Tolerance)

### Rule 1 — Parameterized Queries ONLY
```javascript
// ✅ ALWAYS do this
session.run('MATCH (c:Course {id: $id}) RETURN c', { id: courseId });

// ❌ NEVER do this — automatic disqualification
session.run(`MATCH (c:Course {id: "${courseId}"}) RETURN c`);
```

### Rule 2 — No Secrets in Source Code
- `NEO4J_URI` and `NEO4J_PASSWORD` must ONLY come from `process.env`
- The `.env` file is gitignored
- Only `.env.example` (with placeholder values) is committed

### Rule 3 — Always Handle DB Errors
- Every database call must be inside a try/catch
- If CognoDB is unreachable, return HTTP 503 with `{ error: "Database unavailable" }`
- The frontend must show an error banner (not a blank page) when the DB is down

### Rule 4 — Always Close Sessions
```javascript
const session = driver.session();
try {
  // ... queries
} finally {
  await session.close(); // Required — even if an error occurs
}
```

### Rule 5 — Neo4j Integer Conversion
Neo4j returns Integer objects, not JavaScript numbers. Always convert:
```javascript
const credits = neo4j.integer.toNumber(record.get('c').properties.credits);
```

---

## Code Style Rules

### General
- Use `const` by default, `let` only when reassignment is needed
- Use `async/await` — never raw `.then()` chains
- Use meaningful variable names — no `x`, `y`, `tmp`
- Every function must have a single, clear purpose
- Add JSDoc comments to all exported functions

### Express Routes
```javascript
// Pattern for every route handler
router.get('/:id', async (req, res, next) => {
  try {
    const data = await queryFunction(req.params.id);
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  } catch (err) {
    next(err); // Always delegate to error middleware
  }
});
```

### Frontend JavaScript
- No inline event handlers in HTML (`onclick="..."`) — attach listeners in JS
- All API calls go through `api.js` — never call `fetch()` directly from other modules
- Use `data-*` attributes on DOM elements to store course IDs
- Loading state: show spinner BEFORE fetch, hide AFTER (always, even on error)

### CSS Rules
- All colors from CSS variables (`var(--brand-primary)`) — no raw hex values in components
- No `!important` declarations
- All animations via CSS transitions — no JavaScript-driven animations except for Cytoscape
- Mobile-first NOT required — desktop-first for this project

---

## File Organization Rules

- All Cypher query strings live in `server/queries/*.js` — never inline in routes
- All `fetch()` calls live in `client/js/api.js` — never inline in view modules
- Seed data lives in `scripts/data/*.json` — not hardcoded in `seed.js`
- Routes only handle HTTP — no business logic — delegate to query functions

---

## Naming Conventions

| Type | Convention | Example |
|---|---|---|
| Files | kebab-case | `course-queries.js` |
| JS functions | camelCase | `getCoursePrerequisites()` |
| JS constants | SCREAMING_SNAKE | `MAX_HOP_DEPTH = 10` |
| CSS classes | BEM-ish kebab | `.course-card__header` |
| CSS variables | `--category-name` | `--status-unlocked` |
| Data IDs | kebab-case | `"cs-401"`, `"dept-math"` |
| API routes | kebab-case | `/api/courses/:id/prerequisites` |

---

## Cytoscape.js Rules

- Always use `dagre` layout (DAG-optimized for prerequisite chains)
- Set `rankDir: 'BT'` (bottom-to-top — entry courses at bottom, advanced at top)
- Mandatory prerequisite edges: solid line, indigo color
- Recommended edges: dashed line, dimmer color
- Node size maps to course credits (`mapData(credits, 1, 4, 30, 55)`)
- Node color maps to department (use `--dept-*` CSS variables converted to hex)

---

## What "Done" Looks Like

A complete submission has ALL of these:
- [ ] CognoDB seeded with realistic data (seed script works from a fresh DB)
- [ ] Express API running with all endpoints from the API spec
- [ ] Frontend renders the full course graph on page load
- [ ] Course search works (name or code)
- [ ] Prerequisite Explorer shows multi-hop chains
- [ ] Eligibility Checker shows unlocked/almost/locked courses
- [ ] Learning Path Planner shows shortest path
- [ ] Degree Map shows progress overlay
- [ ] Course Detail Panel shows on node click
- [ ] Error state shows when DB is unreachable
- [ ] Empty state shows when no results
- [ ] Loading spinner shows during API calls
- [ ] README has: "Why graph?", data model diagram, setup steps, queries explained, screenshots
- [ ] Hosted on Render.com with env vars set in dashboard
- [ ] `.env` is gitignored, `.env.example` is committed

---

## Assignment Evaluation Criteria (prioritize these)

1. **Graph data model quality** — Does the schema make sense? Are node labels and relationships well-typed?
2. **Cypher sophistication** — Are there multi-hop traversals? Queries a relational DB would find hard?
3. **Parameterized queries** — 100% compliant? Any string concatenation = immediate failure
4. **UI/UX polish** — Loading states, empty states, typography, color, responsive layout
5. **"Why graph?" argument** — Is it convincing, specific, and in the README?
6. **Code quality** — Is the architecture clean? Could the reviewer walk through it line by line?
7. **Hosted demo** — Is there a live URL the reviewer can visit?

---

## Quick Reference

### Start the app locally
```bash
npm install
cp .env.example .env
# Fill in NEO4J_URI and NEO4J_PASSWORD in .env
node scripts/seed.js   # Seed the database first
node server/index.js   # Start the server
# Open http://localhost:3000
```

### Re-seed (clear + seed)
```bash
node scripts/clear.js && node scripts/seed.js
```

### Key files to know
- `server/db.js` — Driver singleton
- `server/index.js` — Express setup + error middleware
- `client/js/api.js` — All fetch() calls
- `client/js/graph.js` — Cytoscape.js instance
- `scripts/seed.js` — Database seeder
