/**
 * In-memory Graph Engine & Fallback Provider
 * Provides identical graph traversal, BFS shortest-path, multi-hop ancestor search,
 * and eligibility calculation directly from data JSON files when running offline or testing.
 */
const departments = require('../scripts/data/departments.json');
const courses = require('../scripts/data/courses.json');
const degrees = require('../scripts/data/degrees.json');
const instructors = require('../scripts/data/instructors.json');
const topics = require('../scripts/data/topics.json');
const relationships = require('../scripts/data/relationships.json');

// Build quick lookup maps
const courseMap = new Map(courses.map(c => [c.id, { ...c }]));
const deptMap = new Map(departments.map(d => [d.id, { ...d }]));
const instMap = new Map(instructors.map(i => [i.id, { ...i }]));
const topicMap = new Map(topics.map(t => [t.id, { ...t }]));
const degreeMap = new Map(degrees.map(d => [d.id, { ...d }]));

// Build adjacency lists for graph traversals
// outgoing: course -> courses it requires (prerequisites)
// incoming: course -> courses that require it (unlocks)
const outgoingPrereqs = new Map(); // c -> [ { id: prereqId, type, minGrade } ]
const incomingUnlocks = new Map(); // prereq -> [ { id: dependentId, type, minGrade } ]
const courseTopicMap = new Map();  // courseId -> [ topic ]

courses.forEach(c => {
  outgoingPrereqs.set(c.id, []);
  incomingUnlocks.set(c.id, []);
  courseTopicMap.set(c.id, []);
});

relationships.prerequisites.forEach(rel => {
  if (courseMap.has(rel.from) && courseMap.has(rel.to)) {
    // rel.from is prerequisite for rel.to
    if (!outgoingPrereqs.has(rel.to)) outgoingPrereqs.set(rel.to, []);
    outgoingPrereqs.get(rel.to).push({ id: rel.from, type: rel.type, minGrade: rel.minGrade });

    if (!incomingUnlocks.has(rel.from)) incomingUnlocks.set(rel.from, []);
    incomingUnlocks.get(rel.from).push({ id: rel.to, type: rel.type, minGrade: rel.minGrade });
  }
});

relationships.courseTopics.forEach(ct => {
  if (courseTopicMap.has(ct.courseId) && topicMap.has(ct.topicId)) {
    courseTopicMap.get(ct.courseId).push(topicMap.get(ct.topicId));
  }
});

function enrichCourse(course) {
  if (!course) return null;
  const dept = deptMap.get(course.departmentId) || null;
  const inst = instMap.get(course.instructorId) || null;
  const topicsList = courseTopicMap.get(course.id) || [];
  
  const directPrereqs = (outgoingPrereqs.get(course.id) || []).map(p => {
    const pc = courseMap.get(p.id);
    return pc ? { id: pc.id, code: pc.code, name: pc.name, credits: pc.credits, level: pc.level, type: p.type, minGrade: p.minGrade } : null;
  }).filter(Boolean);

  const unlocksList = (incomingUnlocks.get(course.id) || []).map(u => {
    const uc = courseMap.get(u.id);
    return uc ? { id: uc.id, code: uc.code, name: uc.name, credits: uc.credits, level: uc.level } : null;
  }).filter(Boolean);

  const coreqs = relationships.corequisites
    .filter(cr => cr.courseA === course.id || cr.courseB === course.id)
    .map(cr => {
      const otherId = cr.courseA === course.id ? cr.courseB : cr.courseA;
      const other = courseMap.get(otherId);
      return other ? { id: other.id, code: other.code, name: other.name, note: cr.note } : null;
    })
    .filter(Boolean);

  return {
    ...course,
    department: dept,
    instructor: inst,
    topics: topicsList,
    directPrerequisites: directPrereqs,
    unlocks: unlocksList,
    corequisites: coreqs
  };
}

