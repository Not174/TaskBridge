'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, X, Briefcase, User, LogOut, LayoutDashboard, FilePlus, Eye } from 'lucide-react';

interface NavbarProps {
  user: {
    id: string;
    phone: string;
    role: 'POSTER' | 'SEEKER' | 'ADMIN';
    name?: string;
  } | null;
}

export default function Navbar({ user }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const renderNavLinks = () => {
    if (!user) {
      return (
        <>
          <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-accent transition-colors">
            Login
          </Link>
          <Link
            href="/signup"
            className="px-4 py-2 text-sm font-semibold text-primary bg-accent rounded-lg hover:bg-accent-hover transition-all duration-200"
          >
            Sign Up
          </Link>
        </>
      );
    }

    if (user.role === 'POSTER') {
      return (
        <>
          <Link href="/poster/dashboard" className="flex items-center gap-1.5 text-sm font-medium text-slate-300 hover:text-accent transition-colors">
            <LayoutDashboard size={16} /> Dashboard
          </Link>
          <Link href="/poster/post-task" className="flex items-center gap-1.5 text-sm font-medium text-slate-300 hover:text-accent transition-colors">
            <FilePlus size={16} /> Post a Task
          </Link>
          <Link href="/poster/my-tasks" className="flex items-center gap-1.5 text-sm font-medium text-slate-300 hover:text-accent transition-colors">
            <Briefcase size={16} /> My Tasks
          </Link>
          <Link href="/poster/profile" className="flex items-center gap-1.5 text-sm font-medium text-slate-300 hover:text-accent transition-colors">
            <User size={16} /> Profile
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm font-medium text-red-400 hover:text-red-300 transition-colors"
          >
            <LogOut size={16} /> Logout
          </button>
        </>
      );
    }

    if (user.role === 'SEEKER') {
      return (
        <>
          <Link href="/seeker/jobs" className="flex items-center gap-1.5 text-sm font-medium text-slate-300 hover:text-accent transition-colors">
            <Briefcase size={16} /> Job Board
          </Link>
          <Link href="/seeker/my-jobs" className="flex items-center gap-1.5 text-sm font-medium text-slate-300 hover:text-accent transition-colors">
            <LayoutDashboard size={16} /> My Jobs
          </Link>
          <Link href="/seeker/profile" className="flex items-center gap-1.5 text-sm font-medium text-slate-300 hover:text-accent transition-colors">
            <User size={16} /> Profile
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm font-medium text-red-400 hover:text-red-300 transition-colors"
          >
            <LogOut size={16} /> Logout
          </button>
        </>
      );
    }

    if (user.role === 'ADMIN') {
      return (
        <>
          <Link href="/admin/dashboard" className="flex items-center gap-1.5 text-sm font-medium text-slate-300 hover:text-accent transition-colors">
            <LayoutDashboard size={16} /> Admin Stats
          </Link>
          <Link href="/admin/users" className="flex items-center gap-1.5 text-sm font-medium text-slate-300 hover:text-accent transition-colors">
            <User size={16} /> Manage Users
          </Link>
          <Link href="/admin/tasks" className="flex items-center gap-1.5 text-sm font-medium text-slate-300 hover:text-accent transition-colors">
            <Briefcase size={16} /> Manage Tasks
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm font-medium text-red-400 hover:text-red-300 transition-colors"
          >
            <LogOut size={16} /> Logout
          </button>
        </>
      );
    }
  };

  const renderMobileLinks = () => {
    if (!user) {
      return (
        <>
          <Link
            href="/login"
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2 text-base font-medium text-slate-300 hover:text-accent transition-colors"
          >
            Login
          </Link>
          <Link
            href="/signup"
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2 text-base font-medium text-accent hover:text-accent-hover transition-colors"
          >
            Sign Up
          </Link>
        </>
      );
    }

    const links = [];
    if (user.role === 'POSTER') {
      links.push(
        { href: '/poster/dashboard', text: 'Dashboard' },
        { href: '/poster/post-task', text: 'Post a Task' },
        { href: '/poster/my-tasks', text: 'My Tasks' },
        { href: '/poster/profile', text: 'Profile' }
      );
    } else if (user.role === 'SEEKER') {
      links.push(
        { href: '/seeker/jobs', text: 'Job Board' },
        { href: '/seeker/my-jobs', text: 'My Jobs' },
        { href: '/seeker/profile', text: 'Profile' }
      );
    } else if (user.role === 'ADMIN') {
      links.push(
        { href: '/admin/dashboard', text: 'Admin Stats' },
        { href: '/admin/users', text: 'Manage Users' },
        { href: '/admin/tasks', text: 'Manage Tasks' }
      );
    }

    return (
      <>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2 text-base font-medium text-slate-300 hover:text-accent transition-colors"
          >
            {link.text}
          </Link>
        ))}
        <button
          onClick={() => {
            setIsOpen(false);
            handleLogout();
          }}
          className="block w-full text-left px-3 py-2 text-base font-medium text-red-400 hover:text-red-300 transition-colors"
        >
          Logout
        </button>
      </>
    );
  };

  return (
    <nav className="bg-primary border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo / Branding */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold text-white tracking-wide">
              <span className="text-accent text-2xl font-black">TB</span>
              <span>TaskBridge</span>
            </Link>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-6">
            {renderNavLinks()}
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-slate-300 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors focus:outline-none"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav Links Panel */}
      {isOpen && (
        <div className="md:hidden bg-primary-hover border-t border-white/5 px-2 pt-2 pb-4 space-y-1">
          {renderMobileLinks()}
        </div>
      )}
    </nav>
  );
}
