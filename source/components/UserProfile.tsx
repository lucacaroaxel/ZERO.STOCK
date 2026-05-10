import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, MapPin, Phone, Ruler, Weight, Package, Edit2, Check, X, ShieldCheck, ExternalLink, Trash2, Camera, Upload, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { uploadToIPFS, updateBlockchainStatus } from '../services/web3Service';

// label degli stati che matchano perfettamente l'enum fsm dello smart contract
const STATUS_LABELS = ['Ordinato', 'In Taglio', 'Cucitura', 'Spedito'];

// helper per mostrare la foto caricata dall'admin, con fallback se il gateway ipfs è lento
const IPFSImage = ({ cid, localImage }: { cid: string, localImage?: string }) => {
  const [hasError, setHasError] = useState(false);
  // uso dweb.link per i test pubblici, ma in prod andrebbe usato il gateway dedicato di pinata
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
            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
            referrerPolicy="no-referrer"
            onError={() => setHasError(true)}
          />
          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/40 transition-all duration-700 flex items-center justify-center opacity-0 group-hover/img:opacity-100">
            <ExternalLink size={20} className="text-white" />
          </div>
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-zinc-50 border border-zinc-100 p-2 text-center">
          <span className="text-[8px] uppercase tracking-widest text-slate-400">
            Immagine crittografata su IPFS in caricamento...
          </span>
        </div>
      )}
    </a>
  );
};

