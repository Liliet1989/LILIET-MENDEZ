import React, { useState, useRef, useEffect } from 'react';
import { createTriageChat, sendMessageWithThinking } from '../services/geminiService';
import { ChatMessage } from '../types';

interface Props {
  initialSymptom?: string | null;
}

export const ChatInterface: React.FC<Props> = ({ initialSymptom }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: initialSymptom 
        ? `Veo que has seleccionado "${initialSymptom}". Por favor, descríbeme más detalles: ¿desde cuándo te ocurre y con qué intensidad?`
        : "Hola. Soy el asistente de Triaje IA-ASISTE. Por favor, describe brevemente tus síntomas principales. Por ejemplo: 'Tengo dolor en el pecho desde hace 20 minutos'.",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useThinking, setUseThinking] = useState(false);
  
  const chatSessionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatSessionRef.current = createTriageChat();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      let responseText = "";
      let groundingChunks = [];

      if (useThinking) {
        // Use Gemini 3 Pro with Thinking
        const response = await sendMessageWithThinking(messages, input);
        // FIX: Access .text property directly
        responseText = response.text || "";
        groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      } else {
        // Use Gemini 2.5 Flash Chat Session
        const result = await chatSessionRef.current.sendMessage(input);
        // FIX: Access .text property directly
        responseText = result.text || "";
        groundingChunks = result.response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      }

      // Extract URLs from Grounding
      const groundingUrls = groundingChunks.map((c: any) => {
          if (c.web?.uri) return { uri: c.web.uri, title: c.web.title };
          if (c.maps?.uri) return { uri: c.maps.uri, title: c.maps.title || "Ubicación en Maps" };
          return null;
      }).filter(Boolean);

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date(),
        isThinking: useThinking,
        groundingUrls
      };

      setMessages(prev => [...prev, botMsg]);

    } catch (error) {
      console.error(error);
      const errorMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'model',
        text: "Lo siento, ha ocurrido un error al procesar tu solicitud. Por favor, inténtalo de nuevo o acude a urgencias si es grave.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-chuc-dark/30 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-4 rounded-2xl ${
                        msg.role === 'user' 
                        ? 'bg-chuc-blue text-white rounded-br-none' 
                        : 'bg-white/10 border border-white/10 text-gray-100 rounded-bl-none'
                    }`}>
                        {msg.isThinking && (
                            <div className="flex items-center space-x-2 mb-2 text-xs text-chuc-neon uppercase tracking-widest font-bold">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                                </span>
                                <span>Razonamiento Profundo (Pro)</span>
                            </div>
                        )}
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                        
                        {/* Grounding Links */}
                        {msg.groundingUrls && msg.groundingUrls.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-white/10">
                                <p className="text-xs text-gray-400 mb-1">Fuentes / Ubicaciones:</p>
                                <div className="flex flex-wrap gap-2">
                                    {msg.groundingUrls.map((url, idx) => (
                                        <a key={idx} href={url.uri} target="_blank" rel="noreferrer" className="flex items-center text-xs bg-chuc-dark/50 px-2 py-1 rounded hover:bg-chuc-neon hover:text-chuc-dark transition-colors border border-white/20">
                                            🔗 {url.title}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ))}
            {isLoading && (
                 <div className="flex justify-start">
                    <div className="bg-white/5 p-4 rounded-2xl rounded-bl-none flex space-x-2">
                        <div className="w-2 h-2 bg-chuc-neon rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-chuc-neon rounded-full animate-bounce delay-75"></div>
                        <div className="w-2 h-2 bg-chuc-neon rounded-full animate-bounce delay-150"></div>
                    </div>
                 </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-