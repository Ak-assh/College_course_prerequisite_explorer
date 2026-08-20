/**
 * Express Router: /api/eligibility
 */
const express = require('express');
const router = express.Router();
const eligibilityQueries = require('../queries/eligibility-queries');

/**
 * POST /api/eligibility/check
 * Find unlocked courses given an array of completed course IDs
 * Body: { completed: ["cs-101", "math-101"] }
 */
router.post('/check', async (req, res, next) => {
  try {
    const completed = req.body.completed || [];
    const unlocked = await eligibilityQueries.getUnlockedCourses(completed);
    res.json({
      unlockedCourses: unlocked,
      count: unlocked.length,
      completedCount: completed.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/eligibility/next
 * Find courses that are exactly one prerequisite away from being unlocked
 * Body: { completed: ["cs-101"] }
 */
router.post('/next', async (req, res, next) => {
  try {
    const completed = req.body.completed || [];
    const almostEligible = await eligibilityQueries.getAlmostEligibleCourses(completed);
    res.json({
      almostEligibleCourses: almostEligible,
      count: almostEligible.length
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
