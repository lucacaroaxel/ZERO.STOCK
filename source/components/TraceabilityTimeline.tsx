import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Clock, Camera, Package, ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils';

// mappo gli stati della fsm esattamente come nello smart contract
const STEPS = [
  { id: 0, name: 'Ordinato', icon: Clock, description: 'Ordine ricevuto e processato.' },
  { id: 1, name: 'In Taglio', icon: Camera, description: 'Il tessuto viene tagliato su misura.' },
  { id: 2, name: 'Cucitura', icon: Camera, description: 'Assemblaggio sartoriale del capo.' },
  { id: 3, name: 'Spedito', icon: Package, description: 'Il prodotto è in viaggio verso di te.' },
];

// componente helper per le immagini ipfs. gestisco il fallback visivo se la rete è lenta
const IPFSImage = ({ cid, localImage }: { cid: string, localImage?: string }) => {
  const [hasError, setHasError] = useState(false);
  // uso dweb.link per i test, magari in prod passo al gateway privato di pinata
  const gatewayUrl = `https://dweb.link/ipfs/${cid}`;
  const displayUrl = localImage || gatewayUrl;

  return (
    <a 
      href={gatewayUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="w-full h-full block relative"
    >
      {!hasError ? (
        <>
          <img 
            src={displayUrl} 
            alt="Proof" 
            className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
            referrerPolicy="no-referrer"
            onError={() => setHasError(true)}
          />
          <div className="absolute inset-0 bg-black/10 hover:bg-black/40 transition-all duration-700 flex items-center justify-center opacity-0 hover:opacity-100">
            <ExternalLink size={20} className="text-white" />
          </div>
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-zinc-50 border border-zinc-100 p-4 text-center">
          <span className="text-[10px] uppercase tracking-widest text-slate-400">
            Immagine crittografata su IPFS in caricamento...
          </span>
        </div>
      )}
    </a>
  );
};

interface TraceabilityTimelineProps {
  currentStatus: number;
  history: { status: number; timestamp: string; ipfsCid?: string; localImage?: string }[];
}

export default function TraceabilityTimeline({ currentStatus = 1, history = [] }: TraceabilityTimelineProps) {
  return (
    <div className="max-w-3xl mx-auto py-20 px-6">
      <h2 className="text-4xl mb-12 text-center">Ciclo di Vita del Prodotto</h2>
      
      <div className="relative">
        {/* linea di tracciamento verticale stile quiet luxury */}
        <div className="absolute left-8 top-0 bottom-0 w-px bg-zinc-200" />

        <div className="space-y-16">
          {STEPS.map((step, index) => {
            const isCompleted = index <= currentStatus;
            const stepHistory = history.find(h => h.status === index);
            
            return (
              <motion.div 
                key={step.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="relative flex gap-12"
              >
                {/* icona di stato che si accende se lo step è completato */}
                <div className={cn(
                  "z-10 w-16 h-16 flex items-center justify-center border-2 transition-all duration-700",
                  isCompleted ? "bg-zinc-900 border-zinc-900 text-white" : "bg-stone-50 border-zinc-200 text-zinc-300"
                )}>
                  <step.icon size={24} />
                </div>

                {/* contenuto dello step */}
                <div className="flex-1 pt-2">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className={cn(
                        "text-xl font-serif",
                        isCompleted ? "text-zinc-900" : "text-zinc-400"
                      )}>
                        {step.name}
                      </h3>
                      <p className="text-slate-500 text-sm mt-1">{step.description}</p>
                    </div>
                    {isCompleted && (
                      <span className="text-[10px] uppercase tracking-widest text-slate-400">
                        {stepHistory?.timestamp || '31 Mar 2026'}
                      </span>
                    )}
                  </div>

                  {/* qui avviene la vera unione phygital: mostro l'hash ipfs se c'è */}
                  {isCompleted && stepHistory?.ipfsCid && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-6 aspect-video bg-zinc-100 border border-zinc-200 overflow-hidden group relative"
                    >
                      <IPFSImage cid={stepHistory.ipfsCid} localImage={stepHistory.localImage} />
                      {/* metto il cid in sovrimpressione ma piccolo, per non sporcare il design */}
                      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 text-[10px] uppercase tracking-widest border border-zinc-200 pointer-events-none">
                        Blockchain Verified CID: {stepHistory.ipfsCid.substring(0, 10)}...
                      </div>
                    </motion.div>
                  )}
                  
                  {!isCompleted && (
                    <div className="mt-4 h-24 border border-dashed border-zinc-200 flex items-center justify-center text-zinc-300 text-xs uppercase tracking-widest">
                      In attesa di produzione
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}