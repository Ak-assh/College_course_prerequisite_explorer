# 🗄️ Graph Data Model
## College Course Prerequisite Explorer

---

## 1. Model Overview

The graph represents a university's course catalog as a network of courses connected by prerequisite dependencies, department affiliations, degree requirements, instructor assignments, and topic coverage.

```
(Department)──OFFERS──>(Course)──REQUIRES──>(Course)
                          │                    │
                      TAUGHT_BY           COVERS
                          │                    │
                    (Instructor)           (Topic)
                          
(Degree)──INCLUDES──>(Course)
```

---

## 2. Node Labels & Properties

### 2.1 `Course`
The central node. Represents a single university course.

| Property | Type | Required | Description |
|---|---|---|---|
| `id` | String | ✅ | Unique identifier (e.g., `"cs-101"`) |
| `code` | String | ✅ | Official course code (e.g., `"CS 101"`) |
| `name` | String | ✅ | Full course name (e.g., `"Introduction to Programming"`) |
| `description` | String | ✅ | Course description |
| `credits` | Integer | ✅ | Credit hours (1–4) |
| `level` | Integer | ✅ | Course level: 100, 200, 300, 400, 500, 600 |
| `semester` | String | ✅ | When offered: `"Fall"`, `"Spring"`, `"Both"`, `"Summer"` |
| `isCore` | Boolean | ✅ | Is this a core required course? |

**Example Cypher to create:**
```cypher
CREATE (:Course {
  id: 'cs-101',
  code: 'CS 101',
  name: 'Introduction to Programming',
  description: 'Fundamental programming concepts using Python.',
  credits: 3,
  level: 100,
  semester: 'Both',
  isCore: true
})
```

---

### 2.2 `Department`
Represents an academic department.

| Property | Type | Required | Description |
|---|---|---|---|
| `id` | String | ✅ | Unique identifier (e.g., `"dept-cs"`) |
| `code` | String | ✅ | Short code (e.g., `"CS"`) |
| `name` | String | ✅ | Full name (e.g., `"Computer Science"`) |
| `color` | String | ✅ | Hex color for graph visualization (e.g., `"#6366f1"`) |

---

### 2.3 `Instructor`
Represents a faculty member who teaches courses.

| Property | Type | Required | Description |
|---|---|---|---|
| `id` | String | ✅ | Unique identifier |
| `name` | String | ✅ | Full name |
| `email` | String | ✅ | Contact email |
| `title` | String | ❌ | Academic title (e.g., `"Professor"`, `"Associate Professor"`) |

---

### 2.4 `Degree`
Represents a degree program (e.g., BS Computer Science).

| Property | Type | Required | Description |
|---|---|---|---|
| `id` | String | ✅ | Unique identifier (e.g., `"deg-bscs"`) |
| `name` | String | ✅ | Full degree name |
| `type` | String | ✅ | `"Bachelor"`, `"Master"`, `"PhD"` |
| `totalCredits` | Integer | ✅ | Minimum credits to graduate |
| `description` | String | ❌ | Program description |

---

### 2.5 `Topic`
Represents a subject area or topic covered in courses (enables cross-course recommendations).

| Property | Type | Required | Description |
|---|---|---|---|
| `id` | String | ✅ | Unique identifier (e.g., `"topic-algorithms"`) |
| `name` | String | ✅ | Topic name (e.g., `"Algorithms"`) |
| `category` | String | ✅ | Broad category (e.g., `"Theory"`, `"Systems"`, `"AI"`) |

---

## 3. Relationship Types

### 3.1 `(:Course)-[:REQUIRES {type}]->(:Course)`
**A course requires another course as a prerequisite.**

The direction is: **prerequisite → dependent course** (Course A must be taken BEFORE Course B, so `A-[:REQUIRES]->B`).

Wait — let me clarify the direction convention used throughout this app:

