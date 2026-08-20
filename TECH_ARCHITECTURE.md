# 🏗️ Technical Architecture Document
## College Course Prerequisite Explorer

---

## 1. Technology Stack

### Mandatory (from assignment)
| Layer | Technology | Reason |
|---|---|---|
| **Graph Database** | CognoDB Cloud | Assignment requirement — openCypher / Bolt 5.x |
| **DB Driver** | `neo4j-driver` (npm, v5.x) | Official Neo4j JavaScript driver for Bolt |
| **Cypher** | openCypher (parameterized) | No string concatenation allowed |

### Application Stack
| Layer | Technology | Version | Reason |
|---|---|---|---|
| **Runtime** | Node.js | 20 LTS | Stable LTS, broad ecosystem |
| **Backend Framework** | Express.js | 4.x | Lightweight, clean API layer, easy to walk through in interview |
| **Frontend Framework** | React + Vite | 18.x / 5.x | Fast component rendering, reactive state management, modern UI polish |
| **Graph Visualization** | Cytoscape.js + cytoscape-dagre | 3.x | Best interactive graph library for prerequisite DAGs; DAG layout engine |
| **Icons** | Lucide React | Latest | Crisp modern icons for cards, badges, and controls |
| **Environment Vars** | dotenv | 16.x | `.env` file support for local dev |
| **Hosting** | Render.com | free tier | Supports Node.js, persistent service, free SSL |

> **Why React + Vite?** React provides clean, modular component architecture for reactive views (eligibility checklist recalculation, shortest path milestones, drawer animations), while Vite ensures instant build and minimal bundle size. Express directly serves the compiled static files in production for a simple, unified deployment.

---

## 2. Project Folder Structure

```
college-course-explorer/
├── .env.example              # Template — shows required env vars (NO actual secrets)
├── .env                      # GITIGNORED — actual secrets
├── .gitignore
├── package.json
├── package-lock.json
├── README.md                 # Required by assignment — includes diagram, setup, queries
│
├── server/                   # Backend (Node.js + Express)
│   ├── index.js              # Entry point — Express app setup, middleware, graceful error handling
│   ├── db.js                 # CognoDB driver singleton — reads from env vars
│   ├── routes/
│   │   ├── courses.js        # Course CRUD and search endpoints
│   │   ├── graph.js          # Graph traversal endpoints (prerequisites, paths, etc.)
│   │   ├── degrees.js        # Degree map endpoints
│   │   └── eligibility.js    # Eligibility checker endpoints
│   └── queries/
│       ├── courseQueries.js  # All Cypher queries as named, parameterized functions
│       ├── graphQueries.js   # Traversal queries
│       └── degreeQueries.js  # Degree-related queries
│
├── client/                   # Frontend (Vanilla HTML/CSS/JS)
│   ├── index.html            # Single-page app shell
│   ├── css/
│   │   ├── main.css          # Global design system (variables, typography, layout)
│   │   ├── components.css    # Reusable component styles (cards, panels, badges)
│   │   └── graph.css         # Cytoscape container and overlay styles
│   ├── js/
│   │   ├── app.js            # App initialization, routing between views
│   │   ├── api.js            # Centralized fetch wrapper — all API calls go here
│   │   ├── graph.js          # Cytoscape.js initialization and graph rendering
│   │   ├── search.js         # Search bar logic and autocomplete
│   │   ├── eligibility.js    # Eligibility checker UI logic
│   │   ├── pathPlanner.js    # Learning path planner UI logic
│   │   └── degreeMap.js      # Degree map UI logic
│   └── assets/
│       └── logo.svg
│
├── scripts/
│   ├── seed.js               # Seeds CognoDB with realistic university data
│   ├── clear.js              # Clears all data (for re-seeding)
│   └── data/
│       ├── courses.json      # Course definitions
│       ├── departments.json  # Department definitions
│       ├── degrees.json      # Degree program definitions
│       ├── instructors.json  # Instructor data
│       └── relationships.json # Prerequisite, co-req, topic relationships
│
└── docs/
    ├── data-model.png        # Graph schema diagram (exported from draw.io)
    ├── PRD.md
    ├── TECH_ARCHITECTURE.md
    ├── DATA_MODEL.md
    ├── CYPHER_QUERIES.md
    └── UI_UX_SPEC.md
```

---

## 3. Backend Architecture

### 3.1 Express App (`server/index.js`)

```
Request → Express Router → Route Handler → Query Function → neo4j-driver → CognoDB
                                       ↓ (error)
                                  Error Middleware → JSON error response
```

**Middleware stack (in order):**
1. `helmet()` — security headers
2. `cors()` — allow frontend origin
3. `express.json()` — JSON body parsing
4. Route handlers
5. `404 handler` — catches unknown routes
6. `DB error handler` — detects `ServiceUnavailable` and returns 503

### 3.2 Database Module (`server/db.js`)

```javascript
// Pattern: Singleton driver, lazy session creation
const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic('cognodb', process.env.NEO4J_PASSWORD)
);

// All queries use: driver.session().run(query, params)
// Sessions are always closed in finally blocks
```

**Error handling:** If CognoDB is unreachable, the error middleware catches `ServiceUnavailable` and returns:
```json
{ "error": "Database is currently unavailable. Please try again later.", "code": 503 }
```

### 3.3 Query Pattern (ALL queries must follow this)

