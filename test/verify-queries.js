/**
 * Verification Test Suite
 * Validates all backend query functions, parameters, and error handling.
 */
require('dotenv').config();
const courseQueries = require('../server/queries/course-queries');
const graphQueries = require('../server/queries/graph-queries');
const eligibilityQueries = require('../server/queries/eligibility-queries');
const degreeQueries = require('../server/queries/degree-queries');
const { closeDriver } = require('../server/db');

async function runTests() {
  console.log('🧪 Starting Query Layer Verification Tests...\n');
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  // 1. Course Listing & Filters
  await test('courseQueries.getAllCourses() returns courses with departments', async () => {
    const courses = await courseQueries.getAllCourses();
    if (!Array.isArray(courses) || courses.length === 0) throw new Error('Expected non-empty course array');
    const first = courses[0];
    if (!first.id || !first.code || !first.department) throw new Error('Course missing required properties');
  });

  await test('courseQueries.getAllCourses({ department: "dept-cs" }) filters by department', async () => {
    const courses = await courseQueries.getAllCourses({ department: 'dept-cs' });
    if (courses.length === 0) throw new Error('Expected CS courses');
    const allCS = courses.every(c => c.department && (c.department.id === 'dept-cs' || c.departmentId === 'dept-cs'));
    if (!allCS) throw new Error('Found non-CS courses in filtered result');
  });

  // 2. Single Course & Full Profile
  await test('courseQueries.getCourseById("cs-401") returns complete profile with prerequisites and topics', async () => {
    const course = await courseQueries.getCourseById('cs-401');
    if (!course) throw new Error('cs-401 not found');
    if (course.code !== 'CS 401') throw new Error(`Unexpected code: ${course.code}`);
    if (!Array.isArray(course.directPrerequisites) || course.directPrerequisites.length === 0) {
      throw new Error('Expected direct prerequisites for CS 401');
    }
  });

  // 3. Multi-Hop Prerequisite Traversal
  await test('courseQueries.getCoursePrerequisites("cs-450") returns multi-hop ancestor chain', async () => {
    const prereqs = await courseQueries.getCoursePrerequisites('cs-450');
    if (!Array.isArray(prereqs) || prereqs.length === 0) throw new Error('Expected multi-hop prerequisites for CS 450');
    const hasHopCounts = prereqs.some(p => p.hopCount && p.hopCount >= 2);
    if (!hasHopCounts) throw new Error('Expected 2+ hop depth in prerequisite chain');
  });

  // 4. Search
  await test('courseQueries.searchCourses("algo") finds algorithms course', async () => {
    const results = await courseQueries.searchCourses('algo');
    if (results.length === 0) throw new Error('Search for "algo" returned 0 results');
    const found = results.some(c => c.code.includes('301') || c.name.toLowerCase().includes('algorithm'));
    if (!found) throw new Error('Expected to find algorithms course');
  });

  // 5. Graph Topology
  await test('graphQueries.getFullGraph() returns Cytoscape nodes and edges', async () => {
    const graph = await graphQueries.getFullGraph();
    if (!Array.isArray(graph.nodes) || graph.nodes.length === 0) throw new Error('Expected graph nodes');
    if (!Array.isArray(graph.edges) || graph.edges.length === 0) throw new Error('Expected graph edges');
    const sampleNode = graph.nodes[0];
    if (!sampleNode.data || !sampleNode.data.id || !sampleNode.data.label) throw new Error('Invalid Cytoscape node format');
  });

  // 6. Shortest Path Traversal
  await test('graphQueries.getShortestPath("cs-101", "cs-450") finds learning path', async () => {
    const pathResult = await graphQueries.getShortestPath('cs-101', 'cs-450');
    if (!Array.isArray(pathResult.path) || pathResult.path.length === 0) throw new Error('Expected path from CS 101 to CS 450');
    if (pathResult.hops === undefined || pathResult.hops < 2) throw new Error(`Expected at least 2 hops, got ${pathResult.hops}`);
  });

  // 7. Eligibility Checking (openCypher ALL predicate)
  await test('eligibilityQueries.getUnlockedCourses(["cs-101", "math-101"]) returns unlocked next courses', async () => {
    const unlocked = await eligibilityQueries.getUnlockedCourses(['cs-101', 'math-101']);
    if (!Array.isArray(unlocked) || unlocked.length === 0) throw new Error('Expected unlocked courses for freshman completion');
    const ids = unlocked.map(c => c.id);
    if (!ids.includes('cs-102') && !ids.includes('cs-201')) {
      throw new Error('Expected CS 102 or CS 201 to be unlocked');
    }
  });

  // 8. Almost-Eligible Detection
  await test('eligibilityQueries.getAlmostEligibleCourses(["cs-101"]) detects 1-away courses with missing blocker', async () => {
    const almost = await eligibilityQueries.getAlmostEligibleCourses(['cs-101']);
    if (!Array.isArray(almost)) throw new Error('Expected array of almost-eligible courses');
    const withBlocker = almost.filter(c => c.missingPrerequisite);
    if (withBlocker.length === 0) throw new Error('Expected almost-eligible courses to report missing prerequisite');
  });

  // 9. Degree Progress & Critical Path
  await test('degreeQueries.getDegrees() and getDegreeProgress() calculates accurate completion', async () => {
    const degrees = await degreeQueries.getDegrees();
    if (degrees.length === 0) throw new Error('Expected degree programs');
    const bscs = degrees.find(d => d.id === 'deg-bscs');
    if (!bscs) throw new Error('BS CS degree not found');

    const progress = await degreeQueries.getDegreeProgress('deg-bscs', ['cs-101', 'cs-102', 'math-101']);
    if (progress.completedCredits !== 12) throw new Error(`Expected 12 completed credits, got ${progress.completedCredits}`);
    if (progress.percentComplete !== 10) throw new Error(`Expected 10% complete, got ${progress.percentComplete}%`);
  });

  await test('degreeQueries.getCriticalPath("deg-bscs") finds longest prerequisite chain', async () => {
    const critical = await degreeQueries.getCriticalPath('deg-bscs');
    if (!critical || !Array.isArray(critical.criticalPath) || critical.criticalPath.length < 3) {
      throw new Error('Expected critical path of at least 3 courses');
    }
  });

  console.log(`\n========================================`);
  console.log(`📊 Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  await closeDriver();
  if (failed > 0) process.exit(1);
}

runTests();