> **Convention:** `(prerequisite)-[:REQUIRES]->(dependentCourse)`
> Reading as: "CS101 is required by CS201" → `(CS101)-[:REQUIRES]->(CS201)`
> OR alternatively: "CS201 requires CS101" → use MATCH `(cs201)<-[:REQUIRES]-(cs101)`

Actually for clarity we use:
> **`(CourseA)-[:REQUIRES]->(CourseB)` means "You must take A before you can take B"**

| Property | Type | Required | Description |
|---|---|---|---|
| `type` | String | ✅ | `"mandatory"` or `"recommended"` |
| `minGrade` | String | ❌ | Minimum grade required (e.g., `"C"`, `"B"`) |

**Example:**
```cypher
// CS101 must be completed before CS201
MATCH (a:Course {id: 'cs-101'}), (b:Course {id: 'cs-201'})
CREATE (a)-[:REQUIRES {type: 'mandatory', minGrade: 'C'}]->(b)
```

---

### 3.2 `(:Course)-[:COREQUISITE_OF]->(:Course)`
**Two courses must be taken together (or one before the other, in either order).**

| Property | Type | Required | Description |
|---|---|---|---|
| `note` | String | ❌ | Explanation of the co-requisite rule |

---

### 3.3 `(:Department)-[:OFFERS]->(:Course)`
**A department offers a course.**

No additional properties.

---

### 3.4 `(:Instructor)-[:TEACHES]->(:Course)`
**An instructor teaches a course.**

| Property | Type | Required | Description |
|---|---|---|---|
| `semester` | String | ❌ | Which semester they teach it |

---

### 3.5 `(:Degree)-[:INCLUDES]->(:Course)`
**A degree program includes a course as a requirement.**

| Property | Type | Required | Description |
|---|---|---|---|
| `required` | Boolean | ✅ | Is this course mandatory for the degree? |
| `category` | String | ✅ | `"Core"`, `"Elective"`, `"Concentration"`, `"Capstone"` |

---

### 3.6 `(:Course)-[:COVERS]->(:Topic)`
**A course covers a particular topic.**

| Property | Type | Required | Description |
|---|---|---|---|
| `depth` | String | ❌ | `"introductory"`, `"intermediate"`, `"advanced"` |

---

## 4. Full Schema Diagram (ASCII)

