import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.dashboard().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="error-banner">{error}</div>;
  if (!data) return <p style={{ color: 'var(--ink-soft)' }}>Loading your dashboard…</p>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Welcome back, {user?.name?.split(' ')[0]}</h1>
          <p>Here's how work is tracking across all of your projects.</p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Projects</div>
          <div className="stat-value">{data.totalProjects}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total tasks</div>
          <div className="stat-value">{data.totalTasks}</div>
        </div>
        <div className="stat-card accent">
          <div className="stat-label">Done</div>
          <div className="stat-value">{data.statusCounts.DONE}</div>
        </div>
        <div className="stat-card warn">
          <div className="stat-label">Overdue</div>
          <div className="stat-value">{data.overdueCount}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <div className="section-title">Assigned to you</div>
          {data.myTasks.length === 0 && (
            <p style={{ color: 'var(--ink-soft)', fontSize: 13 }}>Nothing assigned to you yet.</p>
          )}
          {data.myTasks.slice(0, 6).map((t) => {
            const overdue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE';
            return (
              <div key={t.id} className="member-row">
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{t.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{t.project.name}</div>
                </div>
                <div className={`due-date ${overdue ? 'overdue' : ''}`}>{formatDate(t.dueDate)}</div>
              </div>
            );
          })}
        </div>

        <div className="card">
          <div className="section-title">Overdue across your projects</div>
          {data.overdueTasks.length === 0 && (
            <p style={{ color: 'var(--ink-soft)', fontSize: 13 }}>Nothing overdue — nice work.</p>
          )}
          {data.overdueTasks.map((t) => (
            <div key={t.id} className="member-row">
              <div>
                <div style={{ fontWeight: 500, fontSize: 13 }}>{t.title}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                  {t.project.name} · {t.assignee?.name || 'Unassigned'}
                </div>
              </div>
              <div className="due-date overdue">{formatDate(t.dueDate)}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <Link to="/projects" className="btn btn-accent">
          View all projects →
        </Link>
      </div>
    </div>
  );
}
