---
name: project-context
description: >
  Full project context for the College Course Prerequisite Explorer — a WEXA AI
  take-home assignment. Read this skill FIRST before writing any code for this project.
  Covers: assignment requirements, tech stack, folder structure, data model, all API
  endpoints, and coding rules.
---

# Project Context: College Course Prerequisite Explorer

## Assignment

This is the **WEXA AI CognoDB Take-Home Assignment**.

- **Submit to:** hr@wexa.ai
- **Subject line:** "CognoDB Assignment 2 – <Your Name>"
- **Deadline:** 48 hours from receipt
- **Deliverables:** GitHub repo + hosted demo link + screen recording

---

## What We're Building

A web application that models a university's course catalog as a **graph database**, allowing
students to:

1. **Visualize** the entire course prerequisite graph interactively
2. **Explore** any course's full prerequisite chain (multi-hop)
3. **Check eligibility** — given completed courses, what can I take now?
4. **Plan a learning path** — what's the shortest route to take Course X?
5. **View a degree map** — all required courses, locked/unlocked status

---

## Mandatory Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| **Database** | CognoDB Cloud | openCypher + Bolt 5.x — assignment requirement |
| **DB Driver** | `neo4j-driver` npm package (v5.x) | Official Neo4j JS driver — works with CognoDB |
| **Backend** | Node.js + Express.js | Simple, readable, interview-friendly |
| **Frontend** | Vanilla HTML5 + CSS3 + JavaScript ES6+ | No framework — maximally readable |
| **Graph Viz** | Cytoscape.js | DAG layout (`dagre`), interactive, lightweight |
| **Env Vars** | `dotenv` | Secrets NEVER in source code |
| **Hosting** | Render.com | Free tier Node.js web service |

---

## Non-Negotiable Rules (from assignment)

1. **ALL Cypher queries MUST be parameterized** — never concatenate user input into queries
2. **Credentials (NEO4J_URI, NEO4J_PASSWORD) MUST come from environment variables** — NEVER commit them
3. **Graceful error handling** when CognoDB is unreachable (return HTTP 503 + show error UI)
4. **README must have:** "Why a graph database?" section, data model diagram, setup instructions, main queries explained, and UI screenshots

---

## Folder Structure

```
college-course-explorer/
├── .env.example              # Template — committed to repo
├── .env                      # GITIGNORED — real secrets
├── .gitignore
├── package.json
├── README.md
│
├── server/
│   ├── index.js              # Express entry point
│   ├── db.js                 # Driver singleton (reads NEO4J_URI, NEO4J_PASSWORD)
│   └── routes/
│       ├── courses.js
│       ├── graph.js
│       ├── degrees.js
│       └── eligibility.js
│
├── client/
│   ├── index.html
│   ├── css/
│   │   ├── main.css          # Design system variables + global styles
│   │   ├── components.css    # Reusable components
│   │   └── graph.css         # Cytoscape container styles
│   └── js/
│       ├── app.js            # SPA routing via hashchange
│       ├── api.js            # All fetch() calls centralized here
│       ├── graph.js          # Cytoscape.js setup
│       ├── search.js
│       ├── eligibility.js
│       ├── pathPlanner.js
│       └── degreeMap.js
│
└── scripts/
    ├── seed.js               # Seeds CognoDB
    ├── clear.js              # Clears DB
    └── data/
        ├── courses.json
        ├── departments.json
        ├── degrees.json
        ├── instructors.json
        └── relationships.json
```

---

## Data Model Summary

### Nodes
- `(:Course)` — id, code, name, description, credits, level, semester, isCore
- `(:Department)` — id, code, name, color
- `(:Instructor)` — id, name, email, title
- `(:Degree)` — id, name, type, totalCredits
- `(:Topic)` — id, name, category

### Relationships
- `(Course)-[:REQUIRES {type, minGrade}]->(Course)` — prerequisite
- `(Course)-[:COREQUISITE_OF]->(Course)` — must take together
- `(Department)-[:OFFERS]->(Course)`
- `(Instructor)-[:TEACHES]->(Course)`
- `(Degree)-[:INCLUDES {required, category}]->(Course)`
- `(Course)-[:COVERS {depth}]->(Topic)`

