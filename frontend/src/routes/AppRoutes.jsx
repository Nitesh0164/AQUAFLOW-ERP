import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/Login';
import Enquiries from '../pages/Enquiries';
import Quotations from '../pages/Quotations';
import SalesOrders from '../pages/SalesOrders';
import MainLayout from '../layouts/MainLayout';
import ProtectedRoute from '../components/ProtectedRoute';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" element={<Login />} />

      {/* Protected Routes Wrapper */}
      <Route element={<ProtectedRoute />}>
        {/* Main Layout Wrapper for Sidebar */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Navigate to="/enquiries" replace />} />
          <Route path="/enquiries" element={<Enquiries />} />
          <Route path="/quotations" element={<Quotations />} />
          <Route path="/sales-orders" element={<SalesOrders />} />
        </Route>
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/enquiries" replace />} />
    </Routes>
  );
};

export default AppRoutes;
