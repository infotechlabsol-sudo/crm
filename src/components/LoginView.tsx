import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/storage';
import { Video, Lock, Mail, Eye, EyeOff, Loader2 } from 'lucide-react';

export const LoginView: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both fields.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      if (isRegistering) {
        // Explicitly register new admin
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        try {
          // Attempt standard sign in
          await signInWithEmailAndPassword(auth, email, password);
        } catch (signInErr: any) {
          // Fallback to auto-create on first-time login if user is not found (helps first-time users immensely!)
          if (
            signInErr.code === 'auth/user-not-found' ||
            signInErr.code === 'auth/invalid-credential' ||
            signInErr.message?.includes('user-not-found')
          ) {
            // Let the user know we can create the account or let them try to create it
            setError('Account not found or password incorrect. If this is your first time, click "Create Admin Account" below.');
            setLoading(false);
            return;
          } else {
            throw signInErr;
          }
        }
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      if (err.code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please sign in instead.');
      } else {
        setError(err.message || 'Authentication failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
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
            {isRegistering ? 'Setup Single Admin Account' : 'Sign in to Admin Dashboard'}
          </h2>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {isRegistering 
              ? 'Create your administrative password' 
              : 'Enter your administrative credentials to continue'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-3 text-rose-400 font-medium leading-relaxed">
            {error}
          </div>
        )}

        {/* Login Form */}
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
                placeholder="admin@techlab.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-teal-500 transition-colors font-medium"
              />
            </div>
          </div>

          {/* Password input */}
          <div className="space-y-1">
            <label className="block font-medium text-slate-300">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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
                <span>Processing...</span>
              </>
            ) : (
              <span>{isRegistering ? 'Create Admin & Login' : 'Secure Admin Login'}</span>
            )}
          </button>
        </form>

        {/* Setup Toggles */}
        <div className="text-center pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError('');
            }}
            className="text-teal-400 hover:text-teal-300 font-medium transition-colors cursor-pointer"
          >
            {isRegistering 
              ? 'Already have an Admin account? Sign In' 
              : 'First time using this CRM? Create Admin Account'}
          </button>
        </div>

        {/* Footer info */}
        <div className="text-center text-[10px] text-slate-600">
          Secure offline database transitioned to Google Cloud Firestore.
        </div>
      </div>
    </div>
  );
};
