import React, { useState } from 'react';
import { Referral, ReferralUrgency, ReferralStatus } from '../types';
import { analyzeReferral } from '../services/geminiService';

// --- Constants ---

const SPECIALTIES = [
  'Cardiología', 'Neumología', 'Digestivo / Gastroenterología',
  'Neurología', 'Endocrinología', 'Reumatología', 'Nefrología',
  'Hematología', 'Oncología', 'Dermatología', 'Traumatología / COT',
  'Urología', 'Ginecología', 'Oftalmología', 'ORL', 'Psiquiatría',
  'Cirugía General', 'Cirugía Vascular', 'Angiología', 'Medicina Interna',
];

const URGENCY_CONFIG: Record<ReferralUrgency, { label: string; color: string; bg: string; description: string }> = {
  URGENTE: {
    label: 'Urgente',
    color: 'text-red-400',
    bg: 'bg-red-500/20 border-red-500/50',
    description: 'Atención en < 48h. Patología potencialmente grave.',
  },
  PREFERENTE: {
    label: 'Preferente',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/20 border-yellow-500/50',
    description: 'Atención en 7-15 días. Requiere valoración especializada pronto.',
  },
  NORMAL: {
    label: 'Normal',
    color: 'text-green-400',
    bg: 'bg-green-500/20 border-green-500/50',
    description: 'Atención programada. Sin urgencia inmediata.',
  },
};

const STATUS_CONFIG: Record<ReferralStatus, { label: string; color: string }> = {
  BORRADOR: { label: 'Borrador', color: 'text-gray-400' },
  ENVIADA: { label: 'Enviada', color: 'text-blue-400' },
  ACEPTADA: { label: 'Aceptada', color: 'text-green-400' },
  RESUELTA: { label: 'Resuelta', color: 'text-purple-400' },
};

// --- Sub-components ---

