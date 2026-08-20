/**
 * Centralized API Client Service
 * Handles HTTP requests to the backend with error trapping.
 */

const envApiUrl = import.meta.env.VITE_API_URL || '';
const API_BASE = envApiUrl ? `${envApiUrl.replace(/\/$/, '')}/api` : '/api';

async function fetchJSON(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!res.ok) {
      let errorData = {};
      try {
        errorData = await res.json();
      } catch (e) {
        errorData = { error: res.statusText };
      }
      const error = new Error(errorData.error || `HTTP ${res.status} Error`);
      error.status = res.status;
      error.code = errorData.code || 'API_ERROR';
      throw error;
    }

    return await res.json();
  } catch (err) {
    console.error(`[API Error] ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  // Course Endpoints
  async getAllCourses(filters = {}) {
    const params = new URLSearchParams();
    if (filters.department) params.append('department', filters.department);
    if (filters.level) params.append('level', filters.level);
    if (filters.semester && filters.semester !== 'All') params.append('semester', filters.semester);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const data = await fetchJSON(`/courses${qs}`);
    return data.courses || [];
  },

  async searchCourses(query = '') {
    const data = await fetchJSON(`/courses/search?q=${encodeURIComponent(query)}`);
    return data.results || [];
  },

  async getCourseById(id) {
    return await fetchJSON(`/courses/${id}`);
  },

  async getCoursePrerequisites(id) {
    const data = await fetchJSON(`/courses/${id}/prerequisites`);
    return data.prerequisites || [];
  },

  async getCourseRelated(id) {
    const data = await fetchJSON(`/courses/${id}/related`);
    return data.related || [];
  },

  // Graph Endpoints
  async getFullGraph() {
    return await fetchJSON('/graph/full');
  },

  async getDepartmentGraph(deptId) {
    return await fetchJSON(`/graph/department/${deptId}`);
  },

  async getShortestPath(fromId, toId) {
    return await fetchJSON('/graph/path', {
      method: 'POST',
      body: JSON.stringify({ from: fromId, to: toId })
    });
  },

  // Eligibility Endpoints
  async checkEligibility(completedIds = []) {
    return await fetchJSON('/eligibility/check', {
      method: 'POST',
      body: JSON.stringify({ completed: completedIds })
    });
  },

  async getAlmostEligible(completedIds = []) {
    return await fetchJSON('/eligibility/next', {
      method: 'POST',
      body: JSON.stringify({ completed: completedIds })
    });
  },

  // Degree Endpoints
  async getDegrees() {
    const data = await fetchJSON('/degrees');
    return data.degrees || [];
  },

  async getDegreeDetails(degreeId) {
    return await fetchJSON(`/degrees/${degreeId}`);
  },

  async getDegreeProgress(degreeId, completedIds = []) {
    return await fetchJSON(`/degrees/${degreeId}/progress`, {
      method: 'POST',
      body: JSON.stringify({ completed: completedIds })
    });
  },

  async getDegreeCriticalPath(degreeId) {
    return await fetchJSON(`/degrees/${degreeId}/critical-path`);
  }
};
