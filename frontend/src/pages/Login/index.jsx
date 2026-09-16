import React, { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api/axios';
import { useForm } from 'react-hook-form';
import './Login.css';

const Login = () => {
  const { login, isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm();

  // Redirect to enquiries if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/enquiries', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const onSubmit = async (data) => {
    try {
      // Clear any previous root error
      setError('root', { message: '' });
      
      const response = await api.post('/auth/login', data);
      
      // Based on our actual backend implementation
      const { token, user } = response.data;
      
      if (token && user) {
        login(user, token);
        navigate('/enquiries');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      let errorMessage = 'Server unavailable. Please try again later.';
      
      if (err.response && err.response.data && err.response.data.message) {
        // Safe display of backend message
        errorMessage = err.response.data.message;
      }
      
      setError('root', {
        message: errorMessage
      });
    }
  };

  if (isAuthenticated) {
    return null; // Avoid rendering login form while redirecting
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>AquaFlow ERP</h2>
        <p>Sign in to your account</p>
        
        {/* Development Demo Hints */}
        <div className="demo-hints">
          <strong>Demo Accounts:</strong><br/>
          Admin: <code>admin@aquaflow.com</code><br/>
          Sales: <code>sales@aquaflow.com</code><br/>
          <em>(Password is the same as seeded)</em>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="form-group">
            <label>Email</label>
            <input 
              type="email" 
              {...register('email', { 
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email format'
                }
              })} 
              placeholder="name@aquaflow.com" 
              disabled={isSubmitting}
            />
            {errors.email && <span className="error">{errors.email.message}</span>}
          </div>
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              {...register('password', { required: 'Password is required' })} 
              placeholder="••••••••" 
              disabled={isSubmitting}
            />
            {errors.password && <span className="error">{errors.password.message}</span>}
          </div>
          {errors.root && errors.root.message && <div className="error global-error">{errors.root.message}</div>}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
