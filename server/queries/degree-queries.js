/**
 * Degree Cypher Queries
 * Degree mapping, completion progress calculation, and critical path analysis.
 */
const { runQuery } = require('../db');
const mockDataService = require('../mock-data-service');

/**
 * Retrieves all degree programs.
 * @returns {Promise<Array<Object>>}
 */
async function getDegrees() {
  try {
    const cypher = `
      MATCH (deg:Degree)
      OPTIONAL MATCH (d:Department)-[:OFFERS]->(deg)
      RETURN deg {
        .*,
        department: d { .id, .name, .code, .color }
      } AS degree
      ORDER BY deg.name ASC
    `;
    const records = await runQuery(cypher);
    return records.map(r => r.degree);
  } catch (error) {
    if (error.code === 'DB_UNAVAILABLE' || error.status === 503) {
      return mockDataService.getDegrees();
    }
    throw error;
  }
}

/**
 * Retrieves degree details and its full course requirement matrix.
 * @param {string} degreeId 
 * @returns {Promise<Object|null>}
 */
async function getDegreeDetails(degreeId) {
  try {
    const cypher = `
      MATCH (deg:Degree {id: $degreeId})
      OPTIONAL MATCH (d:Department)-[:OFFERS]->(deg)
      OPTIONAL MATCH (deg)-[r:INCLUDES]->(c:Course)
      OPTIONAL MATCH (cd:Department)-[:OFFERS]->(c)
      WITH deg, d, collect(c {
        .*,
        required: r.required,
        category: r.category,
        department: cd { .id, .name, .code, .color }
      }) AS degreeCourses
      RETURN deg {
        .*,
        department: d { .id, .name, .code, .color },
        courses: degreeCourses
      } AS degree
    `;
    const records = await runQuery(cypher, { degreeId });
    if (records.length === 0) return null;
    return records[0].degree;
  } catch (error) {
    if (error.code === 'DB_UNAVAILABLE' || error.status === 503) {
      return mockDataService.getDegreeDetails(degreeId);
    }
    throw error;
  }
}

/**
 * Calculates degree progress and course statuses for a student.
 * @param {string} degreeId 
 * @param {Array<string>} completedIds 
 * @returns {Promise<Object>}
 */
async function getDegreeProgress(degreeId, completedIds = []) {
  try {
    // We fetch degree details and evaluate progress dynamically
    const degreeDetails = await getDegreeDetails(degreeId);
    if (!degreeDetails) return null;

    const completedSet = new Set(completedIds || []);
    let completedCredits = 0;

    const coursesWithStatus = degreeDetails.courses.map(c => {
      const isCompleted = completedSet.has(c.id);
      if (isCompleted) {
        completedCredits += c.credits || 0;
      }
      return {
        ...c,
        isCompleted
      };
    });

    const percentComplete = degreeDetails.totalCredits > 0
      ? Math.min(100, Math.round((completedCredits / degreeDetails.totalCredits) * 100))
      : 0;

    return {
      degree: degreeDetails,
      totalCredits: degreeDetails.totalCredits,
      completedCredits,
      percentComplete,
      courses: coursesWithStatus
    };
  } catch (error) {
    if (error.code === 'DB_UNAVAILABLE' || error.status === 503) {
      return mockDataService.getDegreeProgress(degreeId, completedIds);
    }
    throw error;
  }
}

/**
 * Evaluates the critical path (deepest prerequisite chain) for the degree program.
 * @param {string} degreeId 
 * @returns {Promise<Object>}
 */
async function getCriticalPath(degreeId) {
  try {
    const cypher = `
      MATCH (deg:Degree {id: $degreeId})-[:INCLUDES]->(terminal:Course)
      MATCH path = (root:Course)-[:REQUIRES*1..8]->(terminal)
      WHERE NOT EXISTS { MATCH (:Course)-[:REQUIRES]->(root) }
      WITH path, length(path) AS chainLength, terminal, root
      ORDER BY chainLength DESC
      LIMIT 1
      RETURN [n IN nodes(path) | n { .id, .code, .name, .credits, .level }] AS criticalPath,
             chainLength
    `;
    const records = await runQuery(cypher, { degreeId });
    if (records.length > 0) {
      return {
        degreeId,
        chainLength: records[0].chainLength,
        criticalPath: records[0].criticalPath
      };
    }
    return mockDataService.getCriticalPath(degreeId);
  } catch (error) {
    if (error.code === 'DB_UNAVAILABLE' || error.status === 503) {
      return mockDataService.getCriticalPath(degreeId);
    }
    throw error;
  }
}

module.exports = {
  getDegrees,
  getDegreeDetails,
  getDegreeProgress,
  getCriticalPath
};
