import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, ShieldCheck, Recycle, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[90vh] flex items-center px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* hero section animata con framer motion per dare un feeling premium (calm tech) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="text-sm uppercase tracking-[0.3em] text-slate-500 mb-6 block">Zero Waste. Pure Luxury.</span>
            <h1 className="text-7xl lg:text-8xl mb-8 leading-[0.9]">
              Produciamo solo ciò che <span className="italic">indossi</span>.
            </h1>
            <p className="text-xl text-slate-600 mb-10 max-w-md leading-relaxed">
              ZERO.STOCK azzera il magazzino producendo esclusivamente su ordine. 
              Ogni capo è tracciato on-chain per garantirti l'eccellenza etica.
            </p>
            
            {/* cta principale che lancia il flusso dell'utente */}
            <Link 
              to="/configurator"
              className="inline-flex items-center gap-4 px-10 py-5 bg-zinc-900 text-white hover:bg-zinc-800 transition-all uppercase tracking-[0.2em] text-sm"
            >
              Configura ora <ArrowRight size={18} />
            </Link>
          </motion.div>
          
          <div className="relative h-full hidden lg:block">
            <motion.div 
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.2 }}
              className="aspect-[3/4] bg-zinc-100 rounded-[40px] overflow-hidden"
            >
              {/* immagine di copertina con blend per fonderla col container */}
              <img 
                src="/immagini/homepage.png" 
                alt="Luxury Fabric" 
                className="w-full h-full object-cover mix-blend-multiply opacity-100"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      {/* sezione dei 3 pillar teorici discussi nella tesi */}
      <section className="py-32 bg-white px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-20">
            <div className="space-y-6">
              <div className="w-12 h-12 border border-zinc-900 flex items-center justify-center">
                <Recycle size={24} />
              </div>
              <h3 className="text-2xl">Zero waste, origine condivisa</h3>
              <p className="text-slate-500 leading-relaxed">
                Il tuo capo nasce solo nel momento in cui lo ordini. Azzeriamo le rimanenze di magazzino e ti rendiamo partecipe dell'intero processo produttivo, permettendoti di seguire la creazione del prodotto fin dal primo taglio di tessuto.
              </p>
            </div>
            <div className="space-y-6">
              <div className="w-12 h-12 border border-zinc-900 flex items-center justify-center">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-2xl">Il ciclo di vita on-chain</h3>
              <p className="text-slate-500 leading-relaxed">
                Trasparenza totale e incensurabile. Ogni fase della lavorazione sartoriale viene certificata tramite Smart Contract, creando una linea del tempo digitale e immutabile che puoi verificare istante per istante.
              </p>
            </div>
            <div className="space-y-6">
              <div className="w-12 h-12 border border-zinc-900 flex items-center justify-center">
                <Zap size={24} />
              </div>
              <h3 className="text-2xl">La tua timeline personale</h3>
              <p className="text-slate-500 leading-relaxed">
                Nessuna scatola chiusa. Connettiti all'area riservata per visualizzare l'avanzamento in tempo reale del tuo ordine e sbloccare le prove fotografiche caricate direttamente dall'atelier durante ogni step di lavorazione.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}