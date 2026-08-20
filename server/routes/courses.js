/**
 * Express Router: /api/courses
 */
const express = require('express');
const router = express.Router();
const courseQueries = require('../queries/course-queries');

/**
 * GET /api/courses
 * List all courses with optional query filters (?department=dept-cs&level=200&semester=Fall)
 */
router.get('/', async (req, res, next) => {
  try {
    const { department, level, semester } = req.query;
    const courses = await courseQueries.getAllCourses({ department, level, semester });
    res.json({ courses, count: courses.length });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/courses/search
 * Search courses by query string (?q=algorithms)
 */
router.get('/search', async (req, res, next) => {
  try {
    const { q } = req.query;
    const results = await courseQueries.searchCourses(q || '');
    res.json({ results, count: results.length });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/courses/:id
 * Retrieve full course profile
 */
router.get('/:id', async (req, res, next) => {
  try {
    const course = await courseQueries.getCourseById(req.params.id);
    if (!course) {
      return res.status(404).json({ error: `Course not found with id: ${req.params.id}` });
    }
    res.json(course);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/courses/:id/prerequisites
 * Multi-hop prerequisite traversal for a course
 */
router.get('/:id/prerequisites', async (req, res, next) => {
  try {
    const prerequisites = await courseQueries.getCoursePrerequisites(req.params.id);
    res.json({
      courseId: req.params.id,
      prerequisites,
      totalCount: prerequisites.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/courses/:id/related
 * Courses related by shared topics
 */
router.get('/:id/related', async (req, res, next) => {
  try {
    const related = await courseQueries.getRelatedCourses(req.params.id);
    res.json({
      courseId: req.params.id,
      related,
      count: related.length
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
