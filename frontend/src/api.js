const BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      data.errors?.[0]?.msg || data.error || `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data;
}

export const api = {
  signup: (payload) => request('/auth/signup', { method: 'POST', body: payload, auth: false }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload, auth: false }),
  me: () => request('/auth/me'),

  listProjects: () => request('/projects'),
  createProject: (payload) => request('/projects', { method: 'POST', body: payload }),
  getProject: (id) => request(`/projects/${id}`),
  updateProject: (id, payload) => request(`/projects/${id}`, { method: 'PATCH', body: payload }),
  deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),

  addMember: (projectId, payload) =>
    request(`/projects/${projectId}/members`, { method: 'POST', body: payload }),
  updateMemberRole: (projectId, userId, role) =>
    request(`/projects/${projectId}/members/${userId}`, { method: 'PATCH', body: { role } }),
  removeMember: (projectId, userId) =>
    request(`/projects/${projectId}/members/${userId}`, { method: 'DELETE' }),

  listTasks: (projectId) => request(`/projects/${projectId}/tasks`),
  createTask: (projectId, payload) =>
    request(`/projects/${projectId}/tasks`, { method: 'POST', body: payload }),
  updateTask: (taskId, payload) => request(`/tasks/${taskId}`, { method: 'PATCH', body: payload }),
  deleteTask: (taskId) => request(`/tasks/${taskId}`, { method: 'DELETE' }),

  dashboard: () => request('/dashboard'),
};
