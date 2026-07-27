'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import {
  LayoutDashboard,
  Cpu,
  Bell,
  UploadCloud,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  Activity,
  User,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
}

export default function Layout({ children, title }: LayoutProps) {
  const { user, loading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium tracking-wider text-zinc-400">Verifying session...</span>
        </div>
      </div>
    );
  }

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Machine List', path: '/machines', icon: Cpu },
    { name: 'Alerts Log', path: '/alerts', icon: Bell },
    { name: 'Dataset Upload', path: '/upload', icon: UploadCloud },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-zinc-900 text-zinc-300 border-r border-zinc-800">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-zinc-800">
        <div className="p-2 rounded-xl bg-zinc-950 text-emerald-500 border border-zinc-850">
          <Activity size={20} className="stroke-[2]" />
        </div>
        <div>
          <span className="font-bold text-white text-base tracking-tight block">Predictive Monitor</span>
          <span className="text-[10px] text-zinc-500 font-semibold tracking-wider uppercase block">Industrial IoT v1.0</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5">
        {menuItems.map((item) => {
          const isActive = pathname === item.path || pathname?.startsWith(`${item.path}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/10 font-semibold'
                  : 'hover:bg-zinc-800 hover:text-white text-zinc-400'
              }`}
            >
              <Icon size={18} className="shrink-0" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Profile & Logout */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-950/40">
        <div className="flex items-center justify-between gap-3 px-2 py-3 mb-2 rounded-lg bg-zinc-900 border border-zinc-850/60">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="p-1.5 rounded-lg bg-zinc-850 text-zinc-400 border border-zinc-750">
              <User size={16} />
            </div>
            <div className="overflow-hidden">
              <span className="text-sm font-semibold text-white block truncate">{user.username}</span>
              <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider">{user.role}</span>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-3 border border-zinc-800 hover:border-red-500/30 text-zinc-400 hover:text-red-400 hover:bg-red-500/5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-zinc-50 text-slate-900 dark:bg-zinc-950 dark:text-zinc-50 transition-colors duration-200">
      {/* Desktop Sidebar (Left side, fixed width) */}
      <div className="hidden md:block w-64 shrink-0 h-screen sticky top-0">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar Slider Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Menu Panel */}
          <div className="relative w-64 max-w-xs h-full animate-slide-in z-50">
            <SidebarContent />
            {/* Close Button on drawer side */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 -right-12 p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Topbar */}
        <header className="sticky top-0 z-40 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-850 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Hamburger Button for Mobile */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg border border-zinc-250 dark:border-zinc-800 text-zinc-650 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white">{title}</h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border border-zinc-250 dark:border-zinc-850 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
              title="Toggle color theme"
            >
              {theme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        {/* Content Page body */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
