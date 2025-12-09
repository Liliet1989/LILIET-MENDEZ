import { GoogleGenAI, Type, Chat, GenerateContentResponse, LiveServerMessage, Modality } from "@google/genai";

const apiKey = process.env.API_KEY || "";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey });

// System Instructions
const TRIAGE_SYSTEM_INSTRUCTION = `
Eres un asistente de triaje médico avanzado para el HUC (Hospital Universitario de Canarias).
Tu objetivo es realizar una valoración inicial de los síntomas del paciente para determinar la urgencia.
NO PROPORCIONAS DIAGNÓSTICOS MÉDICOS DEFINITIVOS.
1. Identifica banderas rojas (Red Flags) inmediatamente.
2. Clasifica la urgencia (Rojo: Inmediata, Naranja: Muy Urgente, Amarillo: Urgente, Verde: Estándar, Azul: No Urgente).
3. Sé empático pero profesional y conciso.
4. Si hay duda de gravedad, dirige al paciente a Urgencias o llamar al 112.
5. Utiliza herramientas de búsqueda (Google Search) solo si el usuario pregunta por ubicaciones de farmacias u hospitales, o noticias de salud recientes.
6. Utiliza herramientas de mapas (Google Maps) si el usuario pide direcciones específicas.
`;

// --- Chat Service ---

export const createTriageChat = () => {
  return ai.chats.create({
    model: 'gemini-2.5-flash', // Default for speed
    config: {
      systemInstruction: TRIAGE_SYSTEM_INSTRUCTION,
      tools: [{ googleSearch: {} }, { googleMaps: {} }],
      responseModalities: [Modality.TEXT],
    },
  });
};

export const sendMessageWithThinking = async (history: any[], message: string) => {
    // For deep reasoning, we use a one-off generateContent with the pro model and thinking config
    // We manually reconstruct history for the context
    const historyText = history.map(h => `${h.role}: ${h.parts[0].text}`).join('\n');
    const prompt = `${historyText}\nuser: ${message}`;
    
    return await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
            systemInstruction: TRIAGE_SYSTEM_INSTRUCTION,
            thinkingConfig: { thinkingBudget: 16000 }, // Allocate thinking budget
        }
    });
}

// --- Guided Triage Service ---

export const assessGuidedTriage = async (data: {
    symptom: string;
    onsetTime: string;
    onsetType: string;
    evolution: string;
    redFlags: string;
    vitalSigns?: string;
    riskFactors: string[];
}) => {
    const prompt = `
    MODO GUIADO - VALORACIÓN ESTRUCTURADA (MANCHESTER SIMPLIFICADO)
    
    DATOS DEL PACIENTE:
    1. Síntoma Principal: ${data.symptom}
    2. Inicio: ${data.onsetTime} (Tipo: ${data.onsetType})
    3. Evolución: ${data.evolution}
    4. Banderas Rojas/Síntomas asociados: ${data.redFlags}
    5. Signos Vitales (Opcional): ${data.vitalSigns || "No aportados"}
    6. Factores de Riesgo / Antecedentes: ${data.riskFactors.length > 0 ? data.riskFactors.join(', ') : 'Ninguno seleccionado'}

    INSTRUCCIONES ADICIONALES:
    - Interpreta los Factores de Riesgo en contexto (ej. Sintrom/Anticoagulación aumenta riesgo en traumas o sangrados).
    - Si los Signos Vitales indican inestabilidad (ej. SatO2 < 92%, Fiebre > 39ºC, alteración consciencia), eleva la prioridad.
    - Modo Quiosco/Admisión: Sé muy directo en la recomendación.

    FORMATO DE RESPUESTA REQUERIDO (Usa Markdown):
    ### Resumen del caso
    [Resumen breve]

    ### Banderas rojas detectadas
    [SÍ/NO y cuáles]

    ### Nivel de prioridad sugerido
    [Nivel 1 (Crítico) a 5 (No urgente) - Color asociado]

    ### Recomendación inmediata
    [Acción clara: Sala de Espera / Box de Críticos / Consulta Médica]
    
    ### Justificación
    [Breve explicación clínica integrando signos vitales y riesgos]
    
    ---
    *Recordatorio: Esta valoración es orientativa y no sustituye la realizada por un profesional sanitario.*
    `;
    
    return await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
            systemInstruction: TRIAGE_SYSTEM_INSTRUCTION,
            thinkingConfig: { thinkingBudget: 2048 } // Small budget for reasoning
        }
    });
};

// --- Image Analysis ---

export const analyzeImage = async (base64Data: string, mimeType: string, prompt: string) => {
  return await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        { inlineData: { data: base64Data, mimeType } },
        { text: prompt || "Analiza esta imagen médica. Describe lo que ves y si hay signos de alarma visibles. NO diagnostiques." }
      ]
    }
  });
};

// --- Image Generation (Nano Banana Pro / Imagen) ---

export const generateMedicalIllustration = async (prompt: string, aspectRatio: string = "1:1", size: string = "1K") => {
    // Using gemini-3-pro-image-preview for high quality
    // Note: In a real scenario, we might check for paid key for this model
    return await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts: [{ text: prompt }] },
        config: {
            imageConfig: {
                aspectRatio: aspectRatio as any, // "1:1" | "3:4" | "4:3" | "9:16" | "16:9"
                imageSize: size as any // "1K" | "2K" | "4K"
            }
        }
    });
};

// --- Veo Video Generation ---

export const generateVeoVideo = async (prompt: string, imageBase64: string | null = null, mimeType: string = 'image/png') => {
  // Ensure we have a key selected (handled in UI, but good to double check or re-instantiate if needed)
  // For Veo, we re-instantiate to ensure fresh key if changed via window.aistudio
  const veoAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  let operation;
  
  const config = {
    numberOfVideos: 1,
    resolution: '720p',
    aspectRatio: '16:9'
  };

  if (imageBase64) {
    // Image-to-Video
    operation = await veoAi.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      image: {
        imageBytes: imageBase64,
        mimeType: mimeType,
      },
      config: config as any
    });
  } else {
    // Text-to-Video
    operation = await veoAi.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: config as any
    });
  }

  // Polling
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await veoAi.operations.getVideosOperation({ operation: operation });
  }

  const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!videoUri) throw new Error("No video URI returned");
  
  return `${videoUri}&key=${process.env.API_KEY}`;
};


// --- Live API Helpers (Audio) ---

export const connectLiveSession = async (onMessage: (msg: LiveServerMessage) => void, onOpen: () => void, onClose: () => void) => {
    return ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
            },
            systemInstruction: TRIAGE_SYSTEM_INSTRUCTION + " Responde de forma hablada, concisa y calmada.",
            inputAudioTranscription: {}, 
        },
        callbacks: {
            onopen: onOpen,
            onmessage: onMessage,
            onclose: onClose,
            onerror: (err) => console.error("Live API Error:", err),
        }
    });
};

// Utils for Audio
export function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
    for (let i = 0; i < input.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, input[i]));
        output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
}

export function base64ToArrayBuffer(base64: string) {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}