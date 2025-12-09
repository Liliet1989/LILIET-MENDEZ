import React, { useState, useRef } from 'react';
import { generateMedicalIllustration, generateVeoVideo, analyzeImage } from '../services/geminiService';

export const GenerativeTools: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'image' | 'video' | 'analyze'>('analyze');
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [analysisText, setAnalysisText] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAction = async () => {
    if (!prompt && activeTab !== 'analyze') return;
    setIsLoading(true);
    setResultUrl(null);
    setAnalysisText(null);

    try {
      if (activeTab === 'image') {
        const response = await generateMedicalIllustration(prompt, "1:1", "1K");
        // Extract Image from Nano Banana Pro response (often multiple parts)
        let imgData = null;
        if(response.candidates?.[0]?.content?.parts) {
            for(const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    imgData = part.inlineData.data;
                    break;
                }
            }
        }
        if (imgData) setResultUrl(`data:image/png;base64,${imgData}`);
      } 
      else if (activeTab === 'video') {
        // Check for Veo key
        // Cast window to any to avoid type conflicts if global definition is missing or mismatched
        const win = window as any;
        if (win.aistudio) {
            const hasKey = await win.aistudio.hasSelectedApiKey();
            if (!hasKey) {
                await win.aistudio.openSelectKey();
            }
        }
        
        let imageBase64 = null;
        if (fileInputRef.current?.files?.[0]) {
             const file = fileInputRef.current.files[0];
             imageBase64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
             });
             // Strip prefix
             imageBase64 = imageBase64.split(',')[1];
        }

        const url = await generateVeoVideo(prompt || "Medical visualization", imageBase64);
        setResultUrl(url);
      }
      else if (activeTab === 'analyze') {
         if (fileInputRef.current?.files?.[0]) {
             const file = fileInputRef.current.files[0];
             const reader = new FileReader();
             reader.onloadend = async () => {
                 const base64 = (reader.result as string).split(',')[1];
                 const res = await analyzeImage(base64, file.type, prompt);
                 setAnalysisText(res.text || "");
                 setIsLoading(false);
             }
             reader.readAsDataURL(file);
             return; // Async flow handled inside reader
         }
      }
    } catch (e) {
      console.error(e);
      setAnalysisText("Error al procesar la solicitud. Intente de nuevo.");
    } finally {
      if (activeTab !== 'analyze') setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-chuc-dark/50 rounded-2xl border border-chuc-blue backdrop-blur-sm h-full overflow-y-auto">
      <h2 className="text-2xl font-bold mb-6 text-chuc-neon">Herramientas Generativas (Educación/Análisis)</h2>
      
      <div className="flex space-x-4 mb-6 border-b border-white/10 pb-2">
        <button 
          onClick={() => setActiveTab('analyze')}
          className={`px-4 py-2 rounded-t-lg transition-colors ${activeTab === 'analyze' ? 'bg-chuc-blue text-white' : 'text-gray-400 hover:text-white'}`}
        >
          🔍 Análisis (Gemini 3 Pro)
        </button>
        <button 
          onClick={() => setActiveTab('image')}
          className={`px-4 py-2 rounded-t-lg transition-colors ${activeTab === 'image' ? 'bg-chuc-blue text-white' : 'text-gray-400 hover:text-white'}`}
        >
          🖼️ Generar Imagen (Nano Banana)
        </button>
        <button 
          onClick={() => setActiveTab('video')}
          className={`px-4 py-2 rounded-t-lg transition-colors ${activeTab === 'video' ? 'bg-chuc-blue text-white' : 'text-gray-400 hover:text-white'}`}
        >
          🎥 Generar Video (Veo)
        </button>
      </div>

      <div className="space-y-4">
        {(activeTab === 'video' || activeTab === 'analyze') && (
            <div className="border border-dashed border-gray-500 p-4 rounded-lg text-center">
                <input type="file" ref={fileInputRef} className="block w-full text-sm text-gray-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-chuc-neon file:text-chuc-dark
                  hover:file:bg-white
                " accept="image/*" />
                <p className="text-xs text-gray-400 mt-2">Sube una imagen de referencia (opcional para video, obligatorio para análisis).</p>
            </div>
        )}

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={activeTab === 'analyze' ? "Describe qué quieres saber de la imagen..." : "Describe la imagen o video a generar..."}
          className="w-full bg-black/30 border border-gray-600 rounded-lg p-3 text-white focus:border-chuc-neon focus:ring-1 focus:ring-chuc-neon outline-none"
          rows={3}
        />

        <button 
          onClick={handleAction}
          disabled={isLoading}
          className={`w-full py-3 rounded-lg font-bold flex justify-center items-center ${isLoading ? 'bg-gray-600' : 'bg-chuc-neon text-chuc-dark hover:bg-white'}`}
        >
          {isLoading ? (
            <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Procesando...
            </span>
          ) : "Ejecutar"}
        </button>

        {/* Results */}
        {resultUrl && (
             <div className="mt-6 border border-white/20 rounded-lg p-2 bg-black/40">
                {activeTab === 'video' ? (
                    <video src={resultUrl} controls className="w-full rounded-lg max-h-[400px]" autoPlay loop />
                ) : (
                    <img src={resultUrl} alt="Generated" className="w-full rounded-lg object-contain max-h-[400px]" />
                )}
             </div>
        )}

        {analysisText && (
            <div className="mt-6 p-4 bg-black/40 border border-l-4 border-l-chuc-neon rounded-r-lg text-sm leading-relaxed whitespace-pre-wrap">
                <h3 className="font-bold text-chuc-neon mb-2">Resultado del Análisis:</h3>
                {analysisText}
            </div>
        )}
      </div>
    </div>
  );
};