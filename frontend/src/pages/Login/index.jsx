import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api/axios';
import { useForm } from 'react-hook-form';
import './Login.css';

const Login = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async (data) => {
    try {
      // Assuming your backend login returns { token, user: { id, email, role, etc. } }
      const response = await api.post('/auth/login', data);
      const { token, user } = response.data;
      
      login(user, token);
      navigate('/enquiries');
    } catch (err) {
      setError('root', {
        message: err.response?.data?.message || 'Login failed. Please check your credentials.'
      });
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>AquaFlow ERP</h2>
        <p>Sign in to your account</p>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label>Email</label>
            <input 
              type="email" 
              {...register('email', { required: 'Email is required' })} 
              placeholder="admin@aquaflow.com" 
            />
            {errors.email && <span className="error">{errors.email.message}</span>}
          </div>
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              {...register('password', { required: 'Password is required' })} 
              placeholder="••••••••" 
            />
            {errors.password && <span className="error">{errors.password.message}</span>}
          </div>
          {errors.root && <div className="error global-error">{errors.root.message}</div>}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