const UrgencyBadge: React.FC<{ urgency: ReferralUrgency }> = ({ urgency }) => {
  const cfg = URGENCY_CONFIG[urgency];
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${cfg.color} ${cfg.bg}`}>
      {cfg.label}
    </span>
  );
};

// --- Main Component ---

interface Props {
  onBack: () => void;
}

type View = 'list' | 'new' | 'detail';

export const ReferralSystem: React.FC<Props> = ({ onBack }) => {
  const [view, setView] = useState<View>('list');
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);

  // Form state
  const [form, setForm] = useState({
    referringDoctor: '',
    healthCenter: '',
    patientAge: '',
    patientSex: 'Hombre' as 'Hombre' | 'Mujer' | 'Otro',
    patientSummary: '',
    specialty: SPECIALTIES[0],
    urgency: 'NORMAL' as ReferralUrgency,
    reasonForReferral: '',
    clinicalInfo: '',
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleFormChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleAnalyzeWithAI = async () => {
    if (!form.reasonForReferral.trim()) {
      setAiError('Por favor, indica el motivo de la interconsulta antes de analizar.');
      return;
    }
    setIsAnalyzing(true);
    setAiResult(null);
    setAiError(null);
    try {
      const response = await analyzeReferral({
        patientAge: parseInt(form.patientAge) || 0,
        patientSex: form.patientSex,
        patientSummary: form.patientSummary,
        reasonForReferral: form.reasonForReferral,
        clinicalInfo: form.clinicalInfo,
        requestedSpecialty: form.specialty,
        urgency: form.urgency,
      });
      const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
      setAiResult(text);
    } catch (err) {
      setAiError('Error al conectar con el servicio de IA. Revisa la clave API.');
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmitReferral = () => {
    if (!form.referringDoctor.trim() || !form.reasonForReferral.trim()) {
      setAiError('El médico remitente y el motivo son obligatorios.');
      return;
    }
    const newReferral: Referral = {
      id: `IC-${Date.now()}`,
      createdAt: new Date(),
      status: 'ENVIADA',
      referringDoctor: form.referringDoctor,
      healthCenter: form.healthCenter,
      patientAge: parseInt(form.patientAge) || 0,
      patientSex: form.patientSex,
      patientSummary: form.patientSummary,
      specialty: form.specialty,
      urgency: form.urgency,
      reasonForReferral: form.reasonForReferral,
      clinicalInfo: form.clinicalInfo,
      aiStructuredReferral: aiResult || undefined,
    };
    setReferrals(prev => [newReferral, ...prev]);
    // Reset
    setForm({
      referringDoctor: '',
      healthCenter: '',
      patientAge: '',
      patientSex: 'Hombre',
      patientSummary: '',
      specialty: SPECIALTIES[0],
      urgency: 'NORMAL',
      reasonForReferral: '',
      clinicalInfo: '',
    });
    setAiResult(null);
    setView('list');
  };

  const handleViewDetail = (referral: Referral) => {
    setSelectedReferral(referral);
    setView('detail');
  };

  const handleUpdateStatus = (id: string, status: ReferralStatus) => {
    setReferrals(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    if (selectedReferral?.id === id) {
      setSelectedReferral(prev => prev ? { ...prev, status } : null);
    }
  };

  // --- Render helpers ---

  const renderMarkdown = (text: string) => {
    return text
      .replace(/### (.*)/g, '<h3 class="text-chuc-neon font-bold mt-4 mb-1 text-sm">$1</h3>')
      .replace(/## (.*)/g, '<h2 class="text-white font-bold mt-4 mb-2">$1</h2>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
      .replace(/```([\s\S]*?)```/g, '<pre class="bg-black/40 border border-white/10 rounded p-3 text-xs font-mono whitespace-pre-wrap my-2 text-gray-300">$1</pre>')
      .replace(/`(.*?)`/g, '<code class="bg-black/30 px-1 rounded text-chuc-neon text-xs">$1</code>')
      .replace(/\n/g, '<br/>');
  };

  // --- VIEWS ---

  if (view === 'new') {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-6 pb-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => { setView('list'); setAiResult(null); setAiError(null); }}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ← Volver
            </button>
            <h2 className="text-xl font-bold text-white">Nueva Interconsulta</h2>
          </div>

          {/* Section: Médico remitente */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
            <h3 className="text-chuc-neon font-semibold text-sm uppercase tracking-widest">Médico Remitente</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Nombre del médico *</label>
                <input
                  type="text"
                  value={form.referringDoctor}
                  onChange={e => handleFormChange('referringDoctor', e.target.value)}
                  placeholder="Dr./Dra. Apellidos"
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-chuc-neon/50"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Centro de salud</label>
                <input
                  type="text"
                  value={form.healthCenter}
                  onChange={e => handleFormChange('healthCenter', e.target.value)}
                  placeholder="CS La Laguna, CS Tacoronte..."
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-chuc-neon/50"
                />
              </div>
            </div>
          </div>

          {/* Section: Paciente */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
            <h3 className="text-chuc-neon font-semibold text-sm uppercase tracking-widest">Datos del Paciente</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Edad</label>
                <input
                  type="number"
                  min={0} max={120}
                  value={form.patientAge}
                  onChange={e => handleFormChange('patientAge', e.target.value)}
                  placeholder="años"
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-chuc-neon/50"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Sexo</label>
                <select
                  value={form.patientSex}
                  onChange={e => handleFormChange('patientSex', e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-chuc-neon/50"
                >
                  <option>Hombre</option>
                  <option>Mujer</option>
                  <option>Otro</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Antecedentes relevantes</label>
              <textarea
                value={form.patientSummary}
                onChange={e => handleFormChange('patientSummary', e.target.value)}
                placeholder="HTA, DM tipo 2, cardiopatía isquémica, alergia a penicilina..."
                rows={2}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-chuc-neon/50 resize-none"
              />
            </div>
          </div>

          {/* Section: Interconsulta */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
            <h3 className="text-chuc-neon font-semibold text-sm uppercase tracking-widest">Datos de la Interconsulta</h3>

            {/* Urgency selector */}
            <div>
              <label className="text-xs text-gray-400 mb-2 block">Urgencia</label>
              <div className="grid grid-cols-3 gap-3">
                {(Object.keys(URGENCY_CONFIG) as ReferralUrgency[]).map(u => {
                  const cfg = URGENCY_CONFIG[u];
                  const isSelected = form.urgency === u;
                  return (
                    <button
                      key={u}
                      onClick={() => handleFormChange('urgency', u)}
                      className={`p-3 rounded-xl border text-left transition-all ${isSelected ? cfg.bg + ' border-opacity-100' : 'bg-black/20 border-white/10 hover:border-white/20'}`}
                    >
                      <div className={`font-bold text-sm ${isSelected ? cfg.color : 'text-gray-300'}`}>{cfg.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{cfg.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Specialty */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Especialidad solicitada *</label>
              <select
                value={form.specialty}
                onChange={e => handleFormChange('specialty', e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-chuc-neon/50"
              >
                {SPECIALTIES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            {/* Reason */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Motivo de la interconsulta *</label>
              <textarea
                value={form.reasonForReferral}
                onChange={e => handleFormChange('reasonForReferral', e.target.value)}
                placeholder="Paciente con dolor torácico atípico de 3 semanas de evolución, sin respuesta a IBP. Se solicita valoración para descartar causa cardíaca..."
                rows={3}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-chuc-neon/50 resize-none"
              />
            </div>

            {/* Clinical info */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Información clínica adicional (exploración, pruebas realizadas)</label>
              <textarea
                value={form.clinicalInfo}
                onChange={e => handleFormChange('clinicalInfo', e.target.value)}
                placeholder="ECG: ritmo sinusal normal. Analítica: troponina negativa. Exploración: sin soplos..."
                rows={3}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-chuc-neon/50 resize-none"
              />
            </div>
          </div>

          {/* AI Analysis */}
          <div className="bg-white/5 border border-chuc-neon/20 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-chuc-neon font-semibold text-sm uppercase tracking-widest">Asistente IA</h3>
              <button
                onClick={handleAnalyzeWithAI}
                disabled={isAnalyzing}
                className="px-4 py-2 bg-chuc-neon text-chuc-dark font-bold text-sm rounded-full hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <span className="w-3 h-3 border-2 border-chuc-dark/30 border-t-chuc-dark rounded-full animate-spin"></span>
                    Analizando...
                  </>
                ) : '✦ Analizar con IA'}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              La IA revisará la especialidad, urgencia, generará el texto estructurado de la interconsulta y sugerirá pruebas previas.
            </p>

            {aiError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
                {aiError}
              </div>
            )}

            {aiResult && (
              <div
                className="bg-black/30 border border-white/10 rounded-xl p-4 text-sm text-gray-300 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(aiResult) }}
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleSubmitReferral}
              className="flex-1 py-3 bg-chuc-neon text-chuc-dark font-bold rounded-full hover:opacity-90 transition-all"
            >
              Enviar Interconsulta
            </button>
            <button
              onClick={() => { setView('list'); setAiResult(null); setAiError(null); }}
              className="px-6 py-3 border border-white/20 text-gray-400 rounded-full hover:border-white/40 hover:text-white transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'detail' && selectedReferral) {
    const r = selectedReferral;
    const statusCfg = STATUS_CONFIG[r.status];
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-6 pb-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('list')} className="text-gray-400 hover:text-white transition-colors">
              ← Volver
            </button>
            <div>
              <h2 className="text-xl font-bold text-white">{r.id}</h2>
              <span className="text-xs text-gray-500">{r.createdAt.toLocaleString('es-ES')}</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <UrgencyBadge urgency={r.urgency} />
              <span className={`text-xs font-semibold ${statusCfg.color}`}>{statusCfg.label}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
              <h3 className="text-chuc-neon text-xs font-semibold uppercase tracking-widest">Remitente</h3>
              <p className="text-white text-sm font-medium">{r.referringDoctor}</p>
              <p className="text-gray-400 text-xs">{r.healthCenter}</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
              <h3 className="text-chuc-neon text-xs font-semibold uppercase tracking-widest">Paciente</h3>
              <p className="text-white text-sm">{r.patientAge} años · {r.patientSex}</p>
              {r.patientSummary && <p className="text-gray-400 text-xs">{r.patientSummary}</p>}
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-chuc-neon text-xs font-semibold uppercase tracking-widest">Interconsulta</h3>
              <span className="text-xs text-gray-400 font-medium">{r.specialty}</span>
            </div>
            <p className="text-sm text-gray-200">{r.reasonForReferral}</p>
            {r.clinicalInfo && (
              <div className="border-t border-white/10 pt-3">
                <p className="text-xs text-gray-500 mb-1">Información clínica</p>
                <p className="text-sm text-gray-300">{r.clinicalInfo}</p>
              </div>
            )}
          </div>

          {r.aiStructuredReferral && (
            <div className="bg-white/5 border border-chuc-neon/20 rounded-2xl p-4">
              <h3 className="text-chuc-neon text-xs font-semibold uppercase tracking-widest mb-3">Análisis IA</h3>
              <div
                className="text-sm text-gray-300 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(r.aiStructuredReferral) }}
              />
            </div>
          )}

          {/* Status update */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-3">Actualizar estado</h3>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(STATUS_CONFIG) as ReferralStatus[]).map(s => (
                <button
                  key={s}
                  onClick={() => handleUpdateStatus(r.id, s)}
                  className={`px-3 py-1 rounded-full text-xs border transition-all ${r.status === s ? 'bg-white/10 border-white/30 text-white font-bold' : 'border-white/10 text-gray-500 hover:border-white/20 hover:text-gray-300'}`}
                >
                  {STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // LIST VIEW
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors text-sm">
            ← Inicio
          </button>
          <div>
            <h2 className="text-2xl font-bold text-white">Interconsultas</h2>
            <p className="text-xs text-gray-500">Atención Primaria → HUC</p>
          </div>
        </div>
        <button
          onClick={() => setView('new')}
          className="px-5 py-2.5 bg-chuc-neon text-chuc-dark font-bold text-sm rounded-full shadow-[0_0_15px_rgba(0,173,239,0.3)] hover:shadow-[0_0_25px_rgba(0,173,239,0.5)] transition-all"
        >
          + Nueva interconsulta
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {([
          { label: 'Total', value: referrals.length, color: 'text-white' },
          { label: 'Urgentes', value: referrals.filter(r => r.urgency === 'URGENTE').length, color: 'text-red-400' },
          { label: 'Enviadas', value: referrals.filter(r => r.status === 'ENVIADA').length, color: 'text-blue-400' },
          { label: 'Resueltas', value: referrals.filter(r => r.status === 'RESUELTA').length, color: 'text-purple-400' },
        ]).map(stat => (
          <div key={stat.label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {referrals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20 opacity-50">
            <div className="text-6xl mb-4">📋</div>
            <p className="text-gray-400 font-medium">No hay interconsultas registradas</p>
            <p className="text-gray-600 text-sm mt-1">Crea tu primera interconsulta con el botón superior</p>
          </div>
        ) : (
          referrals.map(r => (
            <button
              key={r.id}
              onClick={() => handleViewDetail(r)}
              className="w-full text-left bg-white/5 border border-white/10 hover:border-chuc-neon/30 rounded-2xl p-4 transition-all group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-gray-500">{r.id}</span>
                    <UrgencyBadge urgency={r.urgency} />
                    <span className={`text-xs font-semibold ${STATUS_CONFIG[r.status].color}`}>
                      {STATUS_CONFIG[r.status].label}
                    </span>
                  </div>
                  <p className="text-white text-sm font-medium truncate">{r.reasonForReferral}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-chuc-neon">{r.specialty}</span>
                    <span className="text-xs text-gray-500">·</span>
                    <span className="text-xs text-gray-500">{r.patientAge}a · {r.patientSex}</span>
                    <span className="text-xs text-gray-500">·</span>
                    <span className="text-xs text-gray-500">{r.referringDoctor}</span>
                  </div>
                </div>
                <div className="text-gray-600 group-hover:text-chuc-neon transition-colors flex-none">→</div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};
