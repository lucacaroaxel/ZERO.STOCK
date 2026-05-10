import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navigationbar from './components/Navigationbar';
import Home from './components/Home';
import Configurator from './components/Configurator';
import UserProfile from './components/UserProfile';
import Authentication from './components/Authentication';

// entry point dell'applicazione, qui gestisco il routing e lo stato globale dell'utente
export default function App() {
  const [user, setUser] = useState<any>(null);

  // recupero la sessione dal localstorage per non far riloggare l'utente ad ogni refresh
  useEffect(() => {
    const savedUser = localStorage.getItem('zero-stock-user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // helper per salvare l'utente in stato e in cache dopo il login
  const handleLogin = (userData: any) => {
    setUser(userData);
    localStorage.setItem('zero-stock-user', JSON.stringify(userData));
  };

  // svuoto tutto quando l'utente esce
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('zero-stock-user');
  };

  // gatekeeper: se non sei loggato vedi solo la schermata di autenticazione
  if (!user) {
    return <Authentication onLogin={handleLogin} />;
  }

  return (
    <Router>
      {/* wrap principale che tiene il layout coerente (navbar + main + footer) */}
      <div className="min-h-screen flex flex-col">
        <Navigationbar user={user} onLogout={handleLogout} />
        
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/configurator" element={<Configurator />} />
            <Route path="/dashboard" element={<UserProfile user={user} />} />
          </Routes>
        </main>
        
        {/* footer semplice per dare contesto alla tesi e allo stack tecnologico usato */}
        <footer className="py-12 px-6 border-t border-stone-200 bg-stone-100">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-xl font-serif">ZERO.STOCK</div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
              ZERO.STOCK - Progetto di Tesi di Luca Carofiglio
            </div>
            <div className="flex gap-8 text-[10px] uppercase tracking-widest text-slate-500">
              <span>Ethereum Sepolia</span>
              <span>IPFS / Pinata</span>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}