import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { registerUser, signInWithGoogle, clearError, clearMessage } from '../store/authSlice';
import { CheckCircle, Warning, Email as EmailIcon, Info } from '@mui/icons-material';
import './Auth.css'; 

const Register = () => {
  const [name, setName] = useState(""); // optional: can be stored separately in your DB
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const dispatch = useDispatch();
  const { loading, error, isAuthenticated, user, message, requiresConfirmation } = useSelector(
    (state) => state.auth
  );

  // Clear messages when component unmounts or form is reset
  useEffect(() => {
    return () => {
      dispatch(clearError());
      dispatch(clearMessage());
    };
  }, [dispatch]);

  // Clear password fields after successful registration (for security)
  useEffect(() => {
    if (message && !error) {
      setPassword('');
      setConfirmPassword('');
    }
  }, [message, error]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    // ✅ Call Supabase register via thunk
    dispatch(registerUser({ email, password, fullName: name }));
  };

  const handleGoogleSignIn = (e) => {
    e.preventDefault();
    dispatch(signInWithGoogle());
  };

  return (
    <div className="register-page">
      <h2 className="register-title">Register</h2>
      <form className="register-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Full Name:</label>
          <input
            type="text"
            id="name"
            className="input-field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

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

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password:</label>
          <input
            type="password"
            id="confirmPassword"
            className="input-field"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? "Registering..." : "Register"}
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

      {/* Error Messages */}
      {error && (
        <div className="error-message">
          <Warning style={{ fontSize: '20px', marginRight: '10px', verticalAlign: 'middle' }} />
          <div>
            <strong>Registration Failed</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Success Messages */}
      {message && !error && (
        <div className={requiresConfirmation ? "info-message" : "success-message"}>
          {requiresConfirmation ? (
            <>
              <EmailIcon style={{ fontSize: '20px', marginRight: '10px', verticalAlign: 'middle' }} />
              <div>
                <strong>Registration Successful!</strong>
                <p>{message}</p>
                <p className="info-note">
                  <Info style={{ fontSize: '16px', marginRight: '6px', verticalAlign: 'middle' }} />
                  Please check your email inbox (and spam folder) for the confirmation link.
                </p>
              </div>
            </>
          ) : (
            <>
              <CheckCircle style={{ fontSize: '20px', marginRight: '10px', verticalAlign: 'middle' }} />
              <div>
                <strong>Account Created Successfully!</strong>
                <p>{message}</p>
              </div>
            </>
          )}
        </div>
      )}

      <p className="switch-text">
        Already have an account? <a href="/login">Login</a>
      </p>
    </div>
  );
};

export default Register;
