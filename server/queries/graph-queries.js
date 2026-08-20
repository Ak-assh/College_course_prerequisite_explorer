/**
 * Graph Traversal Cypher Queries
 * Implements full graph export, department filtering, and shortestPath() queries.
 */
const { runQuery } = require('../db');
const mockDataService = require('../mock-data-service');

/**
 * Retrieves full course graph (nodes and edges) for Cytoscape.js visualization.
 * @returns {Promise<{ nodes: Array, edges: Array }>}
 */
async function getFullGraph() {
  try {
    const cypher = `
      MATCH (d:Department)-[:OFFERS]->(c:Course)
      OPTIONAL MATCH (c)-[r:REQUIRES]->(target:Course)
      WITH collect(DISTINCT {
        data: {
          id: c.id,
          label: c.code,
          name: c.name,
          level: c.level,
          credits: c.credits,
          semester: c.semester,
          color: d.color,
          department: d.name
        }
      }) AS nodes,
      collect(DISTINCT {
        data: {
          id: 'e-' + c.id + '-' + target.id,
          source: c.id,
          target: target.id,
          type: r.type,
          minGrade: r.minGrade
        }
      }) AS rawEdges
      RETURN nodes, [e IN rawEdges WHERE e.data.source IS NOT NULL AND e.data.target IS NOT NULL] AS edges
    `;
    const records = await runQuery(cypher);
    if (records.length > 0) {
      return {
        nodes: records[0].nodes || [],
        edges: records[0].edges || []
      };
    }
    return { nodes: [], edges: [] };
  } catch (error) {
    if (error.code === 'DB_UNAVAILABLE' || error.status === 503) {
      return mockDataService.getFullGraph();
    }
    throw error;
  }
}

/**
 * Retrieves a department-specific subgraph.
 * @param {string} deptId 
 * @returns {Promise<{ nodes: Array, edges: Array }>}
 */
async function getDepartmentGraph(deptId) {
  try {
    const cypher = `
      MATCH (d:Department {id: $deptId})-[:OFFERS]->(c:Course)
      OPTIONAL MATCH (c)-[r:REQUIRES]->(target:Course)
      WHERE (d)-[:OFFERS]->(target)
      WITH collect(DISTINCT {
        data: {
          id: c.id,
          label: c.code,
          name: c.name,
          level: c.level,
          credits: c.credits,
          color: d.color,
          department: d.name
        }
      }) AS nodes,
      collect(DISTINCT {
        data: {
          id: 'e-dept-' + c.id + '-' + target.id,
          source: c.id,
          target: target.id,
          type: r.type
        }
      }) AS rawEdges
      RETURN nodes, [e IN rawEdges WHERE e.data.source IS NOT NULL AND e.data.target IS NOT NULL] AS edges
    `;
    const records = await runQuery(cypher, { deptId });
    if (records.length > 0) {
      return {
        nodes: records[0].nodes || [],
        edges: records[0].edges || []
      };
    }
    return { nodes: [], edges: [] };
  } catch (error) {
    if (error.code === 'DB_UNAVAILABLE' || error.status === 503) {
      return mockDataService.getDepartmentGraph(deptId);
    }
    throw error;
  }
}

/**
 * Computes shortest path between two courses using Cypher shortestPath().
 * @param {string} fromId 
 * @param {string} toId 
 * @returns {Promise<{ path: Array, hops: number }>}
 */
async function getShortestPath(fromId, toId) {
  try {
    const cypher = `
      MATCH (start:Course {id: $fromId}), (target:Course {id: $toId})
      MATCH path = shortestPath((start)-[:REQUIRES*]->(target))
      MATCH (d:Department)-[:OFFERS]->(c:Course)
      WHERE c IN nodes(path)
      WITH path, collect({ course: c, dept: d }) AS courseDepts
      RETURN [n IN nodes(path) | 
        n {
          .*,
          department: [cd IN courseDepts WHERE cd.course.id = n.id][0].dept { .id, .name, .code, .color }
        }
      ] AS pathNodes,
      length(path) AS hopCount
    `;
    const records = await runQuery(cypher, { fromId, toId });
    if (records.length > 0 && records[0].pathNodes) {
      return {
        path: records[0].pathNodes,
        hops: records[0].hopCount
      };
    }
    return { path: [], hops: 0, message: 'No prerequisite path found.' };
  } catch (error) {
    if (error.code === 'DB_UNAVAILABLE' || error.status === 503) {
      return mockDataService.getShortestPath(fromId, toId);
    }
    throw error;
  }
}

module.exports = {
  getFullGraph,
  getDepartmentGraph,
  getShortestPath
};
