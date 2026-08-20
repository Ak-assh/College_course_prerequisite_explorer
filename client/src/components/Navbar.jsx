import React from 'react';
import { 
  Network, 
  GitFork, 
  CheckCircle2, 
  Compass, 
  GraduationCap, 
  UserCheck 
} from 'lucide-react';

const TABS = [
  { id: 'graph', label: 'Explore Graph', icon: Network },
  { id: 'prereqs', label: 'Prerequisite Tree', icon: GitFork },
  { id: 'eligibility', label: 'Eligibility Checker', icon: CheckCircle2 },
  { id: 'planner', label: 'Learning Path Planner', icon: Compass },
  { id: 'degree', label: 'Degree Map', icon: GraduationCap }
];

const PRESETS = [
  { id: 'freshman', label: 'Freshman (Semester 1 Done)', courses: ['cs-101', 'math-101'] },
  { id: 'sophomore', label: 'Sophomore CS Major', courses: ['cs-101', 'cs-102', 'cs-201', 'math-101', 'math-102', 'math-203'] },
  { id: 'junior', label: 'Junior AI Track', courses: ['cs-101', 'cs-102', 'cs-201', 'cs-301', 'cs-302', 'cs-303', 'math-101', 'math-102', 'math-202', 'math-203', 'math-301'] },
  { id: 'clear', label: 'Clear Completed Courses', courses: [] }
];

export default function Navbar({ activeTab, setActiveTab, completedCourses, setCompletedCourses, onCourseSelect }) {
  const handlePresetChange = (e) => {
    const presetId = e.target.value;
    const preset = PRESETS.find(p => p.id === presetId);
    if (preset) {
      setCompletedCourses(preset.courses);
    }
  };

  return (
    <header className="navbar">
      {/* Brand Section */}
      <div className="brand-section">
        <div className="brand-logo">
          <GraduationCap size={22} />
        </div>
        <div>
          <h1 className="brand-title">Course Prerequisite Explorer</h1>
          <p className="brand-subtitle">Powered by CognoDB & openCypher Graph Engine</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="nav-tabs" role="tablist">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              className={`nav-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Student Profile Presets */}
      <div className="profile-selector">
        <UserCheck size={16} color="var(--text-muted)" />
        <select 
          className="profile-select"
          onChange={handlePresetChange}
          defaultValue=""
          aria-label="Load student progress preset"
        >
          <option value="" disabled>Load Student Profile...</option>
          {PRESETS.map(p => (
            <option key={p.id} value={p.id}>
              {p.label} {p.courses.length > 0 ? `(${p.courses.length} courses)` : ''}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
}
