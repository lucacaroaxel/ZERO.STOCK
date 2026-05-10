import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

// componente globale per catturare errori di rendering di react ed evitare la pagina bianca di crash
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  // aggiorna lo stato così al prossimo render mostro la fallback ui
  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  // loggo l'errore in console, molto comodo per il debug
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      // se c'è un errore mostro una schermata "calma" e pulita per non spaventare l'utente
      return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6 text-center">
          <div className="max-w-md space-y-6">
            <div className="w-16 h-16 border border-zinc-900 flex items-center justify-center mx-auto text-zinc-900">
              <AlertTriangle size={32} />
            </div>
            <h1 className="text-3xl font-serif">Qualcosa è andato storto</h1>
            <p className="text-slate-500 text-sm leading-relaxed">
              Si è verificato un errore imprevisto. Per favore, ricarica la pagina o contatta il supporto tecnico.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-zinc-900 text-white uppercase tracking-widest text-xs"
            >
              Ricarica Pagina
            </button>
            
            {/* stampo l'errore tecnico ma in piccolo, magari in prod lo tolgo per sicurezza */}
            {this.state.error && (
              <pre className="mt-8 p-4 bg-zinc-100 text-[10px] text-left overflow-auto max-h-40 font-mono text-slate-400">
                {this.state.error.toString()}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;