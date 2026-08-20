# 📘 Product Requirements Document (PRD)
## College Course Prerequisite Explorer
**Version:** 1.0  
**Author:** Product Manager  
**Assignment:** WEXA AI — CognoDB Take-Home Assignment  
**Deadline:** 48 hours from receipt  
**Submit To:** hr@wexa.ai  

---

## 1. Executive Summary

The **College Course Prerequisite Explorer** is a web application that models an entire university's course catalog as a directed graph, allowing students to visually explore prerequisite chains, discover learning paths, check course eligibility based on completed courses, and plan their degree roadmap.

This application is purpose-built on a **graph database (CognoDB)** because the core problem — prerequisite chains, multi-hop dependencies, degree planning paths — is **inherently a graph traversal problem** that relational databases solve awkwardly through recursive CTEs and self-joins.

---

## 2. Problem Statement

University course catalogs are notoriously hard to navigate:

- Students don't know **what prerequisites a course requires** beyond one level deep
- Advisors spend hours manually tracing course dependency chains
- Students inadvertently enroll in courses they're not ready for
- Degree planning involves understanding a **web of interdependencies** — not a flat list

**The key insight:** Courses relate to other courses through prerequisite chains that can be 4–6 hops deep. This is a graph, not a table.

### Why a Graph Database?

| Question | Relational DB | Graph DB |
|---|---|---|
| "What are ALL prerequisites of CS401?" | Recursive CTE, multiple self-joins | Single `(c)-[:REQUIRES*1..6]->()` Cypher pattern |
| "What courses can I take next?" | Complex JOIN + multi-level recursion | Variable-length traversal from completed nodes |
| "What's the shortest path to CS501?" | BFS in application code | `shortestPath()` built-in |
| "Which courses share topics?" | Multi-table JOIN + aggregation | Pattern match through shared Topic nodes |
| "Find bottleneck courses in a degree?" | Nested subqueries | Single traversal checking in-degree |

---

## 3. Target Users

| Persona | Goal | Key Needs |
|---|---|---|
| **Undergraduate Student** | Plan which courses to take next semester | Unlocked courses, prerequisite chains, degree progress |
| **Graduate Student** | Fast-track electives and specialization | Deep prerequisite paths, topic-based discovery |
| **Academic Advisor** | Counsel students on course eligibility | Full graph overview, bottleneck courses |

**Primary Persona:** Undergraduate student, first/second year.

---

## 4. Core Features (MVP)

### F1 — Course Graph Visualization
- Interactive, force-directed graph of courses and prerequisites
- Nodes colored by department
- Edge direction shows prerequisite flow (A → B means "take A before B")
- Click a node to inspect course details
- Filter by department, level, semester

### F2 — Prerequisite Explorer
- Search any course by name or code
- Display full prerequisite chain (all hops) as interactive graph
- Show direct prerequisites (1 hop) vs transitive (2+ hops) visually differently
- Show co-requisites separately

### F3 — Eligibility Checker
- Student inputs completed courses (multi-select)
- App shows which courses are NOW unlocked (all prerequisites satisfied)
- Highlights courses one prerequisite away

### F4 — Learning Path Planner
- Student picks a target course (e.g., "Machine Learning")
- App computes shortest path from completed courses to target
- Shows exact sequence of courses to take

### F5 — Degree Map
- Select a degree program
- See ALL courses required, locked/unlocked status based on completed courses
- Critical path (longest prerequisite chain) highlighted

### F6 — Course Detail Panel
- Opens on node click
- Shows: code, name, credits, department, instructor, semester offered
- Lists: direct prerequisites, courses it unlocks, co-requisites
- Shows: topics covered

---

## 5. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | Page load < 2s. Graph queries < 500ms |
| **Security** | DB credentials from env vars ONLY — never in source code |
| **Error Handling** | Graceful fallback UI if CognoDB is unreachable |
| **Accessibility** | Keyboard-navigable search, ARIA labels on interactive elements |
| **Responsiveness** | Desktop-first (1024px+) |
| **Browser Support** | Chrome 100+, Firefox 100+, Edge 100+ |

---

## 6. Technical Constraints (from Assignment)

- **Database:** CognoDB Cloud (free c0 instance) — openCypher over Bolt 5.0–5.4
- **Driver:** Official Neo4j JavaScript driver (`neo4j-driver` npm package)
- **Queries:** ALL Cypher queries MUST use parameterized queries. NO string-concatenated Cypher.
- **Secrets:** DB URI and password from environment variables (`NEO4J_URI`, `NEO4J_PASSWORD`)
- **Deliverable:** GitHub repo + hosted demo + screen recording

---

## 7. User Stories

### Epic 1: Course Discovery
- **US-01:** As a student, I can search for a course by name or code
- **US-02:** As a student, I can see a visual graph of a course's prerequisites
- **US-03:** As a student, I can see how many hops deep a prerequisite chain goes
- **US-04:** As a student, I can click any course in the chain to explore it further

### Epic 2: Eligibility & Planning
- **US-05:** As a student, I can enter completed courses and see what I'm now eligible for
- **US-06:** As a student, I can see courses I'm "one course away" from
- **US-07:** As a student, I can see the shortest path from my standing to a target course
- **US-08:** As a student, I can view a full degree map

### Epic 3: Exploration
- **US-09:** As a student, I can filter the graph by department
- **US-10:** As a student, I can filter by course level (100–400)
- **US-11:** As a student, I can see topics a course covers and find related courses

---

## 8. Out of Scope (MVP)

- User authentication / accounts
- Real-time enrollment or seat availability
- Integration with actual university SIS
- Mobile app
- Grade tracking / course ratings

---

## 9. Success Criteria

| Criterion | Target |
|---|---|
| Graph data model quality | Labeled nodes, typed relationships, documented diagram |
| Cypher query sophistication | ≥1 multi-hop traversal (2+ hops), ≥1 relational-awkward query |
| Parameterized queries | 100% — zero string concatenation |
| UI/UX quality | Clean layout, loading states, empty states, readable typography |
| "Why graph?" argument | Convincing, specific, in README |
| Code quality | Clean architecture, env var secrets, graceful DB error handling |
| Hosted demo | Live URL accessible to reviewers |

---

## 10. Milestones

| Phase | Task | Est. Time |
|---|---|---|
| **Phase 1** | CognoDB setup, data model design | 2h |
| **Phase 2** | Seed data script (Node.js) | 3h |
| **Phase 3** | Backend API (Express + neo4j-driver) | 4h |
| **Phase 4** | Frontend — base layout, CSS design system | 3h |
| **Phase 5** | Graph visualization (Cytoscape.js) | 3h |
| **Phase 6** | Feature implementation (search, eligibility, path) | 4h |
| **Phase 7** | README, hosting, screen recording | 2h |
| **Total** | | **~21h** |
