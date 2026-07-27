'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Activity, ShieldAlert, Lock, User } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

function LoginForm() {
  const { login, loading } = useAuth();
  const searchParams = useSearchParams();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    if (searchParams.get('expired') === 'true') {
      setSessionExpired(true);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSessionExpired(false);
    
    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }

    try {
      await login(username, password);
    } catch (err: any) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Authentication failed. Please check your credentials and server status.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-slate-100 font-sans relative overflow-hidden w-full">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-900/20 via-zinc-950 to-black pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />

      <div className="w-full max-w-md px-6 py-12 relative z-10">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-zinc-900 border border-zinc-800/80 text-emerald-500 mb-4 shadow-xl shadow-emerald-500/5 animate-pulse">
            <Activity size={36} className="stroke-[1.5]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Predictive Monitoring
          </h1>
          <p className="text-zinc-400 text-sm mt-2">
            Industrial Maintenance Dashboard
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-850 rounded-2xl p-8 shadow-2xl">
          {sessionExpired && (
            <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm rounded-lg flex items-center gap-3">
              <ShieldAlert size={18} className="shrink-0" />
              <span>Your session has expired. Please log in again.</span>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg flex items-center gap-3 animate-shake">
              <ShieldAlert size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
                Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
                  <User size={18} />
                </span>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-950/80 border border-zinc-800 rounded-xl text-white placeholder-zinc-650 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/80 transition-all text-sm"
                  placeholder="Enter your username"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
                  <Lock size={18} />
                </span>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-950/80 border border-zinc-800 rounded-xl text-white placeholder-zinc-650 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/80 transition-all text-sm"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-450 active:bg-emerald-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-black font-semibold rounded-xl text-sm transition-all duration-150 cursor-pointer shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 hover:scale-[1.01]"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Info */}
          <div className="mt-8 pt-6 border-t border-zinc-850 text-center">
            <h3 className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-3">
              Demo Accounts
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs text-zinc-400">
              <div className="bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-850/50">
                <span className="font-semibold text-zinc-350 block">Admin Access</span>
                <span className="mt-1 block font-mono text-zinc-500">admin / admin123</span>
              </div>
              <div className="bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-850/50">
                <span className="font-semibold text-zinc-350 block">User Access</span>
                <span className="mt-1 block font-mono text-zinc-500">user / user123</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium tracking-wider text-zinc-400">Loading Login...</span>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
