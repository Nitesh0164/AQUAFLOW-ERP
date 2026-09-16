import React, { useContext } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './MainLayout.css';

const MainLayout = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>AquaFlow ERP</h2>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/enquiries" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            Enquiries
          </NavLink>
          <NavLink to="/quotations" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            Quotations
          </NavLink>
          <NavLink to="/sales-orders" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            Sales Orders
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <span className="user-name">{user?.name || 'User'}</span>
            <span className="user-role">{user?.role}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
