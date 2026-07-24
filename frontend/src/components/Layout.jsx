import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import BrandMark from './BrandMark';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <BrandMark dark />
        <nav className="nav-links">
          <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Dashboard
          </NavLink>
          <NavLink to="/projects" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Projects
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="avatar">{initials}</div>
            <div>
              <div style={{ color: '#fff', fontWeight: 500 }}>{user?.name}</div>
              <div style={{ color: 'rgba(238,240,244,0.55)', fontSize: 12 }}>{user?.email}</div>
            </div>
          </div>
          <button className="btn btn-ghost" style={{ width: '100%', color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }} onClick={handleLogout}>
            Log out
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
