import React, { useEffect, useState } from 'react';
import { 
  X, 
  BookOpen, 
  User, 
  Clock, 
  Layers, 
  ArrowRight, 
  GitFork, 
  CheckCircle2, 
  Compass, 
  Tag, 
  Info 
} from 'lucide-react';
import { api } from '../services/api';

export default function CourseDetailDrawer({ 
  courseId, 
  onClose, 
  completedCourses = [], 
  onToggleComplete,
  onNavigateToPrereqs,
  onNavigateToPlanner
}) {
  const [course, setCourse] = useState(null);
  const [prereqs, setPrereqs] = useState([]);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!courseId) return;
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      try {
        const [courseRes, prereqRes, relatedRes] = await Promise.allSettled([
          api.getCourseById(courseId),
          api.getCoursePrerequisites(courseId),
          api.getCourseRelated(courseId)
        ]);

        if (isMounted) {
          if (courseRes.status === 'fulfilled' && courseRes.value) {
            setCourse(courseRes.value);
          }
          if (prereqRes.status === 'fulfilled' && prereqRes.value) {
            setPrereqs(prereqRes.value);
          }
          if (relatedRes.status === 'fulfilled' && relatedRes.value) {
            setRelated(relatedRes.value);
          }
        }
      } catch (err) {
        console.error('Failed to load course details:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, [courseId]);

  if (!courseId) return null;

  const isCompleted = completedCourses.includes(courseId);

  return (
    <div className="detail-drawer-overlay" onClick={onClose}>
      <aside className="detail-drawer" onClick={e => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="drawer-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              {course?.department && (
                <span className={`dept-pill dept-${course.department.code.toLowerCase()}`}>
                  {course.department.code}
                </span>
              )}
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {course?.level} Level • {course?.credits} Credits
              </span>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>
              {course ? `${course.code}: ${course.name}` : 'Loading...'}
            </h2>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close drawer">
            <X size={20} />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="drawer-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <div className="loading-spinner" style={{ margin: '0 auto 12px' }}></div>
              <p>Loading course information from CognoDB...</p>
            </div>
          ) : course ? (
            <>
              {/* Quick Actions */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => onToggleComplete(course.id)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid',
                    borderColor: isCompleted ? 'rgba(59, 130, 246, 0.5)' : 'var(--border-medium)',
                    background: isCompleted ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-tertiary)',
                    color: isCompleted ? '#60a5fa' : 'var(--text-primary)',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  <CheckCircle2 size={16} />
                  {isCompleted ? 'Completed ✓' : 'Mark as Completed'}
                </button>

                {onNavigateToPrereqs && (
                  <button
                    onClick={() => { onClose(); onNavigateToPrereqs(course.id); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-medium)',
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    <GitFork size={15} />
                    Prereq Tree
                  </button>
                )}
              </div>

              {/* Course Meta Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '10px',
                background: 'var(--bg-tertiary)',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                  <Clock size={15} color="var(--brand-primary)" />
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>Semester Offered</div>
                    <strong>{course.semester}</strong>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                  <User size={15} color="var(--brand-primary)" />
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>Instructor</div>
                    <strong>{course.instructor?.name || 'Faculty Staff'}</strong>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.05em' }}>
                  Course Description
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  {course.description}
                </p>
              </div>

              {/* Direct Prerequisites */}
              <div>
                <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.05em' }}>
                  Direct Prerequisites ({course.directPrerequisites?.length || 0})
                </h4>
                {course.directPrerequisites && course.directPrerequisites.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {course.directPrerequisites.map(p => {
                      const done = completedCourses.includes(p.id);
                      return (
                        <div key={p.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          background: 'var(--bg-tertiary)',
                          borderRadius: 'var(--radius-md)',
                          border: `1px solid ${done ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-subtle)'}`
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              fontFamily: 'var(--font-mono)',
                              fontWeight: '700',
                              color: done ? 'var(--status-unlocked)' : 'var(--text-primary)',
                              fontSize: '13px'
                            }}>
                              {p.code}
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{p.name}</span>
                          </div>
                          <span style={{
                            fontSize: '11px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: done ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                            color: done ? 'var(--status-unlocked)' : 'var(--text-muted)'
                          }}>
                            {done ? 'Satisfied ✓' : `Grade: ${p.minGrade || 'C'}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: 'var(--status-unlocked)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={15} /> Entry-level course with no prerequisites!
                  </p>
                )}
              </div>

              {/* Multi-Hop Ancestors (Transitive Prerequisites) */}
              {prereqs.filter(p => p.hopCount > 1).length > 0 && (
                <div>
                  <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.05em' }}>
                    Multi-Hop Dependency Chain (Hop 2+)
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {prereqs.filter(p => p.hopCount > 1).map(p => (
                      <span key={p.id} style={{
                        padding: '4px 8px',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '11px',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-secondary)'
                      }}>
                        {p.code} (Hop {p.hopCount})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Future Courses Unlocked */}
              <div>
                <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.05em' }}>
                  Future Courses Unlocked by This ({course.unlocks?.length || 0})
                </h4>
                {course.unlocks && course.unlocks.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {course.unlocks.map(u => (
                      <span key={u.id} style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        background: 'rgba(99, 102, 241, 0.1)',
                        border: '1px solid rgba(99, 102, 241, 0.25)',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '12px',
                        color: '#a5b4fc',
                        fontFamily: 'var(--font-mono)'
                      }}>
                        <ArrowRight size={12} /> {u.code}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Terminal / Capstone elective course.</p>
                )}
              </div>

              {/* Topics Covered */}
              {course.topics && course.topics.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.05em' }}>
                    Topics Covered
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {course.topics.map(t => (
                      <span key={t.id} style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '11px',
                        color: 'var(--text-secondary)'
                      }}>
                        <Tag size={11} color="var(--brand-primary)" />
                        {t.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p>Course details unavailable.</p>
          )}
        </div>
      </aside>
    </div>
  );
}
