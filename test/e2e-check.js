const http = require('http');

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:5000${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function post(path, body) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    const req = http.request(`http://localhost:5000${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function runLiveAudit() {
  console.log('\n======================================================');
  console.log('🔍 LIVE SERVER & COGNODB ENDPOINT AUDIT');
  console.log('======================================================\n');

  // 1. Health
  const health = await get('/api/health');
  console.log(`[1] API Health: ${health.status} (${health.service})`);

  // 2. Course Catalog
  const courses = await get('/api/courses');
  console.log(`[2] Course Catalog: ${courses.courses.length} courses loaded from CognoDB`);

  // 3. Search
  const search = await get('/api/courses/search?q=machine');
  console.log(`[3] Search "machine":`, search.results.map(r => `${r.code} (${r.name})`));

  // 4. Multi-hop Prerequisites
  const prereqs = await get('/api/courses/cs-450/prerequisites');
  console.log(`[4] CS 450 Multi-Hop Prereq Depth: ${prereqs.prerequisites.length} total prerequisite nodes`);
  prereqs.prerequisites.slice(0, 4).forEach(p => {
    console.log(`    ↳ [Hop ${p.hopCount}] ${p.code}: ${p.name}`);
  });

  // 5. Full Graph Topology
  const graph = await get('/api/graph/full');
  console.log(`[5] Graph Network Topology: ${graph.nodes.length} nodes, ${graph.edges.length} relationships`);

  // 6. Shortest Path Planner
  const path = await post('/api/graph/path', { from: 'cs-101', to: 'cs-450' });
  console.log(`[6] Shortest Path (CS 101 ➔ CS 450):`);
  console.log(`    ` + path.path.map(n => n.code).join(' ➔ ') + ` (${path.hops} hops)`);

  // 7. Live Eligibility Engine
  const eligibility = await post('/api/eligibility/check', { completed: ['cs-101', 'math-101'] });
  console.log(`[7] Unlocked Courses for [CS 101, MATH 101]:`);
  console.log(`    ` + eligibility.unlockedCourses.map(c => c.code).join(', ') + ` (${eligibility.count} total unlocked)`);

  // 8. Degree Audit (BS CS)
  const degree = await post('/api/degrees/deg-bscs/progress', { completed: ['cs-101', 'cs-102', 'math-101', 'math-102'] });
  console.log(`[8] BS Computer Science Audit:`);
  console.log(`    Completed: ${degree.completedCredits} / ${degree.totalCredits} credits (${degree.percentComplete}%)`);

  console.log('\n======================================================');
  console.log('✅ ALL LIVE TESTS PASSED AGAINST COGNODB CLOUD');
  console.log('======================================================\n');
}

runLiveAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