```
┌─────────────────────────────────────────────────────────────────┐
│                     GRAPH DATA MODEL                            │
│                                                                 │
│   ┌────────────┐         ┌──────────────────┐                  │
│   │ Department │─OFFERS─▶│     Course       │                  │
│   └────────────┘         │ ─────────────── │                  │
│                           │ id: String      │◀─────────────┐   │
│   ┌────────────┐          │ code: String    │              │   │
│   │ Instructor │─TEACHES─▶│ name: String    │─REQUIRES {   │   │
│   └────────────┘          │ credits: Int    │  type,       │   │
│                           │ level: Int      │  minGrade    │   │
│   ┌────────────┐          │ semester: String│}─────────────┘   │
│   │  Degree    │─INCLUDES▶│ isCore: Boolean │                  │
│   └────────────┘          └──────────────────┘                  │
│                                    │                            │
│                                 COVERS                          │
│                                    ▼                            │
│                            ┌──────────────┐                    │
│                            │    Topic     │                    │
│                            │ id: String   │                    │
│                            │ name: String │                    │
│                            └──────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Sample Data Overview

The seed script creates a realistic Computer Science department at **"Lakewood University"**:

### Departments (5)
- Computer Science (CS)
- Mathematics (MATH)
- Electrical Engineering (EE)
- Physics (PHYS)
- Data Science (DS)

### Courses (~60 total)

**Computer Science courses (sample):**
| ID | Code | Name | Level | Prerequisites |
|---|---|---|---|---|
| cs-101 | CS 101 | Intro to Programming | 100 | None |
| cs-102 | CS 102 | Intro to Web Development | 100 | None |
| cs-201 | CS 201 | Data Structures | 200 | CS 101 |
| cs-202 | CS 202 | Discrete Mathematics | 200 | MATH 101 |
| cs-301 | CS 301 | Algorithms | 300 | CS 201, CS 202 |
| cs-302 | CS 302 | Database Systems | 300 | CS 201 |
| cs-303 | CS 303 | Operating Systems | 300 | CS 201, CS 251 |
| cs-304 | CS 304 | Computer Networks | 300 | CS 303 |
| cs-401 | CS 401 | Machine Learning | 400 | CS 301, MATH 301 |
| cs-402 | CS 402 | Artificial Intelligence | 400 | CS 301 |
| cs-403 | CS 403 | Distributed Systems | 400 | CS 303, CS 304 |
| cs-499 | CS 499 | Senior Capstone | 400 | CS 401 OR CS 402 |

**Mathematics courses (sample):**
| ID | Code | Name | Level | Prerequisites |
|---|---|---|---|---|
| math-101 | MATH 101 | Calculus I | 100 | None |
| math-201 | MATH 201 | Calculus II | 200 | MATH 101 |
| math-202 | MATH 202 | Linear Algebra | 200 | MATH 101 |
| math-301 | MATH 301 | Probability & Statistics | 300 | MATH 201, MATH 202 |

### Degrees (3)
- BS Computer Science (120 credits)
- BS Data Science (118 credits)
- MS Computer Science (36 credits)

### Topics (20)
Algorithms, Data Structures, Machine Learning, Databases, Operating Systems, Networking, AI, Statistics, Linear Algebra, Calculus, Web Development, Security, Distributed Systems, Cloud Computing, Computer Vision, NLP, Compilers, Software Engineering, Computer Architecture, Discrete Math

---

## 6. Indexes to Create (in seed script)

```cypher
// For fast node lookup by ID
CREATE INDEX course_id IF NOT EXISTS FOR (c:Course) ON (c.id);
CREATE INDEX course_code IF NOT EXISTS FOR (c:Course) ON (c.code);
CREATE INDEX dept_id IF NOT EXISTS FOR (d:Department) ON (d.id);
CREATE INDEX degree_id IF NOT EXISTS FOR (deg:Degree) ON (deg.id);

// For fast text search
CREATE INDEX course_name IF NOT EXISTS FOR (c:Course) ON (c.name);
```

---

## 7. Constraint to Create (in seed script)

```cypher
// Enforce uniqueness
CREATE CONSTRAINT course_unique_id IF NOT EXISTS FOR (c:Course) REQUIRE c.id IS UNIQUE;
CREATE CONSTRAINT dept_unique_id IF NOT EXISTS FOR (d:Department) REQUIRE d.id IS UNIQUE;
CREATE CONSTRAINT degree_unique_id IF NOT EXISTS FOR (deg:Degree) REQUIRE deg.id IS UNIQUE;
```

---

## 8. Why This Data Model is Graph-Native

### The Key Argument

**Question:** "What does a student need to complete before taking CS 401 (Machine Learning)?"

**In SQL (recursive CTE approach):**
```sql
WITH RECURSIVE prereqs AS (
  SELECT from_course, to_course FROM prerequisites WHERE to_course = 'cs-401'
  UNION ALL
  SELECT p.from_course, p.to_course FROM prerequisites p
  JOIN prereqs r ON p.to_course = r.from_course
)
SELECT DISTINCT from_course FROM prereqs;
-- Grows in complexity with each hop, requires recursive keyword, not supported in all SQL dialects
```

**In Cypher (one line):**
```cypher
MATCH (prereq:Course)-[:REQUIRES*1..6]->(c:Course {id: $courseId})
RETURN DISTINCT prereq
```

The graph approach is:
1. **Shorter** — one pattern vs. recursive SQL
2. **Clearer** — the pattern reads like English
3. **Faster** — native graph traversal vs. recursive table scans
4. **Flexible** — changing depth from 6 to unlimited is just changing `*1..6` to `*`
