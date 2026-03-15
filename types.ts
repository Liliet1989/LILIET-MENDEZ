export enum AppMode {
  WELCOME = 'WELCOME',
  CHAT = 'CHAT',
  LIVE_TRIAJE = 'LIVE_TRIAJE',
  TOOLS = 'TOOLS',
  VIDEO_GEN = 'VIDEO_GEN',
  GUIDED = 'GUIDED',
  KIOSK = 'KIOSK',
  REFERRAL = 'REFERRAL'
}

export type ReferralUrgency = 'URGENTE' | 'PREFERENTE' | 'NORMAL';
export type ReferralStatus = 'BORRADOR' | 'ENVIADA' | 'ACEPTADA' | 'RESUELTA';

export interface Referral {
  id: string;
  createdAt: Date;
  status: ReferralStatus;
  referringDoctor: string;
  healthCenter: string;
  patientAge: number;
  patientSex: 'Hombre' | 'Mujer' | 'Otro';
  patientSummary: string;
  specialty: string;
  urgency: ReferralUrgency;
  reasonForReferral: string;
  clinicalInfo: string;
  aiSuggestedSpecialty?: string;
  aiStructuredReferral?: string;
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