import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User, Menu } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Navigationbar({ user, onLogout }: { user: any, onLogout: () => void }) {
  const location = useLocation();

  // definisco le rotte, nascondo il configuratore se l'utente è la sartoria (admin)
  const navLinks = [
    { name: 'Manifesto', path: '/' },
    ...(user.role !== 'admin' ? [{ name: 'Configura', path: '/configurator' }] : []),
    { name: 'Area Personale', path: '/dashboard' },
  ];

  return (
    // navbar sticky con effetto blur per non dare fastidio allo scroll
    <nav className="sticky top-0 z-50 bg-stone-50/80 backdrop-blur-md border-b border-stone-200 px-6 py-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-serif tracking-tighter hover:opacity-70 transition-all">
          ZERO.STOCK
        </Link>

        <div className="hidden md:flex gap-12 items-center">
          {/* mappo i link e evidenzio quello attivo in base al path corrente */}
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={cn(
                "text-xs uppercase tracking-[0.2em] transition-all hover:text-zinc-900",
                location.pathname === link.path ? "text-zinc-900 font-medium" : "text-slate-500"
              )}
            >
              {link.name}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-6">
          {/* zona destra: info utente e tasto per uscire */}
          <div className="flex items-center gap-4 border-l pl-6 border-stone-200">
            <Link to="/dashboard" className="text-zinc-900 hover:opacity-70 transition-all flex items-center gap-2">
              <User size={20} />
              <span className="text-[10px] uppercase tracking-widest hidden lg:block">{user.name}</span>
            </Link>
            <button 
              onClick={onLogout}
              className="text-[10px] uppercase tracking-widest text-red-400 hover:text-red-600 transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}