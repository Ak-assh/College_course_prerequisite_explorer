# 🔍 Cypher Queries Reference
## College Course Prerequisite Explorer

> **RULE:** ALL queries in this app use parameterized form. Never interpolate user input into query strings.

---

## 1. Setup Queries (Seed Script)

### 1.1 Create Indexes
```cypher
CREATE INDEX course_id_idx IF NOT EXISTS FOR (c:Course) ON (c.id);
CREATE INDEX course_code_idx IF NOT EXISTS FOR (c:Course) ON (c.code);
CREATE INDEX course_name_idx IF NOT EXISTS FOR (c:Course) ON (c.name);
CREATE INDEX dept_id_idx IF NOT EXISTS FOR (d:Department) ON (d.id);
CREATE INDEX degree_id_idx IF NOT EXISTS FOR (deg:Degree) ON (deg.id);
CREATE INDEX topic_id_idx IF NOT EXISTS FOR (t:Topic) ON (t.id);
```

### 1.2 Create Constraints
```cypher
CREATE CONSTRAINT course_unique IF NOT EXISTS FOR (c:Course) REQUIRE c.id IS UNIQUE;
CREATE CONSTRAINT dept_unique IF NOT EXISTS FOR (d:Department) REQUIRE d.id IS UNIQUE;
CREATE CONSTRAINT degree_unique IF NOT EXISTS FOR (deg:Degree) REQUIRE deg.id IS UNIQUE;
CREATE CONSTRAINT topic_unique IF NOT EXISTS FOR (t:Topic) REQUIRE t.id IS UNIQUE;
```

### 1.3 Create a Course Node
```cypher
// Parameterized — used in seed.js
MERGE (c:Course {id: $id})
SET c.code = $code,
    c.name = $name,
    c.description = $description,
    c.credits = $credits,
    c.level = $level,
    c.semester = $semester,
    c.isCore = $isCore
RETURN c
```

### 1.4 Create a Prerequisite Relationship
```cypher
MATCH (from:Course {id: $fromId}), (to:Course {id: $toId})
MERGE (from)-[r:REQUIRES]->(to)
SET r.type = $type, r.minGrade = $minGrade
RETURN r
```

### 1.5 Link Department to Course
```cypher
MATCH (d:Department {id: $deptId}), (c:Course {id: $courseId})
MERGE (d)-[:OFFERS]->(c)
```

### 1.6 Link Degree to Course
```cypher
MATCH (deg:Degree {id: $degreeId}), (c:Course {id: $courseId})
MERGE (deg)-[r:INCLUDES]->(c)
SET r.required = $required, r.category = $category
```

---

## 2. Course Query Queries

### 2.1 Get All Courses (with Department)
```cypher
MATCH (d:Department)-[:OFFERS]->(c:Course)
OPTIONAL MATCH (i:Instructor)-[:TEACHES]->(c)
RETURN c {
  .*,
  department: d { .id, .name, .code, .color },
  instructor: i { .id, .name, .title }
}
ORDER BY c.level ASC, c.code ASC
```

**With filters:**
```cypher
MATCH (d:Department)-[:OFFERS]->(c:Course)
WHERE ($department IS NULL OR d.id = $department)
  AND ($level IS NULL OR c.level = $level)
RETURN c { .*, department: d { .id, .name, .code, .color } }
ORDER BY c.level ASC, c.code ASC
```

### 2.2 Get Single Course with Full Details
```cypher
MATCH (d:Department)-[:OFFERS]->(c:Course {id: $courseId})
OPTIONAL MATCH (i:Instructor)-[:TEACHES]->(c)
OPTIONAL MATCH (c)-[:COVERS]->(t:Topic)
OPTIONAL MATCH (prereq:Course)-[:REQUIRES]->(c)
OPTIONAL MATCH (c)-[:REQUIRES]->(unlocks:Course)
OPTIONAL MATCH (c)-[:COREQUISITE_OF]-(coreq:Course)
RETURN c {
  .*,
  department: d { .id, .name, .code, .color },
  instructor: i { .id, .name, .email, .title },
  topics: collect(DISTINCT t { .id, .name, .category }),
  directPrerequisites: collect(DISTINCT prereq { .id, .code, .name, .credits }),
  unlocks: collect(DISTINCT unlocks { .id, .code, .name }),
  corequisites: collect(DISTINCT coreq { .id, .code, .name })
}
```

### 2.3 Search Courses (Full-Text by Name or Code)
```cypher
MATCH (d:Department)-[:OFFERS]->(c:Course)
WHERE toLower(c.name) CONTAINS toLower($query)
   OR toLower(c.code) CONTAINS toLower($query)
RETURN c { .*, department: d { .id, .name, .code, .color } }
ORDER BY 
  CASE WHEN toLower(c.code) STARTS WITH toLower($query) THEN 0 ELSE 1 END,
  c.level ASC
LIMIT 20
```

---

## 3. Graph Traversal Queries ⭐

> These are the "graph-native" queries that demonstrate why CognoDB earns its place.

### 3.1 Get ALL Prerequisites (All Hops) — ⭐ MULTI-HOP TRAVERSAL
**The flagship query — gets every transitive prerequisite, any depth.**

```cypher
MATCH path = (prereq:Course)-[:REQUIRES*1..10]->(c:Course {id: $courseId})
RETURN DISTINCT prereq {
  .*,
  hopCount: length(path),
  pathNodes: [n IN nodes(path) | n { .id, .code, .name }]
}
ORDER BY hopCount ASC
```

**Driver usage (JavaScript):**
```javascript
const result = await session.run(
  `MATCH path = (prereq:Course)-[:REQUIRES*1..10]->(c:Course {id: $courseId})
   RETURN DISTINCT prereq {
     .*,
     hopCount: length(path),
     pathNodes: [n IN nodes(path) | n { .id, .code, .name }]
   }
   ORDER BY hopCount ASC`,
  { courseId: req.params.id }
);
```

---

### 3.2 Get Full Prerequisite Subgraph (Nodes + Edges for Cytoscape)
```cypher
MATCH (c:Course {id: $courseId})
OPTIONAL MATCH path = (prereq:Course)-[:REQUIRES*1..6]->(c)
WITH c, 
     collect(DISTINCT prereq) AS prereqNodes,
     collect(DISTINCT relationships(path)) AS allRels

UNWIND ([c] + prereqNodes) AS node
WITH collect(DISTINCT node) AS allNodes, allRels

UNWIND allRels AS relList
UNWIND relList AS rel
WITH allNodes, collect(DISTINCT rel) AS allEdges

RETURN 
  [n IN allNodes | { 
    id: n.id, 
    label: n.code, 
    name: n.name, 
    level: n.level,
    credits: n.credits 
  }] AS nodes,
  [r IN allEdges | { 
    source: startNode(r).id, 
    target: endNode(r).id, 
    type: r.type 
  }] AS edges
```

---

### 3.3 Shortest Path Between Two Courses — ⭐ MULTI-HOP TRAVERSAL
**Used by the Learning Path Planner — finds the minimum courses to take to get from Course A to Course B.**

```cypher
MATCH path = shortestPath(
  (from:Course {id: $fromId})-[:REQUIRES*]-(to:Course {id: $toId})
)
RETURN 
  [n IN nodes(path) | n { .id, .code, .name, .credits, .level }] AS pathCourses,
  length(path) AS hops
```

---

### 3.4 Find All Courses a Student Can Now Take — ⭐ RELATIONAL-DB-AWKWARD QUERY
**Given a list of completed course IDs, find courses where ALL prerequisites have been completed.**

```cypher
// Get all courses in the DB, check if all their prereqs are in the completed set
MATCH (c:Course)
WHERE NOT c.id IN $completedIds  // Not already completed
// Get all direct prerequisites of this course
OPTIONAL MATCH (prereq:Course)-[:REQUIRES]->(c)
WITH c, collect(prereq.id) AS prereqIds
// Keep only courses where every prereq is in the completed list
WHERE ALL(pid IN prereqIds WHERE pid IN $completedIds)
MATCH (d:Department)-[:OFFERS]->(c)
RETURN c { .*, department: d { .id, .name, .code, .color } }
ORDER BY c.level ASC
```

**Why this is awkward in SQL:**  
This requires a `NOT EXISTS` subquery checking that there is no prerequisite not satisfied. The Cypher `ALL()` predicate is clean and readable; the SQL equivalent requires complex correlated subqueries.

---

### 3.5 Courses One Prerequisite Away ("Almost Eligible")
```cypher
MATCH (c:Course)
WHERE NOT c.id IN $completedIds
// Find all prerequisites of this course
MATCH (prereq:Course)-[:REQUIRES]->(c)
WITH c, collect(prereq.id) AS prereqIds
// Keep courses where EXACTLY ONE prereq is not yet satisfied
WHERE size([pid IN prereqIds WHERE NOT pid IN $completedIds]) = 1
MATCH (d:Department)-[:OFFERS]->(c)
RETURN c { .*, department: d { .id, .name, .code, .color } },
       [pid IN prereqIds WHERE NOT pid IN $completedIds][0] AS missingPrereqId
ORDER BY c.level ASC
```

---

### 3.6 Full Course Graph (All Nodes + Edges for Overview Visualization)
```cypher
MATCH (d:Department)-[:OFFERS]->(c:Course)
OPTIONAL MATCH (c)-[r:REQUIRES]->(prereq:Course)
RETURN 
  collect(DISTINCT c { 
    .id, .code, .name, .level, .credits, .semester,
    department: d { .id, .code, .name, .color }
  }) AS nodes,
  collect(DISTINCT {
    source: c.id,
    target: prereq.id,
    type: r.type
  }) AS edges
```