```javascript
// CORRECT — parameterized
const result = await session.run(
  'MATCH (c:Course {id: $courseId}) RETURN c',
  { courseId: req.params.id }  // params object
);

// FORBIDDEN — string concatenation
const result = await session.run(
  `MATCH (c:Course {id: "${req.params.id}"}) RETURN c`  // NEVER DO THIS
);
```

---

## 4. API Endpoints

### Courses
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/courses` | List all courses (with optional `?department=` and `?level=` filters) |
| `GET` | `/api/courses/:id` | Get course details |
| `GET` | `/api/courses/search?q=` | Search courses by name or code |
| `GET` | `/api/courses/:id/prerequisites` | Get full prerequisite chain (all hops) |
| `GET` | `/api/courses/:id/unlocks` | Get courses this course unlocks (outgoing) |

### Graph Traversal
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/graph/full` | Full course graph (nodes + edges) for visualization |
| `GET` | `/api/graph/department/:deptId` | Subgraph filtered to a department |
| `POST` | `/api/graph/path` | Body: `{from: courseId, to: courseId}` — shortest path between two courses |

### Eligibility
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/eligibility/check` | Body: `{completed: [courseId,...]}` — returns unlocked courses |
| `POST` | `/api/eligibility/next` | Body: `{completed: [courseId,...]}` — courses 1 prerequisite away |

### Degrees
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/degrees` | List all degree programs |
| `GET` | `/api/degrees/:id` | Degree details with all required courses |
| `POST` | `/api/degrees/:id/progress` | Body: `{completed: [courseId,...]}` — degree completion map |

---

## 5. Frontend Architecture

### 5.1 Single-Page App Navigation

The frontend is a vanilla SPA — no router library. Navigation is handled via hash-based routing:

```
#home        → Landing page with full graph overview
#explore     → Prerequisite Explorer (search + graph)
#eligibility → Eligibility Checker
#planner     → Learning Path Planner
#degree      → Degree Map
```

`app.js` listens to `hashchange` events and shows/hides the appropriate view.

### 5.2 Cytoscape.js Graph Rendering

- **Layout:** `dagre` layout (Directed Acyclic Graph — perfect for prerequisites)
- **Node styling:** Color by department, size by number of courses it unlocks
- **Edge styling:** Solid arrow for mandatory prerequisite, dashed for recommended
- **Interactions:** `tap` to select a node → opens Course Detail Panel

### 5.3 State Management

No framework-level state. Simple module-level objects:

```javascript
// In app.js
const AppState = {
  completedCourses: [],    // Array of courseIds the student has completed
  selectedCourse: null,    // Currently selected course node
  currentView: 'home',     // Active view
  graphInstance: null,     // Cytoscape instance reference
};
```

---

## 6. Environment Variables

| Variable | Description | Example |
|---|---|---|
| `NEO4J_URI` | CognoDB Bolt connection string | `bolt+s://abc123.databases.cognodb.cloud` |
| `NEO4J_PASSWORD` | CognoDB generated password | `your-generated-password` |
| `PORT` | Express server port | `3000` |
| `NODE_ENV` | Environment name | `development` or `production` |

**`.env.example`** (committed to repo — template with no real values):
```
NEO4J_URI=bolt+s://YOUR_INSTANCE_ID.databases.cognodb.cloud
NEO4J_PASSWORD=YOUR_PASSWORD_HERE
PORT=3000
NODE_ENV=development
```

**`.gitignore`** must include:
```
.env
node_modules/
```

---

## 7. Error Handling Strategy

| Scenario | Backend Response | Frontend Behavior |
|---|---|---|
| DB unreachable | `503 { error: "Database unavailable" }` | Show full-screen error banner with retry button |
| Course not found | `404 { error: "Course not found" }` | Show "No results" empty state in panel |
| Invalid params | `400 { error: "..." }` | Show inline validation message |
| Server crash | `500 { error: "Internal server error" }` | Show generic error toast |
| Empty graph | `200 { nodes: [], edges: [] }` | Show "No courses found" empty state with illustration |

---

## 8. Hosting (Render.com)

1. Connect GitHub repo to Render
2. Create a **Web Service** (Node.js)
3. Set environment variables in Render dashboard (NEO4J_URI, NEO4J_PASSWORD)
4. Build command: `npm install`
5. Start command: `node server/index.js`
6. Free tier: 512MB RAM, spins down after 15 min inactivity (acceptable for demo)

**The Express server serves both the API and the static client files:**
```javascript
app.use(express.static(path.join(__dirname, '../client')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../client/index.html')));
```

---

## 9. Performance Considerations

- **CognoDB indexes:** Create indexes on `Course.id`, `Course.code`, `Course.name` and `Department.id` in the seed script
- **Graph size:** Keep to ~200–300 courses, ~400–600 prerequisite edges (well within free tier limits)
- **Cytoscape:** Use `batch()` updates when rendering large graphs to avoid repaints
- **API:** No caching needed for demo scale

---

## 10. Development Setup

```bash
# Clone repo
git clone <repo-url>
cd college-course-explorer

# Install dependencies
npm install

# Copy env template
cp .env.example .env
# Edit .env with your CognoDB credentials

# Seed the database
node scripts/seed.js

# Start dev server
node server/index.js

# Open browser
open http://localhost:3000
```
