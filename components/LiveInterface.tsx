import React, { useEffect, useRef, useState } from 'react';
import { connectLiveSession, base64ToArrayBuffer } from '../services/geminiService';
import { LiveServerMessage } from '@google/genai';

interface Props {
  onClose: () => void;
}

export const LiveInterface: React.FC<Props> = ({ onClose }) => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('connecting');
  const [transcript, setTranscript] = useState<string>("");
  
  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const initAudio = async () => {
    try {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true
      }});
      streamRef.current = stream;

      const sessionPromise = connectLiveSession(
        handleServerMessage,
        () => setStatus('connected'),
        () => setStatus('disconnected')
      );
      
      sessionRef.current = sessionPromise;

      // Setup Input Stream
      const inputContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      const source = inputContext.createMediaStreamSource(stream);
      const processor = inputContext.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Convert Float32 to PCM Int16
        const l = inputData.length;
        const int16 = new Int16Array(l);
        for (let i = 0; i < l; i++) {
          int16[i] = inputData[i] * 32768;
        }
        
        // Send to Gemini
        const uint8 = new Uint8Array(int16.buffer);
        const b64 = btoa(String.fromCharCode(...uint8));
        
        sessionPromise.then(session => {
            session.sendRealtimeInput({
                media: {
                    mimeType: 'audio/pcm;rate=16000',
                    data: b64
                }
            });
        });
      };

      source.connect(processor);
      processor.connect(inputContext.destination);
      
      sourceRef.current = source;
      processorRef.current = processor;

    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  const handleServerMessage = async (msg: LiveServerMessage) => {
    // Handle Audio Output
    const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (audioData && audioContextRef.current) {
      const ctx = audioContextRef.current;
      const buffer = base64ToArrayBuffer(audioData);
      
      // Decode raw PCM (assumed 24kHz from model config)
      const dataInt16 = new Int16Array(buffer);
      const audioBuffer = ctx.createBuffer(1, dataInt16.length, 24000);
      const channelData = audioBuffer.getChannelData(0);
      for(let i=0; i<dataInt16.length; i++) {
          channelData[i] = dataInt16[i] / 32768.0;
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      
      const startTime = Math.max(ctx.currentTime, nextStartTimeRef.current);
      source.start(startTime);
      nextStartTimeRef.current = startTime + audioBuffer.duration;
    }

    // Handle Transcript
    if (msg.serverContent?.modelTurn?.parts?.[0]?.text) {
        setTranscript(prev => prev + msg.serverContent?.modelTurn?.parts?.[0]?.text);
    }
  };

  useEffect(() => {
    initAudio();
    return () => {
        // Cleanup
        streamRef.current?.getTracks().forEach(t => t.stop());
        processorRef.current?.disconnect();
        sourceRef.current?.disconnect();
        audioContextRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-8">
      <div className={`relative w-48 h-48 rounded-full flex items-center justify-center border-4 ${status === 'connected' ? 'border-chuc-neon animate-pulse-slow' : 'border-red-500'}`}>
        <div className={`w-40 h-40 rounded-full ${status === 'connected' ? 'bg-chuc-neon opacity-20' : 'bg-red-500 opacity-20'} animate-ping absolute`}></div>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-white relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      </div>
      
      <div>
        <h2 className="text-2xl font-bold mb-2">
          {status === 'connecting' && "Conectando..."}
          {status === 'connected' && "Escuchando..."}
          {status === 'error' && "Error de conexión"}
        </h2>
        <p className="text-blue-200 max-w-md mx-auto">
          Habla claramente sobre tus síntomas. El asistente de voz te responderá en tiempo real.
        </p>
        {transcript && (
            <div className="mt-4 p-4 bg-black/20 rounded-lg max-w-lg text-sm text-left font-mono">
                {transcript}
            </div>
        )}
      </div>

      <button 
        onClick={onClose}
        className="px-8 py-3 bg-red-600 hover:bg-red-700 rounded-full font-bold shadow-lg shadow-red-900/50 transition-all"
      >
        Finalizar Llamada
      </button>
    </div>
  );
};