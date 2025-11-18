// src/pages/Login.jsx
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loginUser, signInWithGoogle, clearError, clearMessage } from "../store/authSlice";
import { useNavigate, useLocation } from "react-router-dom";
import { Warning, CheckCircle, Info } from '@mui/icons-material';
import './Auth.css';

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { loading, error, isAuthenticated, user, role, message } = useSelector(
    (state) => state.auth
  );

  // Check for email confirmation success message from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.get('message') === 'email_confirmed_success') {
      // This will be handled by the message display
    }
  }, [location]);

  // Clear messages when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearError());
      dispatch(clearMessage());
    };
  }, [dispatch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(loginUser({ email, password }));
  };

  const handleGoogleSignIn = (e) => {
    e.preventDefault();
    dispatch(signInWithGoogle());
  };

  // ✅ Redirect after login based on role
  useEffect(() => {
    if (isAuthenticated && role) {
      if (role === "patient") {
        navigate("/dashboard");
      } else if (role === "medic") {
        navigate("/medic-dashboard");
      } else {
        navigate("/"); // fallback
      }
    }
  }, [isAuthenticated, role, navigate]);

  return (
    <div className="login-page">
      <h2 className="login-title">Login</h2>

      <form className="login-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      {/* Divider */}
      <div className="divider">
        <span>or</span>
      </div>

      {/* Google Sign In Button */}
      <button 
        type="button" 
        className="google-btn" 
        onClick={handleGoogleSignIn}
        disabled={loading}
      >
        <svg className="google-icon" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </button>

      {/* Email Confirmation Success Message */}
      {location.search.includes('email_confirmed_success') && (
        <div className="success-message">
          <CheckCircle style={{ fontSize: '20px', marginRight: '10px', verticalAlign: 'middle' }} />
          <div>
            <strong>Email Confirmed!</strong>
            <p>Your email has been successfully verified. You can now log in.</p>
          </div>
        </div>
      )}

      {/* Error Messages */}
      {error && (
        <div className="error-message">
          <Warning style={{ fontSize: '20px', marginRight: '10px', verticalAlign: 'middle' }} />
          <div>
            <strong>Login Failed</strong>
            <p>{error}</p>
            {error.includes('Email not confirmed') && (
              <p className="info-note">
                <Info style={{ fontSize: '16px', marginRight: '6px', verticalAlign: 'middle' }} />
                Please check your email for the confirmation link.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Success Messages */}
      {message && !error && isAuthenticated && (
        <div className="success-message">
          <CheckCircle style={{ fontSize: '20px', marginRight: '10px', verticalAlign: 'middle' }} />
          <div>
            <strong>Login Successful!</strong>
            <p>Welcome back, {user?.email || "User"}</p>
          </div>
        </div>
      )}

      <p className="switch-text">
        Don&apos;t have an account? <a href="/register">Register</a>
      </p>
    </div>
  );
};

export default Login;
