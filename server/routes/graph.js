/**
 * Express Router: /api/graph
 */
const express = require('express');
const router = express.Router();
const graphQueries = require('../queries/graph-queries');

/**
 * GET /api/graph/full
 * Full course graph for Cytoscape.js visualization
 */
router.get('/full', async (req, res, next) => {
  try {
    const graph = await graphQueries.getFullGraph();
    res.json(graph);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/graph/department/:deptId
 * Subgraph for a specific department
 */
router.get('/department/:deptId', async (req, res, next) => {
  try {
    const graph = await graphQueries.getDepartmentGraph(req.params.deptId);
    res.json(graph);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/graph/path
 * Compute shortest learning path between two courses
 * Body: { from: "cs-101", to: "cs-450" }
 */
router.post('/path', async (req, res, next) => {
  try {
    const { from, to } = req.body;
    if (!from || !to) {
      return res.status(400).json({ error: 'Both "from" and "to" course IDs are required.' });
    }
    const pathResult = await graphQueries.getShortestPath(from, to);
    res.json(pathResult);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
