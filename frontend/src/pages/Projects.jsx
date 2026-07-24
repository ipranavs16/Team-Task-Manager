import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function Projects() {
  const [projects, setProjects] = useState(null);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  function load() {
    api.listProjects().then((d) => setProjects(d.projects)).catch((e) => setError(e.message));
  }

  useEffect(load, []);

  async function handleCreate(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createProject(form);
      setShowModal(false);
      setForm({ name: '', description: '' });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Projects</h1>
          <p>Every project you own or have been added to.</p>
        </div>
        <button className="btn btn-accent" onClick={() => setShowModal(true)}>
          + New project
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {projects && projects.length === 0 && (
        <div className="empty-state card">
          <h3>No projects yet</h3>
          <p>Create your first project to start assigning tasks to your team.</p>
        </div>
      )}

      <div className="project-grid">
        {projects?.map((p) => (
          <Link to={`/projects/${p.id}`} key={p.id} className="project-card">
            <span className={`pill ${p.myRole === 'ADMIN' ? 'pill-admin' : 'pill-member'}`}>
              {p.myRole}
            </span>
            <h3 style={{ marginTop: 10 }}>{p.name}</h3>
            <p>{p.description || 'No description'}</p>
            <div className="project-meta">
              <span>{p._count.tasks} tasks</span>
              <span>{p._count.members} members</span>
            </div>
          </Link>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create a project</h2>
            <form onSubmit={handleCreate}>
              <div className="field">
                <label>Project name</label>
                <input
                  required
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Website redesign"
                />
              </div>
              <div className="field">
                <label>Description (optional)</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What is this project about?"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button className="btn btn-accent" disabled={submitting}>
                  {submitting ? 'Creating…' : 'Create project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
