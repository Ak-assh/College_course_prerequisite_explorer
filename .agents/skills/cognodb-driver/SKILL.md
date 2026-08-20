---
name: cognodb-driver
description: >
  Complete guide for connecting to and querying CognoDB (Neo4j-compatible graph database)
  using the official neo4j-driver for JavaScript. Use this skill whenever writing any
  database connection code, query functions, or seed scripts for the College Course
  Prerequisite Explorer project.
---

# CognoDB Driver Skill

## What is CognoDB?

CognoDB is a managed graph database that speaks **openCypher over Bolt protocol (Bolt 5.0–5.4)**.
It is **100% compatible with the official Neo4j JavaScript driver** (`neo4j-driver` npm package).
No custom SDK is needed — just point the Neo4j driver at the CognoDB Bolt URI.

---

## Installation

```bash
npm install neo4j-driver dotenv
```

---

## Environment Variables

The app reads credentials from environment variables. NEVER hardcode them.

```bash
# .env (gitignored)
NEO4J_URI=bolt+s://YOUR_INSTANCE_ID.databases.cognodb.cloud
NEO4J_PASSWORD=your-generated-password
```

The username is always `"cognodb"` for CognoDB Cloud instances.

---

## Driver Singleton Pattern (`server/db.js`)

```javascript
const neo4j = require('neo4j-driver');
require('dotenv').config();

let driver;

function getDriver() {
  if (!driver) {
    const uri = process.env.NEO4J_URI;
    const password = process.env.NEO4J_PASSWORD;

    if (!uri || !password) {
      throw new Error(
        'Missing required environment variables: NEO4J_URI and NEO4J_PASSWORD must be set.'
      );
    }

    driver = neo4j.driver(
      uri,
      neo4j.auth.basic('cognodb', password),
      {
        maxConnectionLifetime: 3 * 60 * 60 * 1000,  // 3 hours
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 2 * 60 * 1000, // 2 minutes
      }
    );
  }
  return driver;
}

async function closeDriver() {
  if (driver) {
    await driver.close();
    driver = null;
  }
}

// Test connectivity
async function verifyConnectivity() {
  const d = getDriver();
  await d.verifyConnectivity();
  console.log('✅ Connected to CognoDB successfully');
}

module.exports = { getDriver, closeDriver, verifyConnectivity };
```

---

## Session Pattern (ALWAYS use try/finally to close)

```javascript
const { getDriver } = require('./db');

async function runQuery(cypher, params = {}) {
  const session = getDriver().session();
  try {
    const result = await session.run(cypher, params);
    return result.records;
  } finally {
    await session.close(); // ALWAYS close — even on error
  }
}
```

---

## Parameterized Query Pattern (MANDATORY)

```javascript
// ✅ CORRECT — parameterized
const records = await runQuery(
  'MATCH (c:Course {id: $courseId}) RETURN c',
  { courseId: req.params.id }
);

// ❌ FORBIDDEN — string concatenation (never do this)
const records = await runQuery(
  `MATCH (c:Course {id: "${req.params.id}"}) RETURN c`
);
```

---

## Reading Records

```javascript
const records = await runQuery('MATCH (c:Course) RETURN c LIMIT 10');

records.forEach(record => {
  const course = record.get('c').properties;
  
  // IMPORTANT: Neo4j Integer types must be converted
  const credits = neo4j.integer.toNumber(course.credits);
  const level = neo4j.integer.toNumber(course.level);
  
  console.log(course.name, credits, level);
});
```

---

## Helper: Convert Neo4j Result to Plain Object

```javascript
function recordToObject(record, key) {
  const node = record.get(key);
  const props = {};
  
  Object.keys(node.properties).forEach(prop => {
    const val = node.properties[prop];
    // Convert Neo4j Integer to JS number
    props[prop] = neo4j.isInt(val) ? val.toNumber() : val;
  });
  
  return props;
}
```

---

## Error Handling

```javascript
const { ServiceUnavailable, AuthenticationError } = require('neo4j-driver');

// In Express error middleware (server/index.js)
app.use((err, req, res, next) => {
  if (err instanceof ServiceUnavailable || err.code === 'ServiceUnavailable') {
    return res.status(503).json({
      error: 'Database is currently unavailable. Please try again later.',
      code: 'DB_UNAVAILABLE'
    });
  }
  
  if (err instanceof AuthenticationError) {
    return res.status(500).json({
      error: 'Database authentication failed. Check server configuration.',
      code: 'DB_AUTH_ERROR'
    });
  }
  
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'An unexpected error occurred.' });
});
```

---

## Seed Script Pattern

```javascript
// scripts/seed.js
const { getDriver, closeDriver, verifyConnectivity } = require('../server/db');
const courses = require('./data/courses.json');

async function seed() {
  await verifyConnectivity();
  const driver = getDriver();

  // Use a single session for the entire seed
  const session = driver.session();

  try {
    console.log('🌱 Creating indexes...');
    await session.run(`
      CREATE INDEX course_id_idx IF NOT EXISTS FOR (c:Course) ON (c.id)
    `);

    console.log('🌱 Seeding courses...');
    for (const course of courses) {
      await session.run(
        `MERGE (c:Course {id: $id})
         SET c.code = $code, c.name = $name, c.credits = $credits,
             c.level = $level, c.semester = $semester, c.isCore = $isCore,
             c.description = $description`,
        course  // Pass entire object — only named params are used
      );
    }

    console.log('✅ Seed complete!');
  } finally {
    await session.close();
    await closeDriver();
  }
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
```

---

## Multi-Hop Traversal Pattern

For prerequisite chains, use variable-length relationship patterns:

```cypher
-- All prerequisites of a course (up to 6 hops deep)
MATCH path = (prereq:Course)-[:REQUIRES*1..6]->(c:Course {id: $courseId})
RETURN DISTINCT prereq, length(path) AS hopCount
ORDER BY hopCount ASC
```

```javascript
const result = await session.run(
  `MATCH path = (prereq:Course)-[:REQUIRES*1..6]->(c:Course {id: $courseId})
   RETURN DISTINCT prereq { .*, hopCount: length(path) }
   ORDER BY hopCount ASC`,
  { courseId }
);
```

---

## CognoDB Limits (Free Tier)

- 0.5 vCPU (burstable)
- 256 MB RAM
- 1 GB disk
- Up to 200 connections

Keep seed data to **~200–300 course nodes** and **~400–600 relationship edges** to stay well within limits.

---

## Useful Cypher Snippets

```cypher
-- Count all nodes by label
MATCH (n) RETURN labels(n)[0] AS label, count(n) AS count ORDER BY count DESC

-- Clear all data (for re-seeding)
MATCH (n) DETACH DELETE n

-- Check if an index exists
SHOW INDEXES WHERE name = 'course_id_idx'

-- Verify relationship counts
MATCH ()-[r:REQUIRES]->() RETURN count(r) AS prerequisiteCount
```
