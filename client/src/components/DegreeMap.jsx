import React, { useState, useEffect } from 'react';
import { GraduationCap, Award, CheckCircle2, Lock, Zap, Clock, ShieldAlert } from 'lucide-react';
import { api } from '../services/api';

export default function DegreeMap({ onCourseSelect, completedCourses = [] }) {
  const [degrees, setDegrees] = useState([]);
  const [selectedDegreeId, setSelectedDegreeId] = useState('deg-bscs');
  const [progressData, setProgressData] = useState(null);
  const [criticalPath, setCriticalPath] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadDegrees() {
      try {
        const degs = await api.getDegrees();
        setDegrees(degs);
      } catch (err) {
        console.error(err);
      }
    }
    loadDegrees();
  }, []);

  useEffect(() => {
    if (!selectedDegreeId) return;
    let isMounted = true;

    async function loadDegreeDetails() {
      setLoading(true);
      try {
        const [progress, critical] = await Promise.all([
          api.getDegreeProgress(selectedDegreeId, completedCourses),
          api.getDegreeCriticalPath(selectedDegreeId)
        ]);
        if (isMounted) {
          setProgressData(progress);
          setCriticalPath(critical);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDegreeDetails();
    return () => { isMounted = false; };
  }, [selectedDegreeId, completedCourses]);

  const deg = progressData?.degree;
  const courses = progressData?.courses || [];

  // Group courses by category
  const categories = {};
  courses.forEach(c => {
    const cat = c.category || 'General Requirement';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(c);
  });

  return (
    <div style={{ flex: 1, padding: '28px', overflowY: 'auto', background: 'var(--bg-primary)' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Degree Program Selector & Progress Card */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(16, 185, 129, 0.1))',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          borderRadius: 'var(--radius-xl)',
          padding: '24px',
          marginBottom: '28px',
          boxShadow: 'var(--shadow-md)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <GraduationCap size={20} color="#818cf8" />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>
                  Degree Map & Audit
                </span>
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#fff' }}>
                {deg?.name || 'Degree Map'}
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '640px' }}>
                {deg?.description}
              </p>
            </div>

            {/* Degree Picker */}
            <div>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                Select Degree Program
              </label>
              <select
                className="profile-select"
                value={selectedDegreeId}
                onChange={e => setSelectedDegreeId(e.target.value)}
              >
                {degrees.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.totalCredits} Credits)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Progress Bar & Key Metrics */}
          <div style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Degree Completion Progress</span>
              <strong style={{ color: '#34d399' }}>
                {progressData?.completedCredits || 0} / {progressData?.totalCredits || 120} Credits ({progressData?.percentComplete || 0}%)
              </strong>
            </div>
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{ width: `${progressData?.percentComplete || 0}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Critical Prerequisite Path Banner */}
        {criticalPath && criticalPath.criticalPath && (
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 20px',
            marginBottom: '28px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Zap size={18} color="#fbbf24" />
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#f8fafc' }}>
                Degree Critical Prerequisite Path ({criticalPath.chainLength} Hops Deep)
              </h3>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              This is the longest bottleneck prerequisite chain required to reach the senior capstone. Prioritize these courses early!
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {criticalPath.criticalPath.map((c, i) => {
                const isDone = completedCourses.includes(c.id);
                return (
                  <React.Fragment key={c.id}>
                    <span
                      onClick={() => onCourseSelect(c.id)}
                      style={{
                        padding: '6px 12px',
                        background: isDone ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-tertiary)',
                        border: `1px solid ${isDone ? 'rgba(59, 130, 246, 0.5)' : 'var(--border-subtle)'}`,
                        borderRadius: 'var(--radius-md)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: isDone ? '#60a5fa' : '#f8fafc',
                        cursor: 'pointer'
                      }}
                    >
                      {c.code} {isDone ? '✓' : ''}
                    </span>
                    {i < criticalPath.criticalPath.length - 1 && (
                      <span style={{ color: 'var(--text-muted)' }}>→</span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* Degree Course Requirement Categories */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <div className="loading-spinner" style={{ margin: '0 auto 16px' }}></div>
            <p>Loading degree curriculum breakdown...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {Object.keys(categories).map(catName => (
              <div key={catName}>
                <h3 style={{
                  fontSize: '15px',
                  fontWeight: '700',
                  color: 'var(--text-primary)',
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>{catName}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '400' }}>
                    ({categories[catName].length} courses)
                  </span>
                </h3>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '14px'
                }}>
                  {categories[catName].map(c => {
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
                          <span className={`status-badge ${isDone ? 'completed' : 'locked'}`} style={{ fontSize: '10px', padding: '2px 8px' }}>
                            {isDone ? 'Completed ✓' : c.required ? 'Required' : 'Elective'}
                          </span>
                        </div>
                        <div className="course-code">{c.code}</div>
                        <div className="course-title">{c.name}</div>
                        <div className="course-footer">
                          <span>{c.credits} Credits</span>
                          <span>Level {c.level}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
