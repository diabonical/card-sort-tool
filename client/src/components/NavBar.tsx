import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function NavBar() {
  const { researcher, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="bg-brand-500 shadow-md">
      <div className="max-w-6xl mx-auto px-6 py-0 flex items-center justify-between h-16">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {/* Akendi-style logo mark */}
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            </div>
            <span className="text-white font-bold text-lg tracking-wide">akendi</span>
            <span className="text-brand-200 text-sm font-normal border-l border-white/30 pl-3 ml-1">Card Sort</span>
          </div>
        </Link>

        {/* Right side */}
        {researcher && (
          <div className="flex items-center gap-4">
            <span className="text-brand-100 text-sm">{researcher.username}</span>
            <button
              onClick={handleLogout}
              className="text-white/80 hover:text-white text-sm transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
