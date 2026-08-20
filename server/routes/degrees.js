/**
 * Express Router: /api/degrees
 */
const express = require('express');
const router = express.Router();
const degreeQueries = require('../queries/degree-queries');

/**
 * GET /api/degrees
 * List all degree programs
 */
router.get('/', async (req, res, next) => {
  try {
    const degrees = await degreeQueries.getDegrees();
    res.json({ degrees, count: degrees.length });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/degrees/:id
 * Retrieve degree requirements matrix
 */
router.get('/:id', async (req, res, next) => {
  try {
    const degree = await degreeQueries.getDegreeDetails(req.params.id);
    if (!degree) {
      return res.status(404).json({ error: `Degree program not found with id: ${req.params.id}` });
    }
    res.json(degree);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/degrees/:id/progress
 * Calculate degree completion progress and status for a student
 * Body: { completed: ["cs-101", "cs-102", "math-101"] }
 */
router.post('/:id/progress', async (req, res, next) => {
  try {
    const completed = req.body.completed || [];
    const progress = await degreeQueries.getDegreeProgress(req.params.id, completed);
    if (!progress) {
      return res.status(404).json({ error: `Degree program not found with id: ${req.params.id}` });
    }
    res.json(progress);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/degrees/:id/critical-path
 * Get the longest prerequisite chain in the degree
 */
router.get('/:id/critical-path', async (req, res, next) => {
  try {
    const criticalPath = await degreeQueries.getCriticalPath(req.params.id);
    if (!criticalPath) {
      return res.status(404).json({ error: `Degree program not found with id: ${req.params.id}` });
    }
    res.json(criticalPath);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