### Key Convention
`(A)-[:REQUIRES]->(B)` means **"take A before B"** (A is a prerequisite for B)

---

## API Endpoints

### Courses
- `GET /api/courses` — all courses, optional `?department=&level=` filters
- `GET /api/courses/:id` — single course with full details
- `GET /api/courses/search?q=` — search by name or code
- `GET /api/courses/:id/prerequisites` — full prerequisite chain (all hops)
- `GET /api/courses/:id/unlocks` — courses this unlocks

### Graph
- `GET /api/graph/full` — all nodes + edges for overview visualization
- `GET /api/graph/department/:deptId` — department subgraph
- `POST /api/graph/path` — body: `{from, to}` — shortest path

### Eligibility
- `POST /api/eligibility/check` — body: `{completed: [id,...]}` — unlocked courses
- `POST /api/eligibility/next` — body: `{completed: [id,...]}` — courses 1 prereq away

### Degrees
- `GET /api/degrees` — list all degrees
- `GET /api/degrees/:id` — degree with courses
- `POST /api/degrees/:id/progress` — body: `{completed: [id,...]}` — degree progress

---

## Key Cypher Queries to Know

### Multi-hop prerequisite traversal (REQUIRED by assignment)
```cypher
MATCH path = (prereq:Course)-[:REQUIRES*1..10]->(c:Course {id: $courseId})
RETURN DISTINCT prereq { .*, hopCount: length(path) }
ORDER BY hopCount ASC
```

### Shortest path (REQUIRED by assignment)
```cypher
MATCH path = shortestPath(
  (from:Course {id: $fromId})-[:REQUIRES*]-(to:Course {id: $toId})
)
RETURN [n IN nodes(path) | n { .id, .code, .name }] AS pathCourses
```

### Eligibility checker (relational-DB-awkward query — REQUIRED)
```cypher
MATCH (c:Course)
WHERE NOT c.id IN $completedIds
OPTIONAL MATCH (prereq:Course)-[:REQUIRES]->(c)
WITH c, collect(prereq.id) AS prereqIds
WHERE ALL(pid IN prereqIds WHERE pid IN $completedIds)
MATCH (d:Department)-[:OFFERS]->(c)
RETURN c { .*, department: d { .id, .name, .code, .color } }
```

---

## Design System

- **Dark theme** — background: `#0a0a0f`, cards: `#12121a`
- **Brand color** — Indigo `#6366f1`
- **Font** — Inter (Google Fonts) for UI, JetBrains Mono for code/course codes
- **Department colors**: CS=#6366f1, MATH=#10b981, EE=#f59e0b, PHYS=#ec4899, DS=#06b6d4
- **Status colors**: unlocked=#10b981, locked=#6b7280, completed=#3b82f6, almost=#f59e0b
- **Graph layout**: Cytoscape `dagre`, direction `BT` (bottom-to-top)

---

## Seed Data Summary

- **University name:** Lakewood University
- **~60 courses** across 5 departments (CS, MATH, EE, PHYS, DS)
- **~80 prerequisite relationships**
- **3 degree programs** (BS CS, BS DS, MS CS)
- **~20 topics** (Algorithms, ML, Databases, OS, Networks, etc.)

---

## Error Handling Requirements

| Scenario | Backend | Frontend |
|---|---|---|
| DB unreachable | HTTP 503 `{error: "Database unavailable"}` | Full-screen error banner + retry button |
| Course not found | HTTP 404 `{error: "Course not found"}` | Empty state in detail panel |
| Invalid params | HTTP 400 | Inline validation message |
| Server crash | HTTP 500 | Generic error toast |

---

## Hosting (Render.com)

1. Connect GitHub repo
2. Create Web Service (Node.js)
3. Set env vars in dashboard: `NEO4J_URI`, `NEO4J_PASSWORD`, `NODE_ENV=production`
4. Build: `npm install`
5. Start: `node server/index.js`

The Express server serves both the API (`/api/*`) and the static client (`client/`).

---

## Skills to Read for Specific Tasks

- **`cognodb-driver`** — When writing any db.js, session code, or seed scripts
- **`project-context`** (this file) — Always read first
