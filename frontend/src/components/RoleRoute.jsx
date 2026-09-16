import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const RoleRoute = ({ allowedRoles }) => {
  const { role, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return <div>Loading permissions...</div>;
  }

  // Check if user's role is in the allowed array
  if (!allowedRoles.includes(role)) {
    // If not allowed, redirect to a safe page (or show an unauthorized message)
    return <Navigate to="/enquiries" replace />;
  }

  return <Outlet />;
};

export default RoleRoute;
