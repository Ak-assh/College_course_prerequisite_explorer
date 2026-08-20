import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  CheckSquare, 
  Square, 
  ArrowRight, 
  Sparkles 
} from 'lucide-react';
import { api } from '../services/api';

export default function EligibilityChecker({ 
  completedCourses, 
  setCompletedCourses, 
  onCourseSelect 
}) {
  const [allCourses, setAllCourses] = useState([]);
  const [unlocked, setUnlocked] = useState([]);
  const [almost, setAlmost] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [activeDept, setActiveDept] = useState('all');

  // Load all courses for the completed courses selector
  useEffect(() => {
    async function loadCatalog() {
      try {
        const courses = await api.getAllCourses();
        setAllCourses(courses);
      } catch (err) {
        console.error(err);
      }
    }
    loadCatalog();
  }, []);

  // Recalculate eligibility whenever completedCourses changes
  useEffect(() => {
    let isMounted = true;

    async function evaluateEligibility() {
      setLoading(true);
      try {
        const [unlockedRes, almostRes] = await Promise.all([
          api.checkEligibility(completedCourses),
          api.getAlmostEligible(completedCourses)
        ]);
        if (isMounted) {
          setUnlocked(unlockedRes.unlockedCourses || []);
          setAlmost(almostRes.almostEligibleCourses || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    evaluateEligibility();
    return () => { isMounted = false; };
  }, [completedCourses]);

  const toggleCourse = (id) => {
    if (completedCourses.includes(id)) {
      setCompletedCourses(completedCourses.filter(cId => cId !== id));
    } else {
      setCompletedCourses([...completedCourses, id]);
    }
  };

  const filteredCatalog = allCourses.filter(c => {
    const matchesSearch = c.code.toLowerCase().includes(searchFilter.toLowerCase()) ||
                          c.name.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesDept = activeDept === 'all' || (c.department && c.department.id === activeDept) || c.departmentId === activeDept;
    return matchesSearch && matchesDept;
  });

  return (
    <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden' }}>
      {/* Left Checklist Sidebar: Completed Courses */}
      <div className="sidebar" style={{ width: '380px' }}>
        <div className="sidebar-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div className="sidebar-title" style={{ margin: 0 }}>Completed Courses</div>
            <span style={{ fontSize: '12px', color: '#60a5fa', fontWeight: '600' }}>
              {completedCourses.length} Selected
            </span>
          </div>

          {/* Search Box inside Checklist */}
          <div className="search-box">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Filter course checklist..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
            />
          </div>

          {/* Department Filter Tabs */}
          <div style={{ display: 'flex', gap: '4px', marginTop: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
            {['all', 'dept-cs', 'dept-math', 'dept-ds', 'dept-ee'].map(deptKey => (
              <button
                key={deptKey}
                onClick={() => setActiveDept(deptKey)}
                style={{
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  background: activeDept === deptKey ? 'var(--brand-primary)' : 'var(--bg-tertiary)',
                  color: activeDept === deptKey ? '#fff' : 'var(--text-secondary)',
                  fontSize: '11px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {deptKey === 'all' ? 'All' : deptKey.replace('dept-', '').toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Course Checklist */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {filteredCatalog.map(c => {
              const isChecked = completedCourses.includes(c.id);
              return (
                <div
                  key={c.id}
                  onClick={() => toggleCourse(c.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: isChecked ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-tertiary)',
                    border: `1px solid ${isChecked ? 'rgba(59, 130, 246, 0.4)' : 'var(--border-subtle)'}`,
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {isChecked ? (
                      <CheckSquare size={16} color="#3b82f6" />
                    ) : (
                      <Square size={16} color="var(--text-muted)" />
                    )}
                    <div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', fontSize: '12px' }}>
                        {c.code}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '6px' }}>
                        {c.name}
                      </span>
                    </div>
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{c.credits}cr</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Results Canvas: Unlocked & Almost Eligible */}
      <div style={{ flex: 1, padding: '28px', overflowY: 'auto', background: 'var(--bg-primary)' }}>
        <div style={{ maxWidth: '980px', margin: '0 auto' }}>
          {/* Header Banner */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(99, 102, 241, 0.1))',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: 'var(--radius-xl)',
            padding: '20px 24px',
            marginBottom: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={20} color="var(--status-unlocked)" />
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#f8fafc' }}>
                  Live Eligibility Engine
                </h2>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Calculated via Cypher <code>ALL(p IN prereqs WHERE p IN $completed)</code> across the graph.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '20px', textAlign: 'right' }}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--status-unlocked)' }}>
                  {unlocked.length}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Unlocked Now</div>
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--status-almost)' }}>
                  {almost.length}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>1 Course Away</div>
              </div>
            </div>
          </div>

          {/* Section 1: Unlocked Courses (Ready to Enroll) */}
          <div style={{ marginBottom: '36px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <CheckCircle2 size={18} color="var(--status-unlocked)" />
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#f8fafc' }}>
                Ready to Enroll ({unlocked.length} Courses)
              </h3>
            </div>

            {unlocked.length === 0 ? (
              <div style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                padding: '24px',
                borderRadius: 'var(--radius-lg)',
                color: 'var(--text-muted)',
                textAlign: 'center'
              }}>
                Select introductory courses (like CS 101 or MATH 101) on the left to start unlocking advanced courses!
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '16px'
              }}>
                {unlocked.map(c => (
                  <div
                    key={c.id}
                    className="course-card"
                    onClick={() => onCourseSelect(c.id)}
                    style={{ '--card-accent': 'var(--status-unlocked)' }}
                  >
                    <div className="course-card-header">
                      {c.department && (
                        <span className={`dept-pill dept-${c.department.code.toLowerCase()}`}>
                          {c.department.code}
                        </span>
                      )}
                      <span className="status-badge unlocked">Ready ✓</span>
                    </div>
                    <div className="course-code">{c.code}</div>
                    <div className="course-title">{c.name}</div>
                    <div className="course-description">{c.description}</div>
                    <div className="course-footer">
                      <span>{c.credits} Credits • {c.semester}</span>
                      <span>Level {c.level}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: 1 Course Away (Almost Eligible) */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <AlertCircle size={18} color="var(--status-almost)" />
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#f8fafc' }}>
                Fast Track Advisory: 1 Course Away ({almost.length} Courses)
              </h3>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px'
            }}>
              {almost.map(c => (
                <div
                  key={c.id}
                  className="course-card"
                  onClick={() => onCourseSelect(c.id)}
                  style={{ '--card-accent': 'var(--status-almost)' }}
                >
                  <div className="course-card-header">
                    {c.department && (
                      <span className={`dept-pill dept-${c.department.code.toLowerCase()}`}>
                        {c.department.code}
                      </span>
                    )}
                    <span className="status-badge almost">Missing 1 Prereq</span>
                  </div>
                  <div className="course-code">{c.code}</div>
                  <div className="course-title">{c.name}</div>
                  
                  {/* Blocker alert callout */}
                  {c.missingPrerequisite && (
                    <div style={{
                      margin: '10px 0',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(245, 158, 11, 0.25)',
                      fontSize: '11px',
                      color: '#fcd34d',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <span>Complete <strong>{c.missingPrerequisite.code}</strong> first to unlock</span>
                    </div>
                  )}

                  <div className="course-footer">
                    <span>{c.credits} Credits</span>
                    <span>Level {c.level}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
