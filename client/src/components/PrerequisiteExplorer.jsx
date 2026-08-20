import React, { useState, useEffect } from 'react';
import { Search, GitFork, ArrowDown, CheckCircle2, Clock, BookOpen, Layers } from 'lucide-react';
import { api } from '../services/api';

export default function PrerequisiteExplorer({ onCourseSelect, completedCourses = [], initialCourseId = 'cs-401' }) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId);
  const [course, setCourse] = useState(null);
  const [prereqs, setPrereqs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.searchCourses(query);
        setSearchResults(res);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  // Load target course and multi-hop prerequisites
  useEffect(() => {
    if (!selectedCourseId) return;
    let isMounted = true;

    async function loadTree() {
      setLoading(true);
      try {
        const [c, p] = await Promise.all([
          api.getCourseById(selectedCourseId),
          api.getCoursePrerequisites(selectedCourseId)
        ]);
        if (isMounted) {
          setCourse(c);
          setPrereqs(p);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadTree();
    return () => { isMounted = false; };
  }, [selectedCourseId]);

  // Group prerequisites by hop depth
  const hopsMap = {};
  prereqs.forEach(p => {
    const hop = p.hopCount || 1;
    if (!hopsMap[hop]) hopsMap[hop] = [];
    hopsMap[hop].push(p);
  });
  const maxHop = Math.max(...Object.keys(hopsMap).map(Number), 0);

  const totalPrereqCredits = prereqs.reduce((acc, p) => acc + (p.credits || 0), 0);
  const satisfiedCredits = prereqs
    .filter(p => completedCourses.includes(p.id))
    .reduce((acc, p) => acc + (p.credits || 0), 0);

  return (
    <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden' }}>
      {/* Left Search & Selection Sidebar */}
      <div className="sidebar" style={{ width: '340px' }}>
        <div className="sidebar-section">
          <div className="sidebar-title">Select Target Course</div>
          <div className="search-box">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search by code (e.g. CS 401) or title..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>

          {/* Autocomplete Dropdown */}
          {searchResults.length > 0 && (
            <div className="search-dropdown">
              {searchResults.map(res => (
                <div
                  key={res.id}
                  className="search-item"
                  onClick={() => {
                    setSelectedCourseId(res.id);
                    setQuery('');
                    setSearchResults([]);
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '13px', fontFamily: 'var(--font-mono)' }}>
                      {res.code}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{res.name}</div>
                  </div>
                  {res.department && (
                    <span className={`dept-pill dept-${res.department.code.toLowerCase()}`}>
                      {res.department.code}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Picks for Deep Chains */}
        <div className="sidebar-section" style={{ flex: 1 }}>
          <div className="sidebar-title">Deep Dependency Showcase</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { id: 'cs-450', code: 'CS 450', name: 'Deep Learning & Neural Networks', depth: '4 Hops' },
              { id: 'cs-401', code: 'CS 401', name: 'Machine Learning', depth: '3 Hops' },
              { id: 'cs-403', code: 'CS 403', name: 'Distributed Systems', depth: '3 Hops' },
              { id: 'cs-499', code: 'CS 499', name: 'Senior Capstone Design', depth: '3 Hops' },
              { id: 'ds-499', code: 'DS 499', name: 'Data Science Capstone', depth: '4 Hops' }
            ].map(item => (
              <div
                key={item.id}
                onClick={() => setSelectedCourseId(item.id)}
                style={{
                  padding: '10px 12px',
                  background: selectedCourseId === item.id ? 'var(--brand-primary)' : 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  border: '1px solid var(--border-subtle)',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', fontSize: '13px' }}>
                    {item.code}
                  </span>
                  <span style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: selectedCourseId === item.id ? 'rgba(255,255,255,0.2)' : 'rgba(99, 102, 241, 0.15)',
                    color: selectedCourseId === item.id ? '#fff' : '#a5b4fc',
                    fontWeight: '600'
                  }}>
                    {item.depth}
                  </span>
                </div>
                <div style={{
                  fontSize: '11px',
                  color: selectedCourseId === item.id ? 'rgba(255,255,255,0.85)' : 'var(--text-muted)',
                  marginTop: '2px'
                }}>
                  {item.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Prerequisite Hierarchy Canvas */}
      <div style={{ flex: 1, padding: '28px', overflowY: 'auto', background: 'var(--bg-primary)' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
            <div className="loading-spinner" style={{ margin: '0 auto 16px' }}></div>
            <p>Traversing multi-hop prerequisite graph in CognoDB...</p>
          </div>
        ) : course ? (
          <div style={{ maxWidth: '880px', margin: '0 auto' }}>
            {/* Header Card for Target Course */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.1))',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: 'var(--radius-xl)',
              padding: '24px',
              marginBottom: '28px',
              boxShadow: 'var(--shadow-md)',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span className="dept-pill dept-cs">Target Goal</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {course.credits} Credits • Level {course.level}
                    </span>
                  </div>
                  <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#fff' }}>
                    {course.code}: {course.name}
                  </h2>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px', maxWidth: '640px' }}>
                    {course.description}
                  </p>
                </div>
                <button
                  onClick={() => onCourseSelect(course.id)}
                  style={{
                    padding: '8px 16px',
                    background: 'var(--brand-primary)',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    color: '#fff',
                    fontWeight: '600',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Course Details
                </button>
              </div>

              {/* Summary Stats */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px',
                marginTop: '20px',
                paddingTop: '16px',
                borderTop: '1px solid rgba(255,255,255,0.1)'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Chain Depth</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#818cf8' }}>
                    {maxHop} {maxHop === 1 ? 'Hop' : 'Hops'} Deep
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Prereq Courses</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#f8fafc' }}>
                    {prereqs.length} Courses
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Prereq Progress</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#34d399' }}>
                    {satisfiedCredits} / {totalPrereqCredits} Credits ({totalPrereqCredits > 0 ? Math.round((satisfiedCredits / totalPrereqCredits) * 100) : 100}%)
                  </div>
                </div>
              </div>
            </div>

            {/* Hop Breakdown Levels */}
            {maxHop === 0 ? (
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '24px',
                borderRadius: 'var(--radius-lg)',
                textAlign: 'center',
                color: 'var(--status-unlocked)'
              }}>
                <CheckCircle2 size={32} style={{ margin: '0 auto 12px' }} />
                <h3 style={{ fontSize: '16px', fontWeight: '700' }}>No Prerequisites Required</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  This is an open introductory course. Any student can enroll immediately!
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {Object.keys(hopsMap).sort((a, b) => Number(a) - Number(b)).map(hopStr => {
                  const hopNum = Number(hopStr);
                  const coursesInHop = hopsMap[hopNum];

                  return (
                    <div key={hopNum} style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '20px'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '16px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: 'var(--radius-full)',
                            background: hopNum === 1 ? 'var(--brand-primary)' : 'var(--bg-tertiary)',
                            color: '#fff',
                            fontSize: '12px',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {hopNum}
                          </span>
                          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                            {hopNum === 1 ? 'Direct Prerequisites (1 Hop Away)' : `Transitive Dependencies (${hopNum} Hops Deep)`}
                          </h3>
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {coursesInHop.length} {coursesInHop.length === 1 ? 'course' : 'courses'}
                        </span>
                      </div>

                      {/* Course Grid for this Hop */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                        gap: '12px'
                      }}>
                        {coursesInHop.map(c => {
                          const isDone = completedCourses.includes(c.id);
                          return (
                            <div
                              key={c.id}
                              className="course-card"
                              onClick={() => onCourseSelect(c.id)}
                              style={{
                                borderColor: isDone ? 'rgba(59, 130, 246, 0.4)' : 'var(--border-subtle)',
                                background: isDone ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-tertiary)'
                              }}
                            >
                              <div className="course-card-header">
                                {c.department && (
                                  <span className={`dept-pill dept-${c.department.code.toLowerCase()}`}>
                                    {c.department.code}
                                  </span>
                                )}
                                <span className="course-code">{c.code}</span>
                              </div>
                              <div className="course-title">{c.name}</div>
                              <div className="course-footer">
                                <span>{c.credits} Credits</span>
                                <span style={{
                                  color: isDone ? '#60a5fa' : 'var(--text-muted)',
                                  fontWeight: '600'
                                }}>
                                  {isDone ? 'Completed ✓' : `Level ${c.level}`}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
