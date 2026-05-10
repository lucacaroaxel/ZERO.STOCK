import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { Check, ChevronRight, ChevronLeft, CreditCard, MapPin, Package } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';

// mock dei dati per i prodotti
const ITEMS = [
  { id: 'tshirt', name: 'T-shirt Cotone', price: '85€', description: 'Cotone biologico 100%, grammatura 220g.' },
  { id: 'sweater', name: 'Maglione Cashmere', price: '240€', description: 'Cashmere rigenerato, morbidezza senza tempo.' },
  { id: 'pants', name: 'Pantalone Lino', price: '160€', description: 'Lino belga, taglio sartoriale rilassato.' },
];

const COLORS = [
  { id: 'cream', name: 'Crema', hex: '#F5F5DC' },
  { id: 'slate', name: 'Ardesia', hex: '#475569' },
  { id: 'sand', name: 'Sabbia', hex: '#D2B48C' },
];

import { createBlockchainOrder, connectWallet } from '../services/web3Service';

export default function Configurator() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('zero-stock-user') || '{}');
  
  // gestione degli step e stato della ui
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    item: '',
    color: '',
    gender: 'unisex',
    height: 175,
    weight: 70,
    size: '',
    address: '',
    paymentMethod: 'crypto'
  });

  // redirect se admin: impedisco alla sartoria di usare il configuratore
  if (user.role === 'admin') {
    return <Navigate to="/admin" />;
  }

  // calcolo del bmi per suggerire la taglia automaticamente
  const calculateSize = (height: number, weight: number) => {
    const bmi = weight / ((height / 100) ** 2);
    if (bmi < 18.5) return 'XS';
    if (bmi < 21) return 'S';
    if (bmi < 24) return 'M';
    if (bmi < 27) return 'L';
    return 'XL';
  };

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleNext = () => {
    if (step === 3) {
      // se l'utente non seleziona nulla forzo la taglia suggerita
      const suggestedSize = calculateSize(config.height, config.weight);
      if (!config.size) {
        setConfig({ ...config, size: suggestedSize });
      }
    }
    setStep(step + 1);
  };

  const handleBack = () => setStep(step - 1);

  const handleOrder = async () => {
    setLoading(true);
    setErrorMsg(null);
    const itemName = ITEMS.find(i => i.id === config.item)?.name || config.item;
    const colorName = COLORS.find(c => c.id === config.color)?.name || config.color;

    try {
      // 1. chiamata blockchain reale (firma su metamask)
      const result = await createBlockchainOrder(
        user.uid,
        itemName,
        colorName,
        config.size
      );

      let txHash = null;
      let orderId = `local-${Date.now()}`;
      let isBlockchainVerified = false;

      if (result) {
        txHash = result.txHash;
        orderId = result.orderId;
        isBlockchainVerified = true;
      } else {
        console.warn("Transazione blockchain fallita o wallet non connesso. Salvataggio in modalità locale per demo.");
      }

      // 2. salvataggio locale per sincronizzazione poc
      // mi assicuro di avere l'address di chi ha firmato
      const wallet = await connectWallet();
      const customerAddress = wallet ? wallet.account : null;

      const orderData = {
        id: orderId,
        customerUid: user.uid,
        customerAddress: customerAddress,
        customerEmail: user.email,
        customer: {
          name: user.name,
          surname: user.surname,
          phone: user.phone || '',
          height: config.height,
          weight: config.weight
        },
        item: itemName,
        color: colorName,
        size: config.size,
        address: config.address,
        paymentMethod: config.paymentMethod,
        status: 0, // stato iniziale: ordinato
        timestamp: Date.now(),
        ipfsCid: null,
        txHash: txHash,
        isBlockchainVerified: isBlockchainVerified,
        history: [
          { status: 0, timestamp: new Date().toLocaleString(), ipfsCid: null, txHash: txHash }
        ]
      };

      // pusho l'ordine nel db locale e passo allo step di successo
      const existingOrders = JSON.parse(localStorage.getItem('zero-stock-orders') || '[]');
      const updatedOrders = [...existingOrders, orderData];
      localStorage.setItem('zero-stock-orders', JSON.stringify(updatedOrders));
      
      setStep(6); // Successo
    } catch (err) {
      console.error("Errore salvataggio ordine:", err);
      setErrorMsg("Si è verificato un errore durante il salvataggio dell'ordine.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-20 px-6">
      <div className="mb-12">
        <h2 className="text-4xl mb-4 font-serif">Configura il tuo capo</h2>
        {/* barra di progresso degli step */}
        <div className="flex gap-4">
          {[1, 2, 3, 4, 5].map((s) => (
            <div 
              key={s} 
              className={cn(
                "h-1 flex-1 transition-all duration-500",
                step >= s ? "bg-zinc-900" : "bg-zinc-200"
              )}
            />
          ))}
        </div>
      </div>

      <div className={cn("transition-all duration-500", step > 1 && step < 6 ? "grid grid-cols-1 lg:grid-cols-2 gap-12" : "")}>
        {step > 1 && step < 6 && (
          <div className="flex justify-center items-center bg-zinc-50 border border-zinc-100 p-8 min-h-[450px] relative">
            {/* gestisco le foto mockup sulla sinistra */}
            <img 
              src={`/immagini/${config.item}-${config.color || 'cream'}.png`} 
              alt={`${config.item} ${config.color || 'cream'}`}
              className="w-full max-w-md h-auto object-cover mix-blend-multiply"
              onError={(e) => {
                // Fallback se l'utente non ha ancora caricato l'immagine
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=800';
              }}
            />
            <span className="absolute bottom-4 right-4 text-[8px] uppercase tracking-widest text-slate-400 italic">
              * Le immagini sono state generate con Google Gemini
            </span>
          </div>
        )}

        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="min-h-[450px] w-full flex flex-col justify-center"
        >
        {step === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* step 1: selezione capo */}
            {ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setConfig({ ...config, item: item.id })}
                className={cn(
                  "p-8 border text-left transition-all hover:border-zinc-900",
                  config.item === item.id ? "border-zinc-900 bg-zinc-50" : "border-zinc-200"
                )}
              >
                <h3 className="text-xl mb-2 font-serif">{item.name}</h3>
                <p className="text-sm text-slate-500 mb-4">{item.description}</p>
                <span className="font-medium">{item.price}</span>
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* step 2: scelta colore */}
            {COLORS.map((color) => (
              <button
                key={color.id}
                onClick={() => setConfig({ ...config, color: color.id })}
                className={cn(
                  "p-8 border text-center transition-all hover:border-zinc-900",
                  config.color === color.id ? "border-zinc-900 bg-zinc-50" : "border-zinc-200"
                )}
              >
                <div 
                  className="w-16 h-16 rounded-full mx-auto mb-4 border border-zinc-200"
                  style={{ backgroundColor: color.hex }}
                />
                <h3 className="text-lg uppercase tracking-widest text-[10px]">{color.name}</h3>
              </button>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="max-w-md mx-auto space-y-12">
            {/* step 3: dati biometrici per taglia */}
            <div className="text-center mb-8">
              <p className="text-sm text-slate-500">I tuoi dati biometrici ci aiutano a consigliarti la taglia perfetta.</p>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest mb-4 text-slate-400">Altezza (cm)</label>
              <input 
                type="range" min="140" max="210" 
                value={config.height}
                onChange={(e) => {
                  const newHeight = parseInt(e.target.value);
                  setConfig({ ...config, height: newHeight, size: calculateSize(newHeight, config.weight) });
                }}
                className="w-full accent-zinc-900"
              />
              <span className="text-3xl font-serif block mt-2">{config.height} cm</span>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest mb-4 text-slate-400">Peso (kg)</label>
              <input 
                type="range" min="40" max="130" 
                value={config.weight}
                onChange={(e) => {
                  const newWeight = parseInt(e.target.value);
                  setConfig({ ...config, weight: newWeight, size: calculateSize(config.height, newWeight) });
                }}
                className="w-full accent-zinc-900"
              />
              <span className="text-3xl font-serif block mt-2">{config.weight} kg</span>
            </div>

            <div className="pt-8 border-t border-zinc-100">
              <label className="block text-[10px] uppercase tracking-widest mb-4 text-slate-400 text-center">Taglia Consigliata / Selezionata</label>
              <div className="flex justify-center gap-4">
                {['XS', 'S', 'M', 'L', 'XL'].map((s) => {
                  const currentSize = config.size || calculateSize(config.height, config.weight);
                  return (
                    <button
                      key={s}
                      onClick={() => setConfig({ ...config, size: s })}
                      className={cn(
                        "w-12 h-12 border flex items-center justify-center text-xs font-bold transition-all",
                        currentSize === s ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 text-slate-400 hover:border-zinc-400"
                      )}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="max-w-md mx-auto space-y-8">
            {/* step 4: recapiti per la logistica */}
            <h3 className="text-2xl font-serif text-center mb-8">Spedizioni & Pagamento</h3>
            
            <div className="space-y-4">
              <label className="block text-[10px] uppercase tracking-widest text-slate-400">Indirizzo di Spedizione</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 text-slate-400" size={18} />
                <textarea 
                  placeholder="Via, Civico, Città, CAP"
                  className="w-full p-3 pl-10 border border-zinc-200 focus:border-zinc-900 outline-none min-h-[100px] text-sm"
                  value={config.address}
                  onChange={(e) => setConfig({ ...config, address: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-[10px] uppercase tracking-widest text-slate-400">Metodo di Pagamento</label>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setConfig({ ...config, paymentMethod: 'crypto' })}
                  className={cn(
                    "p-4 border text-[10px] uppercase tracking-widest flex items-center justify-center gap-2",
                    config.paymentMethod === 'crypto' ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 text-slate-400"
                  )}
                >
                  <CreditCard size={14} /> Crypto
                </button>
                <button 
                  onClick={() => setConfig({ ...config, paymentMethod: 'card' })}
                  className={cn(
                    "p-4 border text-[10px] uppercase tracking-widest flex items-center justify-center gap-2",
                    config.paymentMethod === 'card' ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 text-slate-400"
                  )}
                >
                  <CreditCard size={14} /> Carta
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="text-center py-10">
            {/* step 5: riepilogo e bottone di trigger on-chain */}
            <h3 className="text-3xl mb-6 font-serif">Riepilogo Finale</h3>
            <div className="bg-white p-10 border border-zinc-100 space-y-4 max-w-lg mx-auto text-left">
              <div className="flex justify-between border-b pb-2">
                <span className="text-[10px] uppercase tracking-widest text-slate-400">Capo</span>
                <span className="font-medium uppercase text-sm">{config.item}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-[10px] uppercase tracking-widest text-slate-400">Colore</span>
                <span className="font-medium uppercase text-sm">{config.color}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-[10px] uppercase tracking-widest text-slate-400">Taglia</span>
                <span className="text-xl font-serif">{config.size}</span>
              </div>
              <div className="pt-4">
                <span className="text-[10px] uppercase tracking-widest text-slate-400 block mb-2">Spedito a:</span>
                <p className="text-sm text-zinc-600 italic">{config.address || 'Indirizzo non inserito'}</p>
              </div>
            </div>
            <button 
              disabled={!config.address || loading}
              onClick={handleOrder}
              className="mt-12 px-12 py-4 bg-zinc-900 text-white hover:bg-zinc-800 transition-all uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 mx-auto disabled:opacity-30"
            >
              {loading ? "Transazione in corso..." : "Conferma Ordine"} <Package size={16} />
            </button>
            {errorMsg && (
              <div className="mt-4 text-red-500 text-sm">
                {errorMsg}
              </div>
            )}
          </div>
        )}

        {step === 6 && (
          <div className="text-center py-20">
            {/* step 6: finalizzazione e redirect calm tech */}
            <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8">
              <Check size={40} />
            </div>
            <h3 className="text-4xl font-serif mb-4">Ordine Ricevuto</h3>
            <p className="text-slate-500 mb-10">Il tuo capo è entrato nel ciclo di produzione "Zero Waste".</p>
            <button 
              onClick={() => navigate('/dashboard')}
              className="px-8 py-3 border border-zinc-900 text-zinc-900 hover:bg-zinc-900 hover:text-white transition-all uppercase tracking-widest text-[10px]"
            >
              Vai alla tua Area Personale
            </button>
          </div>
        )}
      </motion.div>
      </div>

      <div className="mt-20 flex justify-between">
        {step > 1 && step < 6 && (
          <button onClick={handleBack} className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-400 hover:text-zinc-900 transition-all">
            <ChevronLeft size={16} /> Indietro
          </button>
        )}
        {step < 5 && (
          <button 
            disabled={(step === 1 && !config.item) || (step === 2 && !config.color) || (step === 4 && !config.address)}
            onClick={handleNext} 
            className="ml-auto flex items-center gap-2 px-8 py-3 border border-zinc-900 hover:bg-zinc-900 hover:text-white transition-all text-[10px] uppercase tracking-widest disabled:opacity-30"
          >
            Continua <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}