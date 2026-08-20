/**
 * Course Cypher Queries
 * 100% Parameterized openCypher queries for course retrieval and search.
 */
const { runQuery } = require('../db');
const mockDataService = require('../mock-data-service');

/**
 * Retrieves all courses with optional department, level, and semester filtering.
 * @param {Object} filters 
 * @returns {Promise<Array<Object>>}
 */
async function getAllCourses(filters = {}) {
  try {
    const cypher = `
      MATCH (d:Department)-[:OFFERS]->(c:Course)
      WHERE ($department IS NULL OR d.id = $department)
        AND ($level IS NULL OR c.level = $level)
        AND ($semester IS NULL OR c.semester = $semester OR c.semester = 'Both')
      OPTIONAL MATCH (i:Instructor)-[:TEACHES]->(c)
      RETURN c {
        .*,
        department: d { .id, .name, .code, .color },
        instructor: i { .id, .name, .title }
      } AS course
      ORDER BY c.level ASC, c.code ASC
    `;
    const params = {
      department: filters.department || null,
      level: filters.level ? parseInt(filters.level, 10) : null,
      semester: (filters.semester && filters.semester !== 'All') ? filters.semester : null
    };

    const records = await runQuery(cypher, params);
    return records.map(r => r.course);
  } catch (error) {
    if (error.code === 'DB_UNAVAILABLE' || error.status === 503) {
      return mockDataService.getAllCourses(filters);
    }
    throw error;
  }
}

/**
 * Retrieves single course details with full metadata, topics, prerequisites, and unlocks.
 * @param {string} courseId 
 * @returns {Promise<Object|null>}
 */
async function getCourseById(courseId) {
  try {
    const cypher = `
      MATCH (c:Course {id: $courseId})
      OPTIONAL MATCH (d:Department)-[:OFFERS]->(c)
      OPTIONAL MATCH (i:Instructor)-[:TEACHES]->(c)
      OPTIONAL MATCH (c)-[:COVERS]->(t:Topic)
      OPTIONAL MATCH (prereq:Course)-[r:REQUIRES]->(c)
      OPTIONAL MATCH (c)-[:REQUIRES]->(unlocks:Course)
      OPTIONAL MATCH (c)-[cr:COREQUISITE_OF]-(coreq:Course)
      WITH c, d, i,
           collect(DISTINCT t { .id, .name, .category }) AS topics,
           collect(DISTINCT prereq { .id, .code, .name, .credits, .level }) AS directPrerequisites,
           collect(DISTINCT unlocks { .id, .code, .name, .credits, .level }) AS unlocks,
           collect(DISTINCT coreq { .id, .code, .name }) AS corequisites
      RETURN c {
        .*,
        department: d { .id, .name, .code, .color },
        instructor: i { .id, .name, .email, .title },
        topics: [top IN topics WHERE top.id IS NOT NULL],
        directPrerequisites: [p IN directPrerequisites WHERE p.id IS NOT NULL],
        unlocks: [u IN unlocks WHERE u.id IS NOT NULL],
        corequisites: [cr IN corequisites WHERE cr.id IS NOT NULL]
      } AS course
    `;
    const records = await runQuery(cypher, { courseId });
    if (records.length === 0 || !records[0].course) return null;
    return records[0].course;
  } catch (error) {
    if (error.code === 'DB_UNAVAILABLE' || error.status === 503) {
      return mockDataService.getCourseById(courseId);
    }
    throw error;
  }
}

/**
 * Searches courses by name, code, or description.
 * @param {string} query 
 * @returns {Promise<Array<Object>>}
 */
async function searchCourses(query) {
  try {
    const cypher = `
      MATCH (d:Department)-[:OFFERS]->(c:Course)
      WHERE toLower(c.name) CONTAINS toLower($query)
         OR toLower(c.code) CONTAINS toLower($query)
         OR toLower(c.description) CONTAINS toLower($query)
      RETURN c {
        .*,
        department: d { .id, .name, .code, .color }
      } AS course
      ORDER BY 
        CASE WHEN toLower(c.code) STARTS WITH toLower($query) THEN 0 ELSE 1 END,
        c.level ASC
      LIMIT 25
    `;
    const records = await runQuery(cypher, { query: query || '' });
    return records.map(r => r.course);
  } catch (error) {
    if (error.code === 'DB_UNAVAILABLE' || error.status === 503) {
      return mockDataService.searchCourses(query);
    }
    throw error;
  }
}

/**
 * Retrieves all multi-hop prerequisites for a given course.
 * @param {string} courseId 
 * @returns {Promise<Array<Object>>}
 */
async function getCoursePrerequisites(courseId) {
  try {
    const cypher = `
      MATCH path = (prereq:Course)-[r:REQUIRES*1..10]->(c:Course {id: $courseId})
      MATCH (d:Department)-[:OFFERS]->(prereq)
      RETURN DISTINCT prereq {
        .*,
        department: d { .id, .name, .code, .color },
        hopCount: length(path)
      } AS prereq
      ORDER BY prereq.hopCount ASC, prereq.level ASC
    `;
    const records = await runQuery(cypher, { courseId });
    return records.map(r => r.prereq);
  } catch (error) {
    if (error.code === 'DB_UNAVAILABLE' || error.status === 503) {
      return mockDataService.getPrerequisites(courseId);
    }
    throw error;
  }
}

/**
 * Finds related courses that share topics with the specified course.
 * @param {string} courseId 
 * @returns {Promise<Array<Object>>}
 */
async function getRelatedCourses(courseId) {
  try {
    const cypher = `
      MATCH (c:Course {id: $courseId})-[:COVERS]->(t:Topic)<-[:COVERS]-(related:Course)
      WHERE related.id <> $courseId
      MATCH (d:Department)-[:OFFERS]->(related)
      WITH related, d, count(t) AS sharedTopics, collect(t.name) AS topicNames
      RETURN related {
        .*,
        department: d { .id, .name, .code, .color },
        sharedTopicsCount: sharedTopics,
        sharedTopicNames: topicNames
      } AS course
      ORDER BY sharedTopics DESC, related.level ASC
      LIMIT 8
    `;
    const records = await runQuery(cypher, { courseId });
    return records.map(r => r.course);
  } catch (error) {
    if (error.code === 'DB_UNAVAILABLE' || error.status === 503) {
      // Fallback
      const c = mockDataService.getCourseById(courseId);
      if (!c) return [];
      const topicIds = new Set((c.topics || []).map(t => t.id));
      const all = mockDataService.getAllCourses();
      return all
        .filter(other => other.id !== courseId)
        .map(other => {
          const shared = (other.topics || []).filter(t => topicIds.has(t.id));
          return { ...other, sharedTopicsCount: shared.length, sharedTopicNames: shared.map(t => t.name) };
        })
        .filter(other => other.sharedTopicsCount > 0)
        .sort((a, b) => b.sharedTopicsCount - a.sharedTopicsCount)
        .slice(0, 8);
    }
    throw error;
  }
}

module.exports = {
  getAllCourses,
  getCourseById,
  searchCourses,
  getCoursePrerequisites,
  getRelatedCourses
};
