import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, ShieldCheck, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface AuthProps {
  onLogin: (user: any) => void;
}

export default function Authentication({ onLogin }: AuthProps) {
  // stati del form e gestione errori
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    surname: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      // recupero gli utenti dal localstorage (mock db per il poc)
      const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');

      if (isLogin) {
        // controllo credenziali per il login
        const user = registeredUsers.find((u: any) => u.email === formData.email && u.password === formData.password);
        if (!user) {
          setError("Email o password errati.");
          setLoading(false);
          return;
        }
        
        onLogin(user);
      } else {
        // logica di registrazione
        const existingUser = registeredUsers.find((u: any) => u.email === formData.email);
        if (existingUser) {
          setError("Un account con questa email esiste già.");
          setLoading(false);
          return;
        }

        // trucchetto per i test: se l'email contiene @admin forziamo il ruolo
        const isAdminEmail = formData.email.toLowerCase().includes('@admin');
        const finalRole = isAdminEmail ? 'admin' : role;

        const newUser = {
          uid: finalRole === 'admin' ? `admin-${Date.now()}` : `user-${Date.now()}`,
          name: formData.name || (finalRole === 'admin' ? 'Admin' : 'Utente'),
          surname: formData.surname || (finalRole === 'admin' ? 'Boutique' : 'Nuovo'),
          role: finalRole,
          email: formData.email,
          password: formData.password
        };

        // salvo il nuovo utente e procedo al login
        registeredUsers.push(newUser);
        localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
        
        onLogin(newUser);
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError("Si è verificato un errore durante l'autenticazione.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
      {/* animazione iniziale di ingresso */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white border border-zinc-100 p-10 shadow-sm"
      >
        <div className="text-center mb-10">
          <h1 className="text-4xl font-serif mb-2">ZERO.STOCK</h1>
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
            {isLogin ? 'Accesso Privato' : 'Crea Account'}
          </p>
        </div>

        {/* selezione del ruolo con feedback visivo */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setRole('user')}
            className={cn(
              "flex-1 py-3 border text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2",
              role === 'user' ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 text-slate-400"
            )}
          >
            <User size={14} /> Cliente
          </button>
          <button
            onClick={() => setRole('admin')}
            className={cn(
              "flex-1 py-3 border text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2",
              role === 'admin' ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 text-slate-400"
            )}
          >
            <ShieldCheck size={14} /> Boutique
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-xs text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isLogin && (
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Nome"
                required
                className="w-full p-3 border border-zinc-200 text-sm focus:border-zinc-900 outline-none transition-all"
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <input
                type="text"
                placeholder="Cognome"
                required
                className="w-full p-3 border border-zinc-200 text-sm focus:border-zinc-900 outline-none transition-all"
                onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
              />
            </div>
          )}
          <input
            type="email"
            placeholder="Email"
            required
            className="w-full p-3 border border-zinc-200 text-sm focus:border-zinc-900 outline-none transition-all"
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <input
            type="password"
            placeholder="Password"
            required
            className="w-full p-3 border border-zinc-200 text-sm focus:border-zinc-900 outline-none transition-all"
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />

          <button
            type="submit"
            disabled={loading}
            className={cn(
              "w-full py-4 bg-zinc-900 text-white uppercase tracking-[0.2em] text-xs hover:bg-zinc-800 transition-all flex items-center justify-center gap-3",
              loading && "opacity-50 cursor-not-allowed"
            )}
          >
            {loading ? 'Caricamento...' : (isLogin ? 'Entra' : 'Registrati')} <ArrowRight size={16} />
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => { setIsLogin(!isLogin); setError(null); }}
            className="text-[10px] uppercase tracking-widest text-slate-400 hover:text-zinc-900 transition-all"
          >
            {isLogin ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}