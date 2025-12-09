import React, { useState } from 'react';
import { AppMode } from './types';
import SymptomGrid from './components/SymptomGrid';
import { ChatInterface } from './components/ChatInterface';
import { LiveInterface } from './components/LiveInterface';
import { GenerativeTools } from './components/GenerativeTools';
import { GuidedTriage } from './components/GuidedTriage';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.WELCOME);
  const [startSymptom, setStartSymptom] = useState<string | null>(null);

  const handleSymptomSelect = (symptom: string) => {
    setStartSymptom(symptom);
    setMode(AppMode.CHAT);
  };

  return (
    <div className="flex flex-col h-screen text-white font-sans selection:bg-chuc-neon selection:text-chuc-dark">
      {/* HEADER */}
      <header className={`flex-none h-16 bg-chuc-dark/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-6 z-50 ${mode === AppMode.KIOSK ? 'bg-chuc-blue' : ''}`}>
        <div 
          className="flex items-center space-x-3 cursor-pointer"
          onClick={() => setMode(AppMode.WELCOME)}
        >
          <div className="w-10 h-10 bg-gradient-to-br from-chuc-neon to-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(0,173,239,0.5)]">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wide leading-none">TRIAJE IA-ASISTE</h1>
            <span className="text-[10px] text-gray-400 font-mono tracking-widest">HUC · SYSTEM v2.5</span>
          </div>
        </div>
        
        <div className="hidden md:flex items-center space-x-4">
             <button 
                onClick={() => setMode(AppMode.WELCOME)}
                className={`px-3 py-1 rounded text-sm ${mode === AppMode.WELCOME ? 'text-chuc-neon font-bold' : 'text-gray-400 hover:text-white'}`}
            >
                Inicio
            </button>
            <button 
                onClick={() => setMode(AppMode.GUIDED)}
                className={`px-3 py-1 rounded text-sm ${mode === AppMode.GUIDED ? 'text-chuc-neon font-bold' : 'text-gray-400 hover:text-white'}`}
            >
                Guiado
            </button>
            <button 
                onClick={() => setMode(AppMode.KIOSK)}
                className={`px-3 py-1 rounded text-sm ${mode === AppMode.KIOSK ? 'text-chuc-neon font-bold' : 'text-gray-400 hover:text-white'}`}
            >
                Quiosco
            </button>
            <button 
                onClick={() => setMode(AppMode.CHAT)}
                className={`px-3 py-1 rounded text-sm ${mode === AppMode.CHAT ? 'text-chuc-neon font-bold' : 'text-gray-400 hover:text-white'}`}
            >
                Chat
            </button>
            <button 
                onClick={() => setMode(AppMode.LIVE_TRIAJE)}
                className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${mode === AppMode.LIVE_TRIAJE ? 'text-red-400 font-bold' : 'text-gray-400 hover:text-red-400'}`}
            >
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                Voz (Live)
            </button>
            <button 
                onClick={() => setMode(AppMode.TOOLS)}
                className={`px-3 py-1 rounded text-sm ${mode === AppMode.TOOLS ? 'text-chuc-neon font-bold' : 'text-gray-400 hover:text-white'}`}
            >
                Herramientas
            </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className={`flex-1 overflow-hidden relative p-4 md:p-6 ${mode === AppMode.KIOSK ? 'bg-[#003A70]' : ''}`}>
        
        {mode === AppMode.WELCOME && (
            <div className="h-full flex flex-col items-center justify-center space-y-8 animate-fade-in">
                <div className="text-center space-y-4 max-w-2xl">
                    <h2 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-chuc-neon">
                        Bienvenido/a al Sistema
                    </h2>
                    <p className="text-lg text-blue-200">
                        Asistente experimental para orientar el nivel de prioridad y detectar banderas rojas.
                        <br/><span className="text-sm opacity-70">No sustituye la valoración médica profesional.</span>
                    </p>
                </div>

                <div className="flex flex-wrap justify-center gap-4">
                    <button 
                        onClick={() => setMode(AppMode.CHAT)}
                        className="px-8 py-4 bg-chuc-neon text-chuc-dark font-bold text-lg rounded-full shadow-[0_0_20px_rgba(0,173,239,0.4)] hover:shadow-[0_0_30px_rgba(0,173,239,0.6)] hover:scale-105 transition-all"
                    >
                        ● Iniciar Triaje
                    </button>
                    <button 
                        onClick={() => setMode(AppMode.GUIDED)}
                        className="px-8 py-4 bg-chuc-blue border border-chuc-neon/50 text-white font-bold text-lg rounded-full shadow-lg hover:bg-chuc-neon hover:text-chuc-dark transition-all"
                    >
                        ● Modo guiado paso a paso
                    </button>
                    <button 
                         onClick={() => setMode(AppMode.LIVE_TRIAJE)}
                         className="px-8 py-4 bg-transparent border-2 border-white/20 text-white font-bold text-lg rounded-full hover:bg-white/10 hover:border-white transition-all"
                    >
                        Modo Voz (Live)
                    </button>
                </div>
                
                 <div className="pt-8 opacity-50 hover:opacity-100 transition-opacity">
                    <button 
                         onClick={() => setMode(AppMode.KIOSK)}
                         className="text-xs uppercase tracking-widest text-gray-400 border border-white/20 px-4 py-2 rounded hover:bg-white/10"
                    >
                        Acceso Modo Quiosco (Admisión)
                    </button>
                 </div>

                <div className="w-full max-w-4xl mt-8">
                    <h3 className="text-center text-sm uppercase tracking-widest text-gray-500 mb-4">Selección Rápida de Síntomas</h3>
                    <SymptomGrid onSelect={handleSymptomSelect} />
                </div>
            </div>
        )}

        {mode === AppMode.CHAT && (
            <div className="h-full max-w-5xl mx-auto">
                 <ChatInterface />
            </div>
        )}
        
        {mode === AppMode.GUIDED && (
            <div className="h-full max-w-5xl mx-auto">
                <GuidedTriage onBack={() => setMode(AppMode.WELCOME)} isKiosk={false} />
            </div>
        )}

        {mode === AppMode.KIOSK && (
            <div className="h-full max-w-6xl mx-auto">
                <GuidedTriage onBack={() => setMode(AppMode.WELCOME)} isKiosk={true} />
            </div>
        )}

        {mode === AppMode.LIVE_TRIAJE && (
             <div className="h-full max-w-3xl mx-auto bg-black/40 rounded-3xl border border-white/10 backdrop-blur-xl">
                 <LiveInterface onClose={() => setMode(AppMode.WELCOME)} />
             </div>
        )}

        {mode === AppMode.TOOLS && (
            <div className="h-full">
                <GenerativeTools />
            </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="flex-none h-12 border-t border-white/5 bg-black/20 flex items-center justify-center text-xs text-gray-500">
        <p>⚠️ Este sistema es orientativo. En caso de emergencia médica grave, llame inmediatamente al 112 o acuda a Urgencias.</p>
      </footer>
    </div>
  );
};

export default App;