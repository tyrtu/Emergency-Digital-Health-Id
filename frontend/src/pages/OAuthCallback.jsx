import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { handleOAuthCallback } from '../store/authSlice';
import './Auth.css';

const OAuthCallback = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, role, loading, error } = useSelector((state) => state.auth);

  useEffect(() => {
    const processCallback = async () => {
      try {
        await dispatch(handleOAuthCallback()).unwrap();
      } catch (err) {
        console.error('OAuth callback error:', err);
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    };

    processCallback();
  }, [dispatch, navigate]);

  // Redirect after successful authentication
  useEffect(() => {
    if (user && role && !loading) {
      if (role === 'patient') {
        // Check if patient doc exists, if not redirect to welcome
        navigate('/dashboard');
      } else if (role === 'medic') {
        navigate('/medic-dashboard');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, role, loading, navigate]);

  return (
    <div className="login-page" style={{ textAlign: 'center' }}>
      <h2 className="login-title">Completing Sign In...</h2>
      {loading && (
        <div style={{ marginTop: '2rem' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #f3f4f6',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
          <p style={{ marginTop: '1rem', color: '#64748b' }}>Authenticating with Google...</p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
      {error && (
        <div style={{ marginTop: '2rem' }}>
          <p className="error-text">{error}</p>
          <p style={{ marginTop: '1rem', color: '#64748b' }}>Redirecting to login...</p>
        </div>
      )}
    </div>
  );
};

export default OAuthCallback;

