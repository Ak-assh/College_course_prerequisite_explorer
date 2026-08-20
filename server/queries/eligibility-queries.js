/**
 * Eligibility Cypher Queries
 * Implements relational-awkward queries for unlocked and almost-eligible course detection.
 */
const { runQuery } = require('../db');
const mockDataService = require('../mock-data-service');

/**
 * Finds all courses for which the student meets ALL prerequisites.
 * Demonstrates the power of openCypher's ALL() predicate over recursive SQL JOINs.
 * 
 * @param {Array<string>} completedIds - List of course IDs the student has completed
 * @returns {Promise<Array<Object>>}
 */
async function getUnlockedCourses(completedIds = []) {
  try {
    const cypher = `
      MATCH (d:Department)-[:OFFERS]->(c:Course)
      WHERE NOT c.id IN $completedIds
      OPTIONAL MATCH (prereq:Course)-[r:REQUIRES]->(c)
      WITH c, d, collect(prereq.id) AS prereqIds, collect(prereq) AS prereqs
      WHERE ALL(pid IN prereqIds WHERE pid IN $completedIds)
      RETURN c {
        .*,
        department: d { .id, .name, .code, .color },
        prerequisiteCount: size(prereqIds),
        prerequisites: [p IN prereqs | { id: p.id, code: p.code, name: p.name }]
      } AS course
      ORDER BY c.level ASC, c.code ASC
    `;
    const records = await runQuery(cypher, { completedIds: completedIds || [] });
    return records.map(r => r.course);
  } catch (error) {
    if (error.code === 'DB_UNAVAILABLE' || error.status === 503) {
      return mockDataService.getUnlockedCourses(completedIds);
    }
    throw error;
  }
}

/**
 * Finds courses where the student is missing EXACTLY ONE prerequisite.
 * Enables the "Next Steps / Fast Track" advisory feature.
 * 
 * @param {Array<string>} completedIds 
 * @returns {Promise<Array<Object>>}
 */
async function getAlmostEligibleCourses(completedIds = []) {
  try {
    const cypher = `
      MATCH (d:Department)-[:OFFERS]->(c:Course)
      WHERE NOT c.id IN $completedIds
      MATCH (prereq:Course)-[r:REQUIRES]->(c)
      WITH c, d, collect(prereq) AS allPrereqs, [p IN collect(prereq) WHERE NOT p.id IN $completedIds] AS missingPrereqs
      WHERE size(missingPrereqs) = 1
      RETURN c {
        .*,
        department: d { .id, .name, .code, .color },
        missingPrerequisite: {
          id: missingPrereqs[0].id,
          code: missingPrereqs[0].code,
          name: missingPrereqs[0].name
        },
        totalPrerequisites: size(allPrereqs)
      } AS course
      ORDER BY c.level ASC, c.code ASC
    `;
    const records = await runQuery(cypher, { completedIds: completedIds || [] });
    return records.map(r => r.course);
  } catch (error) {
    if (error.code === 'DB_UNAVAILABLE' || error.status === 503) {
      return mockDataService.getAlmostEligibleCourses(completedIds);
    }
    throw error;
  }
}

module.exports = {
  getUnlockedCourses,
  getAlmostEligibleCourses
};
