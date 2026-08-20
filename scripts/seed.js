/**
 * Database Seed Script for CognoDB / Neo4j
 * Seeds departments, instructors, topics, degrees, courses, and relationships using 100% parameterized openCypher.
 */
require('dotenv').config();
const { getDriver, closeDriver, verifyConnectivity, runQuery } = require('../server/db');

const departments = require('./data/departments.json');
const instructors = require('./data/instructors.json');
const topics = require('./data/topics.json');
const degrees = require('./data/degrees.json');
const courses = require('./data/courses.json');
const relationships = require('./data/relationships.json');

async function seed() {
  console.log('🌱 Starting CognoDB Database Seeder...');
  const isConnected = await verifyConnectivity();
  if (!isConnected) {
    console.error('❌ Could not connect to CognoDB. Please check NEO4J_URI and NEO4J_PASSWORD in .env.');
    process.exit(1);
  }

  const driver = getDriver();
  const session = driver.session();

  try {
    console.log('1️⃣ Creating constraints and indexes...');
    const schemaQueries = [
      'CREATE CONSTRAINT course_id_unique IF NOT EXISTS FOR (c:Course) REQUIRE c.id IS UNIQUE',
      'CREATE CONSTRAINT dept_id_unique IF NOT EXISTS FOR (d:Department) REQUIRE d.id IS UNIQUE',
      'CREATE CONSTRAINT degree_id_unique IF NOT EXISTS FOR (deg:Degree) REQUIRE deg.id IS UNIQUE',
      'CREATE CONSTRAINT topic_id_unique IF NOT EXISTS FOR (t:Topic) REQUIRE t.id IS UNIQUE',
      'CREATE CONSTRAINT instructor_id_unique IF NOT EXISTS FOR (i:Instructor) REQUIRE i.id IS UNIQUE',
      'CREATE INDEX course_code_idx IF NOT EXISTS FOR (c:Course) ON (c.code)',
      'CREATE INDEX course_name_idx IF NOT EXISTS FOR (c:Course) ON (c.name)'
    ];

    for (const q of schemaQueries) {
      try {
        await session.run(q);
      } catch (err) {
        console.log(`   Note on schema query: ${err.message}`);
      }
    }

    console.log('2️⃣ Seeding Departments...');
    for (const dept of departments) {
      await session.run(
        `MERGE (d:Department {id: $id})
         SET d.code = $code,
             d.name = $name,
             d.color = $color,
             d.description = $description`,
        dept
      );
    }
    console.log(`   ✅ Seeded ${departments.length} departments.`);

    console.log('3️⃣ Seeding Instructors...');
    for (const inst of instructors) {
      await session.run(
        `MERGE (i:Instructor {id: $id})
         SET i.name = $name,
             i.email = $email,
             i.title = $title`,
        inst
      );
      if (inst.departmentId) {
        await session.run(
          `MATCH (d:Department {id: $deptId}), (i:Instructor {id: $instId})
           MERGE (d)-[:AFFILIATED_WITH]->(i)`,
          { deptId: inst.departmentId, instId: inst.id }
        );
      }
    }
    console.log(`   ✅ Seeded ${instructors.length} instructors.`);

    console.log('4️⃣ Seeding Topics...');
    for (const topic of topics) {
      await session.run(
        `MERGE (t:Topic {id: $id})
         SET t.name = $name,
             t.category = $category`,
        topic
      );
    }
    console.log(`   ✅ Seeded ${topics.length} topics.`);

    console.log('5️⃣ Seeding Degrees...');
    for (const deg of degrees) {
      await session.run(
        `MERGE (deg:Degree {id: $id})
         SET deg.name = $name,
             deg.code = $code,
             deg.type = $type,
             deg.totalCredits = $totalCredits,
             deg.description = $description`,
        deg
      );
      if (deg.departmentId) {
        await session.run(
          `MATCH (d:Department {id: $deptId}), (deg:Degree {id: $degId})
           MERGE (d)-[:OFFERS]->(deg)`,
          { deptId: deg.departmentId, degId: deg.id }
        );
      }
    }
    console.log(`   ✅ Seeded ${degrees.length} degrees.`);

    console.log('6️⃣ Seeding Courses...');
    for (const course of courses) {
      await session.run(
        `MERGE (c:Course {id: $id})
         SET c.code = $code,
             c.name = $name,
             c.description = $description,
             c.credits = $credits,
             c.level = $level,
             c.semester = $semester,
             c.isCore = $isCore`,
        course
      );

      if (course.departmentId) {
        await session.run(
          `MATCH (d:Department {id: $deptId}), (c:Course {id: $courseId})
           MERGE (d)-[:OFFERS]->(c)`,
          { deptId: course.departmentId, courseId: course.id }
        );
      }

      if (course.instructorId) {
        await session.run(
          `MATCH (i:Instructor {id: $instId}), (c:Course {id: $courseId})
           MERGE (i)-[:TEACHES]->(c)`,
          { instId: course.instructorId, courseId: course.id }
        );
      }
    }
    console.log(`   ✅ Seeded ${courses.length} courses.`);

    console.log('7️⃣ Seeding Relationships (Prerequisites, Corequisites, Topics, Degrees)...');
    
    // Prerequisites
    let prereqCount = 0;
    for (const p of relationships.prerequisites) {
      await session.run(
        `MATCH (from:Course {id: $fromId}), (to:Course {id: $toId})
         MERGE (from)-[r:REQUIRES]->(to)
         SET r.type = $type,
             r.minGrade = $minGrade`,
        { fromId: p.from, toId: p.to, type: p.type, minGrade: p.minGrade || 'C' }
      );
      prereqCount++;
    }
    console.log(`   ✅ Created ${prereqCount} prerequisite links.`);

    // Corequisites
    let coreqCount = 0;
    for (const cr of relationships.corequisites) {
      await session.run(
        `MATCH (a:Course {id: $courseA}), (b:Course {id: $courseB})
         MERGE (a)-[r:COREQUISITE_OF]->(b)
         SET r.note = $note`,
        { courseA: cr.courseA, courseB: cr.courseB, note: cr.note || '' }
      );
      coreqCount++;
    }
    console.log(`   ✅ Created ${coreqCount} co-requisite links.`);

    // Course Topics
    let topicLinks = 0;
    for (const ct of relationships.courseTopics) {
      await session.run(
        `MATCH (c:Course {id: $courseId}), (t:Topic {id: $topicId})
         MERGE (c)-[:COVERS]->(t)`,
        { courseId: ct.courseId, topicId: ct.topicId }
      );
      topicLinks++;
    }
    console.log(`   ✅ Created ${topicLinks} course-topic links.`);

    // Degree Requirements
    let degLinks = 0;
    for (const dr of relationships.degreeRequirements) {
      await session.run(
        `MATCH (deg:Degree {id: $degreeId}), (c:Course {id: $courseId})
         MERGE (deg)-[r:INCLUDES]->(c)
         SET r.required = $required,
             r.category = $category`,
        { degreeId: dr.degreeId, courseId: dr.courseId, required: dr.required, category: dr.category }
      );
      degLinks++;
    }
    console.log(`   ✅ Created ${degLinks} degree requirement links.`);

    console.log('\n🎉 CognoDB Database Seeding Completed Successfully!');
  } catch (error) {
    console.error('❌ Seeding failed with error:', error);
    process.exit(1);
  } finally {
    await session.close();
    await closeDriver();
  }
}

if (require.main === module) {
  seed();
}

module.exports = seed;
