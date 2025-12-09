export enum AppMode {
  WELCOME = 'WELCOME',
  CHAT = 'CHAT',
  LIVE_TRIAJE = 'LIVE_TRIAJE',
  TOOLS = 'TOOLS',
  VIDEO_GEN = 'VIDEO_GEN',
  GUIDED = 'GUIDED',
  KIOSK = 'KIOSK'
}

export interface SymptomCardData {
  id: string;
  title: string;
  icon: string;
  redFlags: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: Date;
  isThinking?: boolean;
  groundingUrls?: Array<{uri: string, title: string}>;
  type?: 'text' | 'image' | 'video';
  mediaUrl?: string;
}

export interface VideoGenerationState {
  isGenerating: boolean;
  progressMessage: string;
  videoUrl: string | null;
}

// Global declaration for Veo Key Selection
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}