---

## 4. Degree Queries

### 4.1 Get Degree with All Courses
```cypher
MATCH (deg:Degree {id: $degreeId})-[r:INCLUDES]->(c:Course)
MATCH (d:Department)-[:OFFERS]->(c)
RETURN deg,
       collect(c { 
         .*, 
         required: r.required, 
         category: r.category,
         department: d { .id, .name, .code, .color }
       }) AS courses
```

### 4.2 Degree Progress (Completed vs. Remaining)
```cypher
MATCH (deg:Degree {id: $degreeId})-[r:INCLUDES]->(c:Course)
MATCH (d:Department)-[:OFFERS]->(c)
RETURN deg,
       collect({
         course: c { .*, department: d { .id, .name, .code, .color } },
         required: r.required,
         category: r.category,
         completed: c.id IN $completedIds
       }) AS courseProgress,
       size([c2 IN collect(c) WHERE c2.id IN $completedIds]) AS completedCount,
       size(collect(c)) AS totalCount
```

### 4.3 Critical Path in a Degree (Longest Prerequisite Chain)
```cypher
// Find the deepest prerequisite chain for any course in the degree
MATCH (deg:Degree {id: $degreeId})-[:INCLUDES]->(terminal:Course)
MATCH path = (entry:Course)-[:REQUIRES*]->(terminal)
WHERE NOT EXISTS { MATCH (x:Course)-[:REQUIRES]->(entry) }
RETURN 
  terminal { .id, .code, .name } AS terminalCourse,
  length(path) AS chainLength,
  [n IN nodes(path) | n { .id, .code, .name }] AS chain
ORDER BY chainLength DESC
LIMIT 1
```

---

## 5. Analytics / Discovery Queries

### 5.1 Find Bottleneck Courses (Most Dependencies)
**Courses that the most other courses depend on — aka "gateway courses"**
```cypher
MATCH (c:Course)<-[:REQUIRES]-(dependent:Course)
WITH c, count(dependent) AS dependentCount
WHERE dependentCount > 0
RETURN c { .id, .code, .name, .level }, dependentCount
ORDER BY dependentCount DESC
LIMIT 10
```

### 5.2 Find Related Courses by Shared Topics
```cypher
MATCH (c:Course {id: $courseId})-[:COVERS]->(t:Topic)<-[:COVERS]-(related:Course)
WHERE related.id <> $courseId
WITH related, count(t) AS sharedTopics, collect(t.name) AS topics
MATCH (d:Department)-[:OFFERS]->(related)
RETURN related { .*, department: d { .id, .name, .code, .color } },
       sharedTopics,
       topics
ORDER BY sharedTopics DESC
LIMIT 8
```

### 5.3 Courses with No Prerequisites ("Entry Points")
```cypher
MATCH (c:Course)
WHERE NOT EXISTS { MATCH (prereq:Course)-[:REQUIRES]->(c) }
MATCH (d:Department)-[:OFFERS]->(c)
RETURN c { .*, department: d { .id, .name, .code, .color } }
ORDER BY d.code ASC, c.level ASC
```

---

## 6. JavaScript Integration Patterns

### 6.1 Session Lifecycle (ALWAYS close the session)
```javascript
async function getCoursePrerequisites(courseId) {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH path = (prereq:Course)-[:REQUIRES*1..10]->(c:Course {id: $courseId})
       RETURN DISTINCT prereq { .*, hopCount: length(path) }
       ORDER BY hopCount ASC`,
      { courseId }  // Parameterized — never string concatenate
    );
    return result.records.map(r => r.get('prereq'));
  } catch (error) {
    if (error.code === 'ServiceUnavailable') {
      throw new DatabaseUnavailableError();
    }
    throw error;
  } finally {
    await session.close();  // ALWAYS close
  }
}
```

### 6.2 Converting Neo4j Integer Types
```javascript
// Neo4j returns Integer objects for integer properties — convert them:
const credits = neo4j.integer.toNumber(record.get('c').properties.credits);
// Or use: record.get('c').properties.credits.toNumber()
```

### 6.3 Route Handler Pattern
```javascript
router.get('/:id/prerequisites', async (req, res, next) => {
  try {
    const prereqs = await getCoursePrerequisites(req.params.id);
    if (prereqs.length === 0) {
      return res.json({ 
        prerequisites: [], 
        message: 'This course has no prerequisites.' 
      });
    }
    res.json({ prerequisites: prereqs });
  } catch (error) {
    next(error);  // Pass to error middleware
  }
});
```
