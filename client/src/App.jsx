import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import GraphCanvas from './components/GraphCanvas';
import CourseDetailDrawer from './components/CourseDetailDrawer';
import PrerequisiteExplorer from './components/PrerequisiteExplorer';
import EligibilityChecker from './components/EligibilityChecker';
import LearningPathPlanner from './components/LearningPathPlanner';
import DegreeMap from './components/DegreeMap';
import ErrorBanner from './components/ErrorBanner';
import { api } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('graph');
  const [completedCourses, setCompletedCourses] = useState(['cs-101', 'math-101']);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [filterDept, setFilterDept] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);

  // Load departments for the graph filter sidebar
  useEffect(() => {
    async function loadDepts() {
      try {
        const res = await api.getAllCourses();
        const deptMap = {};
        res.forEach(c => {
          if (c.department && !deptMap[c.department.id]) {
            deptMap[c.department.id] = c.department;
          }
        });
        setDepartments(Object.values(deptMap));
      } catch (err) {
        console.error('Initial load notice:', err.message);
      }
    }
    loadDepts();
  }, []);

  const handleToggleComplete = (courseId) => {
    if (completedCourses.includes(courseId)) {
      setCompletedCourses(completedCourses.filter(id => id !== courseId));
    } else {
      setCompletedCourses([...completedCourses, courseId]);
    }
  };

  const navigateToPrereqs = (courseId) => {
    setSelectedCourseId(null);
    setActiveTab('prereqs');
  };

  return (
    <div className="app-container">
      {/* Top Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        completedCourses={completedCourses}
        setCompletedCourses={setCompletedCourses}
        onCourseSelect={setSelectedCourseId}
      />

      {/* Global Error Banner */}
      {errorMessage && (
        <ErrorBanner
          message={errorMessage}
          onRetry={() => setErrorMessage(null)}
        />
      )}

      {/* Main View Area */}
      <main className="main-content">
        {/* VIEW 1: Full Graph Canvas */}
        {activeTab === 'graph' && (
          <div style={{ display: 'flex', width: '100%', height: '100%' }}>
            {/* Left Department Filter & Quick Stats Sidebar */}
            <div className="sidebar" style={{ width: '260px' }}>
              <div className="sidebar-section">
                <div className="sidebar-title">Department Filters</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <button
                    onClick={() => setFilterDept(null)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid',
                      borderColor: filterDept === null ? 'var(--brand-primary)' : 'var(--border-subtle)',
                      background: filterDept === null ? 'var(--brand-primary)' : 'var(--bg-tertiary)',
                      color: filterDept === null ? '#fff' : 'var(--text-secondary)',
                      fontSize: '12px',
                      fontWeight: '600',
                      textAlign: 'left',
                      cursor: 'pointer'
                    }}
                  >
                    🌐 All University Departments
                  </button>

                  {departments.map(d => (
                    <button
                      key={d.id}
                      onClick={() => setFilterDept(d.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid',
                        borderColor: filterDept === d.id ? d.color : 'var(--border-subtle)',
                        background: filterDept === d.id ? 'rgba(255,255,255,0.08)' : 'var(--bg-tertiary)',
                        color: filterDept === d.id ? '#fff' : 'var(--text-secondary)',
                        fontSize: '12px',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: d.color
                        }}></span>
                        <span>{d.name}</span>
                      </div>
                      <span className={`dept-pill dept-${d.code.toLowerCase()}`}>{d.code}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tips Section */}
              <div className="sidebar-section" style={{ marginTop: 'auto', fontSize: '11px', color: 'var(--text-muted)' }}>
                <p style={{ marginBottom: '6px' }}>
                  💡 <strong>Tip:</strong> Click any course node to open its full prerequisite dependency drawer.
                </p>
                <p>
                  Node sizes scale with credit weight. Arrows point from prerequisites to future unlock targets.
                </p>
              </div>
            </div>

            {/* Canvas */}
            <GraphCanvas
              onCourseSelect={setSelectedCourseId}
              completedCourses={completedCourses}
              filterDept={filterDept}
            />
          </div>
        )}

        {/* VIEW 2: Prerequisite Tree */}
        {activeTab === 'prereqs' && (
          <PrerequisiteExplorer
            onCourseSelect={setSelectedCourseId}
            completedCourses={completedCourses}
          />
        )}

        {/* VIEW 3: Eligibility Checker */}
        {activeTab === 'eligibility' && (
          <EligibilityChecker
            completedCourses={completedCourses}
            setCompletedCourses={setCompletedCourses}
            onCourseSelect={setSelectedCourseId}
          />
        )}

        {/* VIEW 4: Learning Path Planner */}
        {activeTab === 'planner' && (
          <LearningPathPlanner
            onCourseSelect={setSelectedCourseId}
            completedCourses={completedCourses}
          />
        )}

        {/* VIEW 5: Degree Map */}
        {activeTab === 'degree' && (
          <DegreeMap
            onCourseSelect={setSelectedCourseId}
            completedCourses={completedCourses}
          />
        )}
      </main>

      {/* Slide-over Course Detail Drawer */}
      <CourseDetailDrawer
        courseId={selectedCourseId}
        onClose={() => setSelectedCourseId(null)}
        completedCourses={completedCourses}
        onToggleComplete={handleToggleComplete}
        onNavigateToPrereqs={navigateToPrereqs}
      />
    </div>
  );
}