const mockDataService = {
  getAllCourses(filters = {}) {
    let result = courses.map(enrichCourse);
    if (filters.department) {
      result = result.filter(c => c.departmentId === filters.department || (c.department && c.department.id === filters.department));
    }
    if (filters.level) {
      result = result.filter(c => c.level === parseInt(filters.level, 10));
    }
    if (filters.semester && filters.semester !== 'All') {
      result = result.filter(c => c.semester === filters.semester || c.semester === 'Both');
    }
    return result;
  },

  getCourseById(id) {
    const c = courseMap.get(id);
    return c ? enrichCourse(c) : null;
  },

  searchCourses(query) {
    if (!query) return courses.slice(0, 20).map(enrichCourse);
    const q = query.toLowerCase().trim();
    const matches = courses.filter(c => 
      c.code.toLowerCase().includes(q) || 
      c.name.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q)
    );
    return matches.map(enrichCourse);
  },

  getPrerequisites(courseId) {
    // Multi-hop BFS traversal to get all ancestors with hop counts
    const visited = new Map(); // id -> { course, hopCount }
    const queue = [{ id: courseId, hop: 0 }];

    while (queue.length > 0) {
      const current = queue.shift();
      const prereqs = outgoingPrereqs.get(current.id) || [];

      for (const p of prereqs) {
        if (!visited.has(p.id)) {
          const course = courseMap.get(p.id);
          if (course) {
            visited.set(p.id, {
              ...enrichCourse(course),
              hopCount: current.hop + 1,
              prereqType: p.type,
              minGrade: p.minGrade
            });
            queue.push({ id: p.id, hop: current.hop + 1 });
          }
        }
      }
    }

    return Array.from(visited.values()).sort((a, b) => a.hopCount - b.hopCount);
  },

  getFullGraph() {
    const nodes = courses.map(c => {
      const dept = deptMap.get(c.departmentId);
      return {
        data: {
          id: c.id,
          label: c.code,
          name: c.name,
          level: c.level,
          credits: c.credits,
          semester: c.semester,
          color: dept ? dept.color : '#6366f1',
          department: dept ? dept.name : 'Unknown'
        }
      };
    });

    const edges = relationships.prerequisites.map((rel, idx) => ({
      data: {
        id: `e-${rel.from}-${rel.to}-${idx}`,
        source: rel.from,
        target: rel.to,
        type: rel.type,
        minGrade: rel.minGrade || 'C'
      }
    }));

    return { nodes, edges };
  },

  getDepartmentGraph(deptId) {
    const deptCourses = courses.filter(c => c.departmentId === deptId);
    const courseIds = new Set(deptCourses.map(c => c.id));
    const dept = deptMap.get(deptId);

    const nodes = deptCourses.map(c => ({
      data: {
        id: c.id,
        label: c.code,
        name: c.name,
        level: c.level,
        credits: c.credits,
        color: dept ? dept.color : '#6366f1',
        department: dept ? dept.name : 'Unknown'
      }
    }));

    const edges = relationships.prerequisites
      .filter(rel => courseIds.has(rel.from) && courseIds.has(rel.to))
      .map((rel, idx) => ({
        data: {
          id: `e-dept-${rel.from}-${rel.to}-${idx}`,
          source: rel.from,
          target: rel.to,
          type: rel.type
        }
      }));

    return { nodes, edges };
  },

  getShortestPath(fromId, toId) {
    // Directed / Undirected BFS shortest path
    if (fromId === toId) {
      const c = courseMap.get(fromId);
      return { path: c ? [enrichCourse(c)] : [], hops: 0 };
    }

    const queue = [[fromId]];
    const visited = new Set([fromId]);

    while (queue.length > 0) {
      const path = queue.shift();
      const currentId = path[path.length - 1];

      if (currentId === toId) {
        const fullPath = path.map(id => enrichCourse(courseMap.get(id)));
        return { path: fullPath, hops: path.length - 1 };
      }

      // Look at outgoing unlocks (courses you can take next)
      const nextCourses = (incomingUnlocks.get(currentId) || []).map(u => u.id);
      for (const nextId of nextCourses) {
        if (!visited.has(nextId)) {
          visited.add(nextId);
          queue.push([...path, nextId]);
        }
      }
    }

    return { path: [], hops: 0, message: 'No direct prerequisite path found between selected courses.' };
  },

  getUnlockedCourses(completedIds = []) {
    const completedSet = new Set(completedIds);
    const unlocked = [];

    courses.forEach(c => {
      if (completedSet.has(c.id)) return; // Already done

      const prereqs = outgoingPrereqs.get(c.id) || [];
      const isEligible = prereqs.every(p => completedSet.has(p.id));

      if (isEligible) {
        unlocked.push({
          ...enrichCourse(c),
          prerequisiteCount: prereqs.length
        });
      }
    });

    return unlocked.sort((a, b) => a.level - b.level);
  },

  getAlmostEligibleCourses(completedIds = []) {
    const completedSet = new Set(completedIds);
    const almost = [];

    courses.forEach(c => {
      if (completedSet.has(c.id)) return;

      const prereqs = outgoingPrereqs.get(c.id) || [];
      const missing = prereqs.filter(p => !completedSet.has(p.id));

      if (missing.length === 1) {
        const missingCourse = courseMap.get(missing[0].id);
        almost.push({
          ...enrichCourse(c),
          missingPrerequisite: missingCourse ? { id: missingCourse.id, code: missingCourse.code, name: missingCourse.name } : null
        });
      }
    });

    return almost.sort((a, b) => a.level - b.level);
  },

  getDegrees() {
    return degrees.map(d => ({
      ...d,
      department: deptMap.get(d.departmentId)
    }));
  },

  getDegreeDetails(degreeId) {
    const deg = degreeMap.get(degreeId);
    if (!deg) return null;

    const reqs = relationships.degreeRequirements.filter(r => r.degreeId === degreeId);
    const degreeCourses = reqs.map(r => {
      const c = courseMap.get(r.courseId);
      return c ? {
        ...enrichCourse(c),
        required: r.required,
        category: r.category
      } : null;
    }).filter(Boolean);

    return {
      ...deg,
      department: deptMap.get(deg.departmentId),
      courses: degreeCourses
    };
  },

  getDegreeProgress(degreeId, completedIds = []) {
    const degDetails = this.getDegreeDetails(degreeId);
    if (!degDetails) return null;

    const completedSet = new Set(completedIds);
    let completedCredits = 0;
    let requiredCoursesCount = 0;
    let completedRequiredCount = 0;

    const progressMatrix = degDetails.courses.map(c => {
      const isCompleted = completedSet.has(c.id);
      const prereqs = outgoingPrereqs.get(c.id) || [];
      const isUnlocked = !isCompleted && prereqs.every(p => completedSet.has(p.id));
      const missingPrereqs = prereqs.filter(p => !completedSet.has(p.id));

      if (isCompleted) {
        completedCredits += c.credits || 0;
      }
      if (c.required) {
        requiredCoursesCount += 1;
        if (isCompleted) completedRequiredCount += 1;
      }

      return {
        course: c,
        category: c.category,
        required: c.required,
        status: isCompleted ? 'completed' : isUnlocked ? 'unlocked' : missingPrereqs.length === 1 ? 'almost' : 'locked',
        missingPrerequisites: missingPrereqs.map(p => {
          const pc = courseMap.get(p.id);
          return pc ? pc.code : p.id;
        })
      };
    });

    return {
      degree: degDetails,
      totalCredits: degDetails.totalCredits,
      completedCredits,
      percentComplete: Math.round((completedCredits / degDetails.totalCredits) * 100),
      courses: progressMatrix
    };
  },

  getCriticalPath(degreeId) {
    const degDetails = this.getDegreeDetails(degreeId);
    if (!degDetails) return null;

    // Find longest prerequisite chain to a capstone or 400-level course in degree
    let longestChain = [];
    const degreeCourseIds = new Set(degDetails.courses.map(c => c.id));

    function dfs(currentId, currentChain) {
      const nextChain = [...currentChain, enrichCourse(courseMap.get(currentId))];
      const unlocks = (incomingUnlocks.get(currentId) || [])
        .filter(u => degreeCourseIds.has(u.id));

      if (unlocks.length === 0) {
        if (nextChain.length > longestChain.length) {
          longestChain = nextChain;
        }
        return;
      }

      for (const u of unlocks) {
        dfs(u.id, nextChain);
      }
    }

    // Start DFS from all root courses (courses with 0 prerequisites in the degree)
    const rootCourses = degDetails.courses.filter(c => {
      const prereqs = outgoingPrereqs.get(c.id) || [];
      return prereqs.length === 0;
    });

    rootCourses.forEach(root => dfs(root.id, []));

    return {
      degreeId,
      chainLength: longestChain.length,
      criticalPath: longestChain
    };
  }
};

module.exports = mockDataService;
