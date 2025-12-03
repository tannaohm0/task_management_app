import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ForgotPassword.css';

const API_BASE = 'http://localhost:3001/api';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      
      setMessage(data.message);
      setSent(true);
      setIsLoading(false);
    } catch (error) {
      setMessage('Failed to send reset email. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-card">
        <h2>Forgot Password?</h2>
        
        {!sent ? (
          <>
            <p>Enter your email address and we'll send you a link to reset your password.</p>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>

              <button type="submit" disabled={isLoading} className="submit-button">
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>

            <div className="back-to-login">
              <a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
                Back to Login
              </a>
            </div>
          </>
        ) : (
          <>
            <div className="success-icon">✓</div>
            <h3>Check Your Email</h3>
            <p className="success-message">{message}</p>
            <p className="help-text">If you don't see the email, check your spam folder.</p>
            
            <button onClick={() => navigate('/')} className="back-button">
              Back to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default ForgotPassword;
