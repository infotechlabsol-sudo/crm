import React, { useState } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/storage';
import { Video, Lock, Mail, Eye, EyeOff, Loader2, KeyRound } from 'lucide-react';

export const LoginView: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setError('');
    setInfoMessage('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: any) {
      console.error('Authentication error:', err);
      // Uniform generic error message to prevent user enumeration
      setError('Invalid email or password. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      setError('Please enter your admin email address.');
      return;
    }
    setError('');
    setInfoMessage('');
    setResetLoading(true);

    try {
      await sendPasswordResetEmail(auth, resetEmail.trim());
    } catch (err: any) {
      console.error('Password reset request error:', err);
      // Even if user not found, don't leak account existence
    } finally {
      setResetLoading(false);
      setInfoMessage('If an account is associated with this email, a password reset link has been sent to your inbox.');
      setShowForgotPassword(false);
      setResetEmail('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden text-xs selection:bg-teal-500 selection:text-black">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 relative z-10 space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-xl bg-teal-500 flex items-center justify-center text-slate-950 font-bold shadow-[0_0_20px_rgba(45,212,191,0.3)]">
            <Video className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center justify-center gap-2 uppercase tracking-tight">
              <span>Tech Lab</span>
              <span className="text-xs font-bold text-teal-400 bg-teal-950 border border-teal-800 px-1.5 py-0.5 rounded">
                CRM
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 mt-1">
              Academy Lead Management Engine
            </p>
          </div>
        </div>

        {/* Title */}
        <div className="text-center">
          <h2 className="text-sm font-semibold text-slate-200">
            {showForgotPassword ? 'Reset Password' : 'Sign in to Admin Dashboard'}
          </h2>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {showForgotPassword 
              ? 'Enter your email to receive password reset instructions' 
              : 'Enter your administrative credentials to continue'}
          </p>
        </div>

        {/* Success / Info Message */}
        {infoMessage && (
          <div className="bg-emerald-950/50 border border-emerald-800/60 rounded-xl p-3 text-emerald-300 font-medium leading-relaxed">
            {infoMessage}
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-3 text-rose-400 font-medium leading-relaxed">
            {error}
          </div>
        )}

        {/* Forgot Password Sub-View */}
        {showForgotPassword ? (
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div className="space-y-1">
              <label className="block font-medium text-slate-300">Admin Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="admin@techlabacademy.in"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-teal-500 transition-colors font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={resetLoading}
              className="w-full bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-teal-950/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {resetLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Sending Reset Link...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Send Password Reset Link</span>
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setError('');
                }}
                className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer text-xs"
              >
                Back to Login
              </button>
            </div>
          </form>
        ) : (
          /* Standard Login Form */
          <form onSubmit={handleLogin} className="space-y-4">
            
            {/* Email input */}
            <div className="space-y-1">
              <label className="block font-medium text-slate-300">Admin Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@techlabacademy.in"
                  autoComplete="username"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-teal-500 transition-colors font-medium"
                />
              </div>
            </div>

            {/* Password input */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block font-medium text-slate-300">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(true);
                    setResetEmail(email);
                    setError('');
                    setInfoMessage('');
                  }}
                  className="text-[11px] text-teal-400 hover:text-teal-300 transition-colors cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-teal-500 transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 p-0.5 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-teal-950/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Log In</span>
              )}
            </button>
          </form>
        )}

        {/* Footer info */}
        <div className="text-center text-[10px] text-slate-600 pt-2 border-t border-slate-800/80">
          Admin Portal &bull; Protected Access Only
        </div>
      </div>
    </div>
  );
};
