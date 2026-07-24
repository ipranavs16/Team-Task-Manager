import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

function formatDate(d) {
  if (!d) return 'No due date';
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [myRole, setMyRole] = useState(null);
  const [tab, setTab] = useState('tasks');
  const [error, setError] = useState('');

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', assigneeId: '', priority: 'MEDIUM', dueDate: '' });

  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberForm, setMemberForm] = useState({ email: '', role: 'MEMBER' });

  function load() {
    api
      .getProject(id)
      .then((d) => {
        setProject(d.project);
        setMyRole(d.myRole);
      })
      .catch((e) => setError(e.message));
  }

  useEffect(load, [id]);

  const isAdmin = myRole === 'ADMIN';

  async function handleCreateTask(e) {
    e.preventDefault();
    try {
      await api.createTask(id, {
        title: taskForm.title,
        description: taskForm.description || undefined,
        assigneeId: taskForm.assigneeId ? Number(taskForm.assigneeId) : undefined,
        priority: taskForm.priority,
        dueDate: taskForm.dueDate ? new Date(taskForm.dueDate).toISOString() : undefined,
      });
      setShowTaskModal(false);
      setTaskForm({ title: '', description: '', assigneeId: '', priority: 'MEDIUM', dueDate: '' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleStatusChange(taskId, status) {
    try {
      await api.updateTask(taskId, { status });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteTask(taskId) {
    if (!confirm('Delete this task?')) return;
    try {
      await api.deleteTask(taskId);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAddMember(e) {
    e.preventDefault();
    try {
      await api.addMember(id, memberForm);
      setShowMemberModal(false);
      setMemberForm({ email: '', role: 'MEMBER' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRoleChange(userId, role) {
    try {
      await api.updateMemberRole(id, userId, role);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRemoveMember(userId) {
    if (!confirm('Remove this member from the project?')) return;
    try {
      await api.removeMember(id, userId);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteProject() {
    if (!confirm('Delete this entire project? This cannot be undone.')) return;
    try {
      await api.deleteProject(id);
      navigate('/projects');
    } catch (err) {
      setError(err.message);
    }
  }

  if (!project) return error ? <div className="error-banner">{error}</div> : <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{project.name}</h1>
          <p>{project.description || 'No description'}</p>
        </div>
        {isAdmin && (
          <button className="btn btn-danger" onClick={handleDeleteProject}>
            Delete project
          </button>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="tabs">
        <div className={`tab ${tab === 'tasks' ? 'active' : ''}`} onClick={() => setTab('tasks')}>
          Tasks ({project.tasks.length})
        </div>
        <div className={`tab ${tab === 'team' ? 'active' : ''}`} onClick={() => setTab('team')}>
          Team ({project.members.length})
        </div>
      </div>

      {tab === 'tasks' && (
        <div className="card">
          <div className="section-title">
            <span>All tasks</span>
            {isAdmin && (
              <button className="btn btn-accent" onClick={() => setShowTaskModal(true)}>
                + New task
              </button>
            )}
          </div>

          {project.tasks.length === 0 && (
            <div className="empty-state">
              <h3>No tasks yet</h3>
              <p>{isAdmin ? 'Create the first task to get your team moving.' : 'Your admin hasn\'t added any tasks yet.'}</p>
            </div>
          )}

          {project.tasks.map((t) => {
            const overdue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE';
            const canEditStatus = isAdmin || t.assignee?.id === user.id;
            return (
              <div className="task-row" key={t.id}>
                <div className="task-title">
                  {t.title}
                  <small>
                    {t.assignee ? t.assignee.name : 'Unassigned'} · {t.description || 'No description'}
                  </small>
                </div>
                <span className={`priority-tag priority-${t.priority}`}>{t.priority}</span>
                <span className={`due-date ${overdue ? 'overdue' : ''}`}>{formatDate(t.dueDate)}</span>
                <select
                  className={`status-select status-${t.status}`}
                  value={t.status}
                  disabled={!canEditStatus}
                  onChange={(e) => handleStatusChange(t.id, e.target.value)}
                >
                  <option value="TODO">To do</option>
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="DONE">Done</option>
                </select>
                {isAdmin ? (
                  <button className="btn btn-ghost" onClick={() => handleDeleteTask(t.id)}>
                    Delete
                  </button>
                ) : (
                  <span />
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'team' && (
        <div className="card">
          <div className="section-title">
            <span>Team members</span>
            {isAdmin && (
              <button className="btn btn-accent" onClick={() => setShowMemberModal(true)}>
                + Add member
              </button>
            )}
          </div>
          {project.members.map((m) => (
            <div className="member-row" key={m.id}>
              <div>
                <div style={{ fontWeight: 500 }}>{m.user.name}</div>
                <div style={{ color: 'var(--ink-soft)', fontSize: 12 }}>{m.user.email}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {isAdmin ? (
                  <select
                    className="status-select"
                    value={m.role}
                    onChange={(e) => handleRoleChange(m.userId, e.target.value)}
                    disabled={m.userId === project.ownerId}
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="MEMBER">Member</option>
                  </select>
                ) : (
                  <span className={`pill ${m.role === 'ADMIN' ? 'pill-admin' : 'pill-member'}`}>{m.role}</span>
                )}
                {isAdmin && m.userId !== project.ownerId && (
                  <button className="btn btn-ghost" onClick={() => handleRemoveMember(m.userId)}>
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showTaskModal && (
        <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>New task</h2>
            <form onSubmit={handleCreateTask}>
              <div className="field">
                <label>Title</label>
                <input
                  required
                  autoFocus
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="Design the login screen"
                />
              </div>
              <div className="field">
                <label>Description</label>
                <textarea
                  rows={2}
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Assign to</label>
                <select
                  value={taskForm.assigneeId}
                  onChange={(e) => setTaskForm({ ...taskForm, assigneeId: e.target.value })}
                >
                  <option value="">Unassigned</option>
                  {project.members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.user.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Priority</label>
                <select
                  value={taskForm.priority}
                  onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
              <div className="field">
                <label>Due date</label>
                <input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowTaskModal(false)}>
                  Cancel
                </button>
                <button className="btn btn-accent">Create task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMemberModal && (
        <div className="modal-overlay" onClick={() => setShowMemberModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add a team member</h2>
            <form onSubmit={handleAddMember}>
              <div className="field">
                <label>Email address</label>
                <input
                  required
                  type="email"
                  autoFocus
                  value={memberForm.email}
                  onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                  placeholder="teammate@company.com"
                />
              </div>
              <div className="field">
                <label>Role</label>
                <select
                  value={memberForm.role}
                  onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
                >
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <p style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                The person must already have a Flowline account with this email.
              </p>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowMemberModal(false)}>
                  Cancel
                </button>
                <button className="btn btn-accent">Add member</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
