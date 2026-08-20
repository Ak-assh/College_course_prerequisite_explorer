# 🎓 College Course Prerequisite Explorer

> **WEXA AI — CognoDB Take-Home Assignment**  
> A graph database application built on CognoDB (openCypher/Bolt) that lets students visually
> explore course prerequisite chains, check eligibility, and plan their academic path.

🚀 **[Live Demo](#)** · 📹 **[Screen Recording](#)** · 📊 **[Data Model](#data-model)**

---

## Why a Graph Database?

The course prerequisite structure is **inherently a directed graph**. Each course depends on other courses, which depend on others, forming chains 4–6 hops deep.

**The key question:** *"What does a student need before taking CS 401 (Machine Learning)?"*

**In SQL (recursive CTE):**
```sql
WITH RECURSIVE prereqs AS (
  SELECT from_course FROM prerequisites WHERE to_course = 'cs-401'
  UNION ALL
  SELECT p.from_course FROM prerequisites p
  JOIN prereqs r ON p.to_course = r.from_course
)
SELECT * FROM courses WHERE id IN (SELECT from_course FROM prereqs);
```
This grows increasingly complex with each hop and requires database-level recursive query support.

**In Cypher (one line):**
```cypher
MATCH path = (prereq:Course)-[:REQUIRES*1..6]->(c:Course {id: 'cs-401'})
RETURN DISTINCT prereq, length(path) AS hopCount
```

Graph databases win here because:
1. **Traversal is native** — graph engines are optimized for relationship traversal
2. **Variable-depth queries** — changing `*1..6` to `*` searches unlimited depth
3. **Shortest path** — `shortestPath()` is a built-in primitive
4. **Eligibility check** — "find all courses where ALL prerequisites are in a given set" uses Cypher's `ALL()` predicate cleanly; SQL requires correlated `NOT EXISTS` subqueries
5. **The data IS a graph** — prerequisite chains, degree dependencies, topic relationships — all of it is naturally represented as nodes and edges

---

## Data Model

```
(Department)──OFFERS──▶(Course)──REQUIRES──▶(Course)
                           │                    │
                       TAUGHT_BY            COVERS
                           │                    │
                     (Instructor)           (Topic)

(Degree)──INCLUDES──▶(Course)
```

### Nodes
| Label | Key Properties |
|---|---|
| `Course` | id, code, name, credits, level, semester, isCore |
| `Department` | id, code, name, color |
| `Instructor` | id, name, email, title |
| `Degree` | id, name, type, totalCredits |
| `Topic` | id, name, category |

### Relationships
| Relationship | From → To | Properties |
|---|---|---|
| `REQUIRES` | Course → Course | type (mandatory/recommended), minGrade |
| `COREQUISITE_OF` | Course ↔ Course | note |
| `OFFERS` | Department → Course | — |
| `TEACHES` | Instructor → Course | semester |
| `INCLUDES` | Degree → Course | required, category |
| `COVERS` | Course → Topic | depth |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Database** | CognoDB Cloud (openCypher / Bolt 5.x) |
| **DB Driver** | `neo4j-driver` v5 (official Neo4j JavaScript driver) |
| **Backend** | Node.js + Express.js |
| **Frontend** | React 18 + Vite |
| **Graph Visualization** | Cytoscape.js with `dagre` layout |
| **Backend Hosting** | Render.com Web Service |
| **Frontend Hosting** | Vercel |

---

## Deployment (Render + Vercel)

For step-by-step instructions on deploying the backend to **Render** and the frontend to **Vercel**, refer to the detailed [DEPLOYMENT.md](file:///c:/Users/KIIT/Desktop/College_Course_prerequisite_explorer/DEPLOYMENT.md) guide.

- **Backend (Render):** [https://college-course-prerequisite-explorer.onrender.com](https://college-course-prerequisite-explorer.onrender.com) (API Health: `/api/health`)
- **Frontend (Vercel):** React Vite application with `VITE_API_URL` pointing to `https://college-course-prerequisite-explorer.onrender.com`.

---

## Setup & Run

### Prerequisites
- Node.js 20+
- A free [CognoDB Cloud](https://console.cognodb.com/signup) account

### 1. Create CognoDB Instance
1. Sign up at [console.cognodb.com/signup](https://console.cognodb.com/signup)
2. Create a free `c0` instance (provisions in ~1 minute)
3. Copy your Bolt URI (`bolt+s://...`) and generated password (shown only once)

### 2. Install & Configure
```bash
git clone <repo-url>
cd college-course-explorer
npm install

# Create your .env file from the template
cp .env.example .env
```

Edit `.env`:
```
NEO4J_URI=bolt+s://YOUR_INSTANCE_ID.databases.cognodb.cloud
NEO4J_PASSWORD=your-generated-password
PORT=3000
```

### 3. Seed the Database
```bash
node scripts/seed.js
```
This creates all course nodes, department nodes, prerequisite relationships, and indexes.

### 4. Start the App
```bash
node server/index.js
```
Open [http://localhost:3000](http://localhost:3000)

---

## Main Queries

### 1. All Prerequisites (Multi-Hop Traversal)
```cypher
MATCH path = (prereq:Course)-[:REQUIRES*1..10]->(c:Course {id: $courseId})
RETURN DISTINCT prereq { .*, hopCount: length(path) }
ORDER BY hopCount ASC
```
*Gets every transitive prerequisite, any depth deep. One pattern replaces recursive SQL.*

### 2. Shortest Path to a Course
```cypher
MATCH path = shortestPath(
  (from:Course {id: $fromId})-[:REQUIRES*]-(to:Course {id: $toId})
)
RETURN [n IN nodes(path) | n { .id, .code, .name }] AS pathCourses
```

### 3. Eligibility Check (Relational-DB-Awkward)
```cypher
MATCH (c:Course)
WHERE NOT c.id IN $completedIds
OPTIONAL MATCH (prereq:Course)-[:REQUIRES]->(c)
WITH c, collect(prereq.id) AS prereqIds
WHERE ALL(pid IN prereqIds WHERE pid IN $completedIds)
RETURN c
```
*SQL equivalent requires correlated NOT EXISTS subqueries per course — much more complex.*

---

## Features

| Feature | Description |
|---|---|
| 🌐 **Full Graph View** | Interactive force-directed graph of all courses |
| 🔍 **Prerequisite Explorer** | Search any course, see its full dependency chain |
| ✅ **Eligibility Checker** | Input completed courses, get unlocked courses instantly |
| 🗺️ **Learning Path Planner** | Shortest path from current standing to any target course |
| 🎓 **Degree Map** | Full degree view with locked/unlocked status overlay |
| 📋 **Course Detail Panel** | Credits, instructor, topics, prerequisites, unlocks |

---

## Screenshots

*(Screenshots to be added after deployment)*

---

## Project Structure

```
├── server/          # Express API + CognoDB queries
│   ├── db.js        # Driver singleton (reads from env vars)
│   └── routes/      # Course, graph, eligibility, degree endpoints
├── client/          # Vanilla HTML/CSS/JS frontend
│   ├── css/         # Design system + components + graph styles
│   └── js/          # App, API client, Cytoscape, feature modules
└── scripts/         # Seed and clear scripts + JSON data files
```

---

## Security

- Database credentials read from environment variables only
- `.env` is gitignored — see `.env.example` for required variables
- All Cypher queries use parameterized form — no string concatenation

---

## License

MIT
