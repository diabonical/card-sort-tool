import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Button from './Button';

export default function NavBar() {
  const { researcher, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <Link to="/" className="text-lg font-bold text-blue-600">
        CardSort
      </Link>
      {researcher && (
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{researcher.username}</span>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Log out
          </Button>
        </div>
      )}
    </header>
  );
}