export default function UserProfile({ user }: { user: any }) {
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({
    name: '',
    surname: '',
    city: '',
    country: '',
    phone: '',
    height: 0,
    weight: 0
  });

  // stati per la gestione lato admin (sartoria)
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  // funzione comoda per svuotare il db locale durante le prove per la tesi
  const clearCache = () => {
    localStorage.removeItem('zero-stock-orders');
    setOrders([]);
    setSelectedOrder(null);
  };

  // converto l'immagine al volo per la preview locale, così la ui è reattiva mentre ipfs carica
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // cuore dell'infrastruttura dual-layer: pin su ipfs + notarizzazione on-chain
  const handleUpdate = async () => {
    if (!selectedOrder || !file) return;
    
    setUpdateLoading(true);
    setUpdateSuccess(false);
    setLastTxHash(null);
    
    try {
      // 0. Convert file to base64 per instant preview
      const localImageBase64 = await fileToBase64(file);

      // 1. Caricamento fisico su rete IPFS via API Pinata
      const cid = await uploadToIPFS(file);
      if (!cid) throw new Error("Errore caricamento IPFS");

      // 2. Firma transazione su Blockchain (updateStatus)
      const nextStatus = selectedOrder.status + 1;
      const txHash = await updateBlockchainStatus(Number(selectedOrder.id), nextStatus, cid);
      
      if (txHash) {
        setLastTxHash(txHash);
        const adminName = `${profile.name} ${profile.surname}`;
        
        // 3. Aggiornamento Locale (localStorage) per sincronizzazione PoC
        const existingOrders = JSON.parse(localStorage.getItem('zero-stock-orders') || '[]');
        const updatedOrders = existingOrders.map((o: any) => {
          if (o.id === selectedOrder.id) {
            return { 
              ...o, 
              status: nextStatus, 
              ipfsCid: cid,
              localImage: localImageBase64,
              txHash: txHash,
              adminName: adminName,
              history: [...(o.history || []), { 
                status: nextStatus, 
                timestamp: new Date().toLocaleString(), 
                ipfsCid: cid,
                localImage: localImageBase64,
                txHash: txHash,
                adminName: adminName
              }]
            };
          }
          return o;
        });
        
        localStorage.setItem('zero-stock-orders', JSON.stringify(updatedOrders));
        
        // aggiorno lo stato locale e gestisco i permessi di visibilità
        const isAdminUser = profile?.role === 'admin' || profile?.email?.toLowerCase().includes('@admin') || user.role === 'admin' || user.email?.toLowerCase().includes('@admin');
        const userOrders = isAdminUser 
          ? updatedOrders 
          : updatedOrders.filter((o: any) => o.customerEmail === user.email);
        
        setOrders(userOrders.sort((a: any, b: any) => b.timestamp - a.timestamp));
        setSelectedOrder(updatedOrders.find((o: any) => o.id === selectedOrder.id));
        setUpdateSuccess(true);
        setFile(null);
      } else {
        throw new Error("Transazione fallita o rifiutata");
      }
    } catch (err) {
      console.error("Errore durante l'aggiornamento:", err);
      alert("Errore durante l'aggiornamento. Riprova.");
    } finally {
      setUpdateLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // mock del db utenti nel localstorage per la demo
        const savedUser = JSON.parse(localStorage.getItem('zero-stock-user') || '{}');
        
        if (savedUser && savedUser.uid) {
          setProfile(savedUser);
          setEditData({
            name: savedUser.name || '',
            surname: savedUser.surname || '',
            city: savedUser.city || '',
            country: savedUser.country || '',
            phone: savedUser.phone || '',
            height: savedUser.height || 0,
            weight: savedUser.weight || 0,
            uid: savedUser.uid,
            role: savedUser.role,
            email: savedUser.email
          });
        } else {
          // fallback se non c'è nulla di salvato
          const initialData = {
            ...user,
            country: 'Italia',
            city: 'Milano',
            phone: '',
            height: 0,
            weight: 0
          };
          setProfile(initialData);
          setEditData({
            name: initialData.name || '',
            surname: initialData.surname || '',
            city: initialData.city || '',
            country: initialData.country || '',
            phone: initialData.phone || '',
            height: initialData.height || 0,
            weight: initialData.weight || 0,
            uid: initialData.uid,
            role: initialData.role,
            email: initialData.email
          });
        }

        // fetch degli ordini sempre dal localstorage
        const savedOrders = JSON.parse(localStorage.getItem('zero-stock-orders') || '[]');
        
        const isAdminUser = savedUser?.role === 'admin' || savedUser?.email?.toLowerCase().includes('@admin') || user.role === 'admin' || user.email?.toLowerCase().includes('@admin');

        // rbac rudimentale: se sei admin vedi tutti gli ordini, se utente solo i tuoi
        const userOrders = isAdminUser 
          ? savedOrders.filter((o: any) => !o.closed)
          : savedOrders.filter((o: any) => o.customerEmail === user.email && !o.closed);
        
        setOrders(userOrders.sort((a: any, b: any) => b.timestamp - a.timestamp));
      } catch (err) {
        console.error("Errore caricamento dati:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleSave = async () => {
    if (editData.phone && !/^\d{10}$/.test(editData.phone)) {
      alert("Il numero di telefono deve essere composto esattamente da 10 cifre.");
      return;
    }

    try {
      // faccio il merge dei dati per non droppare ruolo ed email
      const updatedProfile = { 
        ...profile, 
        ...editData 
      };

      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProfile)
      });
      if (res.ok) {
        const updated = await res.json();
        const finalUser = updated.user || updated;
        setProfile(finalUser);
        localStorage.setItem('zero-stock-user', JSON.stringify(finalUser));
        setIsEditing(false);
      }
    } catch (err) {
      console.error("Errore salvataggio:", err);
    }
  };

  const handleReceiveOrder = (orderId: string) => {
    if (window.confirm("Cliccando questo pulsante confermerai la ricezione dell'ordine e sarà chiuso.")) {
      const existingOrders = JSON.parse(localStorage.getItem('zero-stock-orders') || '[]');
      const updatedOrders = existingOrders.map((o: any) => {
        if (o.id === orderId) {
          return { ...o, closed: true };
        }
        return o;
      });
      localStorage.setItem('zero-stock-orders', JSON.stringify(updatedOrders));
      
      setOrders(orders.filter(o => o.id !== orderId));
    }
  };

  if (loading || !profile) return <div className="py-20 text-center uppercase tracking-widest text-xs text-slate-400">Caricamento...</div>;

  const isAdmin = profile?.role === 'admin' || profile?.email?.toLowerCase().includes('@admin');

  return (
    <div className="max-w-5xl mx-auto py-20 px-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
        
        {/* Sidebar Profilo */}
        <div className="lg:col-span-1">
          <div className="bg-white p-8 border border-zinc-100 text-center relative shadow-sm">
            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-900 transition-all"
                title="Modifica Profilo"
              >
                <Edit2 size={16} />
              </button>
            )}

            <div className="w-24 h-24 bg-zinc-50 rounded-full mx-auto mb-6 flex items-center justify-center text-zinc-300 border border-zinc-100">
              <User size={32} />
            </div>
            
            {isEditing ? (
              <div className="space-y-4 mb-6">
                <input 
                  className="w-full text-center border-b border-zinc-200 focus:border-zinc-900 outline-none p-2 font-serif text-xl transition-colors"
                  value={editData.name}
                  placeholder="Nome"
                  onChange={e => setEditData({...editData, name: e.target.value})}
                />
                <input 
                  className="w-full text-center border-b border-zinc-200 focus:border-zinc-900 outline-none p-2 font-serif text-xl transition-colors"
                  value={editData.surname}
                  placeholder="Cognome"
                  onChange={e => setEditData({...editData, surname: e.target.value})}
                />
              </div>
            ) : (
              <h2 className="text-2xl font-serif mb-1">{profile.name} {profile.surname}</h2>
            )}
            
            <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-8">Membro dal 2026</p>
            
            <div className="space-y-5 text-left border-t border-zinc-100 pt-8">
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <MapPin size={16} className="text-zinc-400 shrink-0" />
                {isEditing ? (
                  <div className="flex gap-3 w-full">
                    <input 
                      className="w-1/2 border-b border-zinc-200 focus:border-zinc-900 outline-none p-1 transition-colors"
                      value={editData.city}
                      placeholder="Città"
                      onChange={e => setEditData({...editData, city: e.target.value})}
                    />
                    <input 
                      className="w-1/2 border-b border-zinc-200 focus:border-zinc-900 outline-none p-1 transition-colors"
                      value={editData.country}
                      placeholder="Nazione"
                      onChange={e => setEditData({...editData, country: e.target.value})}
                    />
                  </div>
                ) : (
                  <span>{profile.city || 'Città non impostata'}, {profile.country || 'Nazione'}</span>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <Phone size={16} className="text-zinc-400 shrink-0" />
                {isEditing ? (
                  <input 
                    className="w-full border-b border-zinc-200 focus:border-zinc-900 outline-none p-1 transition-colors"
                    value={editData.phone}
                    placeholder="Numero di telefono (10 cifre)"
                    onChange={e => setEditData({...editData, phone: e.target.value})}
                  />
                ) : (
                  <span>{profile.phone || 'Nessun telefono'}</span>
                )}
              </div>
            </div>

            {isEditing && (
              <div className="mt-8 flex gap-3">
                <button 
                  onClick={() => { setIsEditing(false); setEditData(profile); }}
                  className="flex-1 py-3 border border-zinc-200 text-zinc-500 text-[10px] uppercase tracking-widest hover:bg-zinc-50 transition-colors"
                >
                  Annulla
                </button>
                <button 
                  onClick={handleSave}
                  className="flex-1 py-3 bg-zinc-900 text-white text-[10px] uppercase tracking-widest hover:bg-zinc-800 transition-colors"
                >
                  Salva
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Dettagli e Ordini */}
        <div className="lg:col-span-2 space-y-12">
          
          {/* Storico Ordini */}
          <section>
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-sm uppercase tracking-[0.3em] text-slate-400">
                Ordini attivi
              </h3>
              <button 
                onClick={clearCache}
                className="flex items-center gap-2 text-xs text-red-500 hover:text-red-700 transition-colors"
              >
                <Trash2 size={14} /> Svuota Cache
              </button>
            </div>
            <div className="space-y-6">
              {orders.length > 0 ? orders.map((order) => (
                <motion.div 
                  key={order.id}
                  whileHover={{ y: -2 }}
                  className="p-8 border border-zinc-100 bg-white shadow-sm relative overflow-hidden group"
                >
                  {/* Badge visuale che rassicura sulla transazione evm */}
                  {order.txHash && (
                    <div className="absolute top-0 right-0 bg-green-50 text-green-700 px-4 py-1 border-l border-b border-green-100 flex items-center gap-2 z-10">
                      <ShieldCheck size={12} className="animate-pulse" />
                      <span className="text-[8px] uppercase tracking-widest font-bold">Verificato su Blockchain</span>
                    </div>
                  )}

                  <div className="flex flex-col md:flex-row gap-8">
                    <div className="w-full md:w-32 h-32 bg-zinc-50 flex items-center justify-center text-zinc-400 overflow-hidden border border-zinc-100 shrink-0 relative group/img">
                      {order.ipfsCid ? (
                        <IPFSImage cid={order.ipfsCid} localImage={order.localImage} />
                      ) : (
                        <Package size={32} className="opacity-20" />
                      )}
                    </div>
                    
                    <div className="flex-grow space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] uppercase tracking-widest text-slate-400">Ordine #{order.id}</span>
                          <h4 className="font-serif text-xl mt-1">{order.item}</h4>
                          <p className="text-xs text-slate-500 uppercase tracking-widest">{order.color} • Taglia {order.size}</p>
                          {isAdmin && order.customer && (
                            <div className="mt-3 pt-3 border-t border-dashed border-zinc-200">
                              <p className="text-[10px] text-zinc-900 font-bold uppercase tracking-widest">
                                {order.customer.name} {order.customer.surname}
                              </p>
                              <p className="text-[10px] text-slate-500 italic mt-1">
                                {order.address || 'Indirizzo non specificato'}
                              </p>
                              <p className="text-[10px] text-slate-500 font-mono mt-1">
                                {order.customer.phone || 'Telefono non specificato'}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <span className={cn(
                            "text-[10px] uppercase tracking-widest font-bold block mb-1 px-2 py-1",
                            order.status === 3 ? "bg-green-900 text-white" : "bg-zinc-100 text-zinc-900"
                          )}>
                            {STATUS_LABELS[order.status]}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(order.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar logica fsm */}
                      <div className="pt-2">
                        <div className="flex justify-between text-[8px] uppercase tracking-widest text-slate-400 mb-2">
                          {STATUS_LABELS.map((label, idx) => (
                            <span key={idx} className={cn(idx <= order.status ? "text-zinc-900 font-bold" : "")}>
                              {label}
                            </span>
                          ))}
                        </div>
                        <div className="h-1 bg-zinc-100 w-full rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(order.status / (STATUS_LABELS.length - 1)) * 100}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-zinc-900"
                          />
                        </div>
                      </div>

                      {order.txHash && (
                        <div className="pt-4 border-t border-zinc-50 space-y-2">
                          {order.adminName && (
                            <div className="mb-2 p-2 bg-zinc-50 border-l-2 border-zinc-900">
                              <p className="text-[8px] uppercase tracking-widest text-slate-400">Firmato on-chain da:</p>
                              <p className="text-[10px] font-bold text-zinc-900">{order.adminName}</p>
                            </div>
                          )}
                          <div className="flex justify-between items-center text-[9px] uppercase tracking-widest text-slate-400">
                            <span>Transaction Hash</span>
                            <a 
                              href={`https://sepolia.etherscan.io/tx/${order.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-zinc-900 hover:underline"
                            >
                              Etherscan <ExternalLink size={10} />
                            </a>
                          </div>
                          <code className="text-[9px] font-mono break-all text-slate-500 block bg-zinc-50 p-2 border border-zinc-100">
                            {order.txHash}
                          </code>
                        </div>
                      )}

                      {!isAdmin && order.status === 3 && (
                        <div className="pt-4 border-t border-zinc-100 mt-4">
                          <button
                            onClick={() => handleReceiveOrder(order.id)}
                            className="w-full py-4 bg-green-900 text-white uppercase tracking-widest text-[10px] hover:bg-green-800 transition-all flex items-center justify-center gap-2"
                          >
                            <CheckCircle2 size={14} /> Ho ricevuto l'ordine
                          </button>
                        </div>
                      )}

                      {/* form di update visibile solo lato sartoria */}
                      {isAdmin && order.status < 3 && (
                        <div className="pt-4 border-t border-zinc-100 mt-4">
                          <h4 className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">
                            Aggiorna Stato: <span className="text-zinc-900 font-bold">{STATUS_LABELS[order.status + 1]}</span>
                          </h4>
                          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                            <div className="relative border border-dashed border-zinc-300 p-4 flex-grow text-center hover:border-zinc-500 transition-all w-full">
                              <input 
                                type="file" 
                                accept=".jpeg,.jpg,.png"
                                onChange={(e) => {
                                  setFile(e.target.files?.[0] || null);
                                  setSelectedOrder(order);
                                  setUpdateSuccess(false);
                                }}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                              />
                              {file && selectedOrder?.id === order.id ? (
                                <div className="flex items-center justify-center gap-2 text-sm text-green-600">
                                  <CheckCircle2 size={16} /> {file.name}
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                                  <Camera size={16} /> Carica foto prova (.jpg, .png)
                                </div>
                              )}
                            </div>
                            <button
                              disabled={!file || selectedOrder?.id !== order.id || updateLoading}
                              onClick={handleUpdate}
                              className={cn(
                                "px-6 py-4 bg-zinc-900 text-white uppercase tracking-widest text-[10px] transition-all flex items-center gap-2 whitespace-nowrap w-full sm:w-auto justify-center",
                                (!file || selectedOrder?.id !== order.id || updateLoading) && "opacity-50 cursor-not-allowed"
                              )}
                            >
                              {updateLoading && selectedOrder?.id === order.id ? "Elaborazione..." : "Firma on-chain"}
                              <Upload size={14} />
                            </button>
                          </div>
                          {updateSuccess && selectedOrder?.id === order.id && (
                            <div className="mt-2 text-[10px] text-green-600 uppercase tracking-widest flex items-center gap-1">
                              <CheckCircle2 size={12} /> Aggiornamento completato
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )) : (
                <div className="py-20 border border-dashed border-zinc-200 text-center bg-white/50">
                  <Package size={48} className="mx-auto mb-4 opacity-10" />
                  <p className="text-[10px] uppercase tracking-widest text-slate-400">Nessun ordine effettuato</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}