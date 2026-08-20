import React, { useState, useEffect } from 'react';
import { Compass, ArrowRight, CheckCircle2, Flag, Sparkles, BookOpen } from 'lucide-react';
import { api } from '../services/api';

export default function LearningPathPlanner({ onCourseSelect, completedCourses = [] }) {
  const [allCourses, setAllCourses] = useState([]);
  const [fromCourseId, setFromCourseId] = useState('cs-101');
  const [toCourseId, setToCourseId] = useState('cs-450');
  const [pathResult, setPathResult] = useState(null);
  const [loading, setLoading] = useState(false);

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

  const calculatePath = async () => {
    if (!fromCourseId || !toCourseId) return;
    setLoading(true);
    try {
      const res = await api.getShortestPath(fromCourseId, toCourseId);
      setPathResult(res);
    } catch (err) {
      console.error(err);
      setPathResult({ path: [], hops: 0, message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (fromCourseId && toCourseId) {
      calculatePath();
    }
  }, [fromCourseId, toCourseId]);

  const path = pathResult?.path || [];
  const totalCredits = path.reduce((acc, c) => acc + (c.credits || 0), 0);
  const completedInPath = path.filter(c => completedCourses.includes(c.id)).length;

  return (
    <div style={{ flex: 1, padding: '28px', overflowY: 'auto', background: 'var(--bg-primary)' }}>
      <div style={{ maxWidth: '840px', margin: '0 auto' }}>
        {/* Header Hero */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.1))',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          borderRadius: 'var(--radius-xl)',
          padding: '24px',
          marginBottom: '28px',
          boxShadow: 'var(--shadow-md)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Compass size={24} color="#818cf8" />
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#fff' }}>
              Optimal Learning Path Planner
            </h2>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '600px' }}>
            Find the minimum required sequence of courses between any two milestones using CognoDB's native <code>shortestPath()</code> graph traversal.
          </p>

          {/* Selectors */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            gap: '12px',
            alignItems: 'center',
            marginTop: '20px',
            background: 'var(--bg-secondary)',
            padding: '16px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                Starting Milestone
              </label>
              <select
                className="profile-select"
                style={{ width: '100%' }}
                value={fromCourseId}
                onChange={e => setFromCourseId(e.target.value)}
              >
                {allCourses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.code}: {c.name} ({c.credits} cr)
                  </option>
                ))}
              </select>
            </div>

            <div style={{ color: '#818cf8', marginTop: '16px' }}>
              <ArrowRight size={22} />
            </div>

            <div>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                Target Goal
              </label>
              <select
                className="profile-select"
                style={{ width: '100%' }}
                value={toCourseId}
                onChange={e => setToCourseId(e.target.value)}
              >
                {allCourses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.code}: {c.name} ({c.credits} cr)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Path Results */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <div className="loading-spinner" style={{ margin: '0 auto 16px' }}></div>
            <p>Computing graph shortestPath traversal...</p>
          </div>
        ) : path.length > 0 ? (
          <div>
            {/* Quick Summary Strip */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '14px 20px',
              marginBottom: '24px'
            }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Steps: </span>
                <strong style={{ color: '#f8fafc' }}>{path.length} Courses ({pathResult.hops} Prereq Hops)</strong>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Credits: </span>
                <strong style={{ color: '#818cf8' }}>{totalCredits} Credits</strong>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Progress: </span>
                <strong style={{ color: '#34d399' }}>{completedInPath} of {path.length} Done</strong>
              </div>
            </div>

            {/* Step by step flow */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {path.map((c, index) => {
                const isDone = completedCourses.includes(c.id);
                const isStart = index === 0;
                const isTarget = index === path.length - 1;

                return (
                  <div
                    key={c.id}
                    className="flow-step-card"
                    onClick={() => onCourseSelect(c.id)}
                    style={{
                      cursor: 'pointer',
                      borderColor: isTarget ? '#a855f7' : isDone ? '#3b82f6' : 'var(--border-subtle)',
                      background: isTarget ? 'rgba(168, 85, 247, 0.08)' : isDone ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-card)'
                    }}
                  >
                    <div className="flow-step-number" style={{
                      background: isTarget ? '#a855f7' : isDone ? '#3b82f6' : 'var(--brand-primary)'
                    }}>
                      {index + 1}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', fontSize: '15px' }}>
                            {c.code}
                          </span>
                          {isStart && <span className="status-badge unlocked" style={{ fontSize: '10px', padding: '2px 6px' }}>Origin</span>}
                          {isTarget && <span className="status-badge" style={{ fontSize: '10px', padding: '2px 6px', background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc' }}>Goal 🎯</span>}
                        </div>
                        <span style={{
                          fontSize: '11px',
                          color: isDone ? '#60a5fa' : 'var(--text-muted)',
                          fontWeight: '600'
                        }}>
                          {isDone ? 'Completed ✓' : `${c.credits} Credits • ${c.semester}`}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {c.name}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            padding: '36px',
            borderRadius: 'var(--radius-lg)',
            textAlign: 'center',
            color: 'var(--text-muted)'
          }}>
            <p>{pathResult?.message || 'No direct prerequisite path found between the selected starting course and goal course.'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
