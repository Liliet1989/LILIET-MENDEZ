import React, { useState } from 'react';
import { assessGuidedTriage } from '../services/geminiService';

interface Props {
  onBack: () => void;
  isKiosk?: boolean;
}

const RISK_FACTORS_LIST = [
  "Hipertensión", "Diabetes", "Cardiopatía", "Asma/EPOC", 
  "Inmunosupresión", "Embarazo", "Anticoagulación", "Alergias graves", "Edad > 65 años"
];

const SYMPTOM_CATEGORIES = [
  "Dolor Torácico",
  "Dificultad Respiratoria",
  "Fiebre / Escalofríos",
  "Mareo o Desmayo",
  "Dolor Abdominal",
  "Traumatismos"
];

const RED_FLAG_PROTOCOLS: Record<string, { title: string; checks: string[] }> = {
  "Dolor Torácico": {
    title: "Evaluaremos si hay características de alarma cardíaca:",
    checks: [
      "Dolor opresivo (como un peso) o irradiado a brazo/mandíbula",
      "Náuseas o sudor frío profuso",
      "Disnea (sensación de falta de aire)",
      "Antecedentes de riesgo cardiovascular importantes"
    ]
  },
  "Dificultad Respiratoria": {
    title: "Confirmaré si existe dificultad respiratoria grave:",
    checks: [
      "Imposibilidad de hablar con frases completas",
      "Ruidos al respirar (sibilancias/estridor)",
      "Coloración azulada en labios o dedos",
      "Empeoramiento muy rápido en minutos"
    ]
  },
  "Fiebre / Escalofríos": {
    title: "Exploraré sospecha de infección grave o sepsis:",
    checks: [
      "Confusión o desorientación mental",
      "Taquipnea (respiración muy rápida)",
      "Escalofríos intensos con temblor",
      "Manchas en la piel que no desaparecen al presionar"
    ]
  },
  "Mareo o Desmayo": {
    title: "Preguntaré por signos neurológicos (Posible Ictus):",
    checks: [
      "Debilidad brusca en un lado del cuerpo",
      "Habla alterada o dificultad para entender",
      "Pérdida de consciencia completa (desmayo)",
      "Visión doble o pérdida de visión brusca"
    ]
  },
  "Dolor Abdominal": {
    title: "Buscaré signos de abdomen agudo:",
    checks: [
      "Rigidez abdominal (vientre duro como una tabla)",
      "Vómitos persistentes o con sangre",
      "Fiebre alta (>38.5ºC)",
      "Heces negras o con sangre"
    ]
  },
  "Traumatismos": {
    title: "Evaluaremos gravedad del trauma:",
    checks: [
      "Golpe craneal con vómitos o sueño excesivo",
      "Déficit neurológico (no mueve bien una extremidad)",
      "Deformidad evidente en huesos",
      "Hemorragia activa que no cesa"
    ]
  }
};

export const GuidedTriage: React.FC<Props> = ({ onBack, isKiosk = false }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    symptomCategory: '', // For UI logic
    symptom: '',
    onsetTime: '',
    onsetType: '', // Brusco / Progresivo
    evolution: '', // Mejorando / Estable / Empeorando
    redFlags: '', // Text description
    selectedRedFlags: [] as string[], // Checkbox selections
    riskFactors: [] as string[],
    vitals: {
        satO2: '',
        temp: '',
        breathing: '', // phrases
        conscience: '',
        bleeding: ''
    }
  });

  const totalSteps = 6;

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    setLoading(true);
    setStep(7); // Go to loading/result view
    
    // Combine manual text and selected checkboxes
    const combinedRedFlags = [
        ...formData.selectedRedFlags, 
        formData.redFlags
    ].filter(Boolean).join('. ');

    // Compile Vitals string
    const vitalsArr = [];
    if (formData.vitals.satO2) vitalsArr.push(`SatO2: ${formData.vitals.satO2}%`);
    if (formData.vitals.temp) vitalsArr.push(`Temperatura: ${formData.vitals.temp}ºC`);
    if (formData.vitals.breathing) vitalsArr.push(`Respiración: ${formData.vitals.breathing}`);
    if (formData.vitals.conscience) vitalsArr.push(`Consciencia: ${formData.vitals.conscience}`);
    if (formData.vitals.bleeding) vitalsArr.push(`Sangrado: ${formData.vitals.bleeding}`);

    const payload = {
        ...formData,
        redFlags: combinedRedFlags || "Ninguna bandera roja reportada.",
        vitalSigns: vitalsArr.join(', '),
    };

    try {
        const response = await assessGuidedTriage(payload);
        // FIX: Access .text property directly, do not call .response.text()
        const text = response.text || "No se pudo generar una respuesta.";
        setResult(text);
    } catch (e) {
        console.error(e);
        setResult("Error al procesar. Por favor, intente nuevamente o acuda a urgencias.");
    } finally {
        setLoading(false);
    }
  };

  const toggleRiskFactor = (factor: string) => {
    setFormData(prev => ({
        ...prev,
        riskFactors: prev.riskFactors.includes(factor) 
            ? prev.riskFactors.filter(f => f !== factor)
            : [...prev.riskFactors, factor]
    }));
  };

  const toggleRedFlag = (flag: string) => {
    setFormData(prev => ({
        ...prev,
        selectedRedFlags: prev.selectedRedFlags.includes(flag)
            ? prev.selectedRedFlags.filter(f => f !== flag)
            : [...prev.selectedRedFlags, flag]
    }));
  };

  const selectCategory = (cat: string) => {
    setFormData(prev => ({ ...prev, symptomCategory: cat, symptom: cat }));
    // In Kiosk mode, auto-advance on selection
    if (isKiosk) {
        setFormData(prev => ({ ...prev, symptomCategory: cat, symptom: cat }));
        // Using a timeout to allow state to settle, though in React 18+ strict mode this might be batched
        setTimeout(() => setStep(2), 150);
    }
  };

  // Kiosk specific styles
  const btnClass = isKiosk 
    ? "p-6 text-xl font-bold rounded-2xl border-2 shadow-lg transition-transform active:scale-95" 
    : "p-4 rounded-xl border text-sm font-medium transition-all";
  
  const activeBtnClass = isKiosk
    ? "bg-chuc-neon text-chuc-dark border-white scale-105"
    : "bg-chuc-neon text-chuc-dark border-white shadow-[0_0_15px_rgba(0,173,239,0.5)]";
    
  const inactiveBtnClass = isKiosk
    ? "bg-white/10 border-white/20 hover:bg-white/20 text-white"
    : "bg-black/20 border-white/10 hover:bg-white/10 text-gray-300";

  const renderStep = () => {
    switch(step) {
        case 1:
            return (
                <div className="space-y-6 animate-fade-in">
                    <h2 className={`font-bold text-chuc-neon ${isKiosk ? 'text-4xl text-center mb-8' : 'text-2xl'}`}>
                        {isKiosk ? "¿En qué puedo ayudarte hoy?" : "PASO 1: Síntoma Principal"}
                    </h2>
                    {!isKiosk && <p className="text-lg text-gray-300">Selecciona la categoría que mejor describe tu problema o descríbelo:</p>}
                    
                    <div className={`grid gap-4 mb-4 ${isKiosk ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2 md:grid-cols-3'}`}>
                        {SYMPTOM_CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                onClick={() => selectCategory(cat)}
                                className={`${btnClass} ${formData.symptomCategory === cat ? activeBtnClass : inactiveBtnClass}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {!isKiosk && (
                        <div className="relative">
                            <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Otro / Descripción detallada</label>
                            <input 
                                type="text" 
                                value={formData.symptom}
                                onChange={e => setFormData({...formData, symptom: e.target.value, symptomCategory: 'Otro'})}
                                className="w-full p-4 bg-black/30 border border-white/20 rounded-xl focus:border-chuc-neon outline-none text-lg"
                                placeholder="Ej: Dolor de cabeza intenso..."
                            />
                        </div>
                    )}

                    <div className="pt-4 flex justify-between">
                        <button onClick={onBack} className="text-gray-400 hover:text-white px-4 py-2">Cancelar</button>
                        {!isKiosk && (
                            <button 
                                onClick={nextStep}
                                disabled={!formData.symptom}
                                className="bg-chuc-neon text-chuc-dark font-bold px-8 py-3 rounded-full disabled:opacity-50 hover:scale-105 transition-all"
                            >
                                Siguiente ➔
                            </button>
                        )}
                        {isKiosk && (
                             <button 
                                onClick={nextStep}
                                disabled={!formData.symptom}
                                className="bg-chuc-neon text-chuc-dark font-bold px-8 py-4 rounded-full disabled:opacity-50 text-xl"
                             >
                                Otro motivo / Continuar
                             </button>
                        )}
                    </div>
                </div>
            );
        case 2:
            return (
                <div className="space-y-6 animate-fade-in">
                    <h2 className={`font-bold text-chuc-neon ${isKiosk ? 'text-3xl text-center' : 'text-2xl'}`}>PASO 2: Inicio</h2>
                    
                    <div>
                        <p className={`mb-2 text-gray-300 ${isKiosk ? 'text-xl text-center' : ''}`}>¿Cuándo comenzó el síntoma?</p>
                        <input 
                            type="text" 
                            value={formData.onsetTime}
                            onChange={e => setFormData({...formData, onsetTime: e.target.value})}
                            className={`w-full p-4 bg-black/30 border border-white/20 rounded-xl focus:border-chuc-neon outline-none ${isKiosk ? 'text-2xl text-center' : ''}`}
                            placeholder="Ej: Hace 20 minutos, esta madrugada..."
                        />
                    </div>

                    <div>
                         <p className={`mb-2 text-gray-300 ${isKiosk ? 'text-xl text-center mt-6' : ''}`}>¿Cómo apareció?</p>
                        <div className="flex gap-4">
                            {['Brusco (De repente)', 'Progresivo (Poco a poco)'].map(type => (
                                <button
                                    key={type}
                                    onClick={() => setFormData({...formData, onsetType: type})}
                                    className={`flex-1 ${btnClass} ${formData.onsetType === type ? activeBtnClass : inactiveBtnClass}`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 flex justify-between">
                        <button onClick={prevStep} className="text-gray-400 hover:text-white px-4 py-2">Atrás</button>
                        <button 
                            onClick={nextStep}
                            disabled={!formData.onsetTime || !formData.onsetType}
                            className={`bg-chuc-neon text-chuc-dark font-bold rounded-full disabled:opacity-50 hover:scale-105 transition-all ${isKiosk ? 'px-12 py-4 text-xl' : 'px-8 py-3'}`}
                        >
                            Siguiente ➔
                        </button>
                    </div>
                </div>
            );
        case 3:
            return (
                 <div className="space-y-6 animate-fade-in">
                    <h2 className={`font-bold text-chuc-neon ${isKiosk ? 'text-3xl text-center' : 'text-2xl'}`}>PASO 3: Evolución</h2>
                    
                     <p className={`text-gray-300 ${isKiosk ? 'text-xl text-center' : ''}`}>¿Cómo se comporta el síntoma ahora?</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {['Mejorando', 'Estable (Igual)', 'Empeorando'].map(ev => (
                             <button
                                key={ev}
                                onClick={() => setFormData({...formData, evolution: ev})}
                                className={`${btnClass} ${formData.evolution === ev ? activeBtnClass : inactiveBtnClass}`}
                            >
                                {ev}
                            </button>
                        ))}
                    </div>

                    <div className="pt-4 flex justify-between">
                        <button onClick={prevStep} className="text-gray-400 hover:text-white px-4 py-2">Atrás</button>
                        <button 
                            onClick={nextStep}
                            disabled={!formData.evolution}
                            className={`bg-chuc-neon text-chuc-dark font-bold rounded-full disabled:opacity-50 hover:scale-105 transition-all ${isKiosk ? 'px-12 py-4 text-xl' : 'px-8 py-3'}`}
                        >
                            Siguiente ➔
                        </button>
                    </div>
                </div>
            );
        case 4:
            // Check if we have a protocol for the selected category
            const protocol = RED_FLAG_PROTOCOLS[formData.symptomCategory];

            return (
                <div className="space-y-4 animate-fade-in">
                    <h2 className={`font-bold text-chuc-neon ${isKiosk ? 'text-3xl text-center' : 'text-2xl'}`}>PASO 4: Banderas Rojas</h2>
                    
                    {protocol ? (
                         <div className={`bg-red-900/20 border border-red-500/30 rounded-xl ${isKiosk ? 'p-8' : 'p-5'}`}>
                            <h3 className={`text-red-300 font-bold mb-3 flex items-center ${isKiosk ? 'text-2xl justify-center' : ''}`}>
                                <span className="mr-2 text-xl">⚠</span> {protocol.title}
                            </h3>
                            <div className={`space-y-3 ${isKiosk ? 'grid grid-cols-1 gap-4' : ''}`}>
                                {protocol.checks.map(check => (
                                    <label key={check} className={`flex items-start space-x-3 cursor-pointer group ${isKiosk ? 'bg-black/20 p-4 rounded-lg' : ''}`}>
                                        <div className={`mt-1 min-w-[24px] h-6 w-6 rounded border flex items-center justify-center transition-colors ${formData.selectedRedFlags.includes(check) ? 'bg-red-500 border-red-500' : 'border-gray-500 group-hover:border-red-300'}`}>
                                            {formData.selectedRedFlags.includes(check) && <span className="text-white font-bold">✓</span>}
                                        </div>
                                        <input type="checkbox" className="hidden" checked={formData.selectedRedFlags.includes(check)} onChange={() => toggleRedFlag(check)} />
                                        <span className={`${isKiosk ? 'text-xl' : 'text-sm'} ${formData.selectedRedFlags.includes(check) ? 'text-white font-medium' : 'text-gray-400 group-hover:text-gray-200'}`}>{check}</span>
                                    </label>
                                ))}
                            </div>
                         </div>
                    ) : (
                        <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-xl text-sm text-blue-100">
                             <p className="font-bold mb-1">Valoración general</p>
                             <p>Por favor, describe cualquier otro síntoma preocupante como: dificultad para respirar, dolor opresivo, sangrado, confusión o pérdida de fuerza.</p>
                        </div>
                    )}
                    
                    {!isKiosk && (
                        <div className="mt-4">
                            <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Otros síntomas o detalles:</label>
                            <textarea 
                                value={formData.redFlags}
                                onChange={e => setFormData({...formData, redFlags: e.target.value})}
                                className="w-full p-4 bg-black/30 border border-white/20 rounded-xl focus:border-chuc-neon outline-none h-24 text-sm"
                                placeholder="Describe aquí otros detalles si es necesario..."
                            />
                        </div>
                    )}
                    
                    <div className="pt-4 flex justify-between">
                        <button onClick={prevStep} className="text-gray-400 hover:text-white px-4 py-2">Atrás</button>
                        <button 
                            onClick={nextStep}
                            className={`font-bold rounded-full hover:scale-105 transition-all ${isKiosk ? 'px-12 py-4 text-xl' : 'px-8 py-3'} ${
                                (formData.selectedRedFlags.length > 0) 
                                ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]' 
                                : 'bg-chuc-neon text-chuc-dark'
                            }`}
                        >
                            {(formData.selectedRedFlags.length > 0 || formData.redFlags) ? 'Siguiente ➔' : 'Ninguno / Continuar ➔'}
                        </button>
                    </div>
                </div>
            );
        case 5:
             // VITAL SIGNS MODULE
             const isChestOrBreath = formData.symptomCategory === "Dolor Torácico" || formData.symptomCategory === "Dificultad Respiratoria";
             const isFever = formData.symptomCategory === "Fiebre / Escalofríos";
             const isNeuro = formData.symptomCategory === "Mareo o Desmayo";
             const isTrauma = formData.symptomCategory === "Traumatismos";

             return (
                 <div className="space-y-6 animate-fade-in">
                    <h2 className={`font-bold text-chuc-neon ${isKiosk ? 'text-3xl text-center' : 'text-2xl'}`}>PASO 5: Signos Vitales (Opcional)</h2>
                    <p className={`text-gray-300 ${isKiosk ? 'text-center text-lg' : ''}`}>
                        Si conoces estos datos, ayúdanos a precisar. Si no, pulsa "Continuar".
                    </p>

                    <div className={`grid gap-6 ${isKiosk ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                        {(isChestOrBreath || !formData.symptomCategory) && (
                            <div className="bg-black/20 p-4 rounded-xl border border-white/10">
                                <label className="block mb-2 font-medium">Saturación de Oxígeno (%)</label>
                                <input 
                                    type="number" 
                                    placeholder="Ej: 98"
                                    value={formData.vitals.satO2}
                                    onChange={e => setFormData({...formData, vitals: {...formData.vitals, satO2: e.target.value}})}
                                    className={`w-full p-3 bg-black/40 rounded-lg border border-white/20 focus:border-chuc-neon outline-none ${isKiosk ? 'text-2xl' : ''}`}
                                />
                                <label className="block mt-4 mb-2 font-medium">¿Te cuesta hablar frases completas?</label>
                                <div className="flex gap-2">
                                     {['Sí', 'No'].map(opt => (
                                        <button key={opt} onClick={() => setFormData({...formData, vitals: {...formData.vitals, breathing: opt === 'Sí' ? 'Dificultad al hablar' : 'Habla normal'}})}
                                        className={`flex-1 p-3 rounded-lg border ${formData.vitals.breathing?.includes(opt === 'Sí' ? 'Dificultad' : 'Normal') ? 'bg-red-500 border-red-500' : 'bg-white/5 border-white/10'}`}>
                                            {opt}
                                        </button>
                                     ))}
                                </div>
                            </div>
                        )}

                        {(isFever || !formData.symptomCategory) && (
                            <div className="bg-black/20 p-4 rounded-xl border border-white/10">
                                <label className="block mb-2 font-medium">Temperatura (ºC)</label>
                                <input 
                                    type="number" 
                                    placeholder="Ej: 38.5"
                                    value={formData.vitals.temp}
                                    onChange={e => setFormData({...formData, vitals: {...formData.vitals, temp: e.target.value}})}
                                    className={`w-full p-3 bg-black/40 rounded-lg border border-white/20 focus:border-chuc-neon outline-none ${isKiosk ? 'text-2xl' : ''}`}
                                />
                            </div>
                        )}
                        
                        {(isNeuro || !formData.symptomCategory) && (
                             <div className="bg-black/20 p-4 rounded-xl border border-white/10">
                                <label className="block mb-2 font-medium">¿Has perdido el conocimiento?</label>
                                <div className="flex gap-2">
                                     {['Sí', 'No'].map(opt => (
                                        <button key={opt} onClick={() => setFormData({...formData, vitals: {...formData.vitals, conscience: opt === 'Sí' ? 'Pérdida de consciencia' : 'Consciencia normal'}})}
                                        className={`flex-1 p-3 rounded-lg border ${formData.vitals.conscience?.includes(opt === 'Sí' ? 'Pérdida' : 'Normal') ? 'bg-red-500 border-red-500' : 'bg-white/5 border-white/10'}`}>
                                            {opt}
                                        </button>
                                     ))}
                                </div>
                             </div>
                        )}

                        {(isTrauma || !formData.symptomCategory) && (
                             <div className="bg-black/20 p-4 rounded-xl border border-white/10">
                                <label className="block mb-2 font-medium">¿Hay sangrado activo visible?</label>
                                <div className="flex gap-2">
                                     {['Sí', 'No'].map(opt => (
                                        <button key={opt} onClick={() => setFormData({...formData, vitals: {...formData.vitals, bleeding: opt === 'Sí' ? 'Sangrado activo' : 'Sin sangrado'}})}
                                        className={`flex-1 p-3 rounded-lg border ${formData.vitals.bleeding?.includes(opt === 'Sí' ? 'Sangrado' : 'Sin') ? 'bg-red-500 border-red-500' : 'bg-white/5 border-white/10'}`}>
                                            {opt}
                                        </button>
                                     ))}
                                </div>
                             </div>
                        )}
                    </div>

                    <div className="pt-4 flex justify-between">
                        <button onClick={prevStep} className="text-gray-400 hover:text-white px-4 py-2">Atrás</button>
                        <button 
                            onClick={nextStep}
                            className={`bg-chuc-neon text-chuc-dark font-bold rounded-full hover:scale-105 transition-all ${isKiosk ? 'px-12 py-4 text-xl' : 'px-8 py-3'}`}
                        >
                            Continuar ➔
                        </button>
                    </div>
                 </div>
             );

        case 6:
            return (
                 <div className="space-y-6 animate-fade-in">
                    <h2 className={`font-bold text-chuc-neon ${isKiosk ? 'text-3xl text-center' : 'text-2xl'}`}>PASO 6: Factores de Riesgo</h2>
                    <p className={`text-gray-300 ${isKiosk ? 'text-center text-lg' : ''}`}>Seleccione si aplica alguno de estos antecedentes:</p>
                    
                    <div className={`grid gap-3 ${isKiosk ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2'}`}>
                        {RISK_FACTORS_LIST.map(factor => (
                             <button
                                key={factor}
                                onClick={() => toggleRiskFactor(factor)}
                                className={`rounded-lg border text-left transition-all ${isKiosk ? 'p-6 text-lg' : 'p-3 text-sm'} ${formData.riskFactors.includes(factor) ? 'bg-chuc-neon text-chuc-dark font-bold border-white' : 'bg-black/20 border-white/10 hover:bg-white/5 text-gray-400'}`}
                            >
                                {formData.riskFactors.includes(factor) ? '✓ ' : '+ '} {factor}
                            </button>
                        ))}
                    </div>

                    <div className="pt-4 flex justify-between">
                        <button onClick={prevStep} className="text-gray-400 hover:text-white px-4 py-2">Atrás</button>
                        <button 
                            onClick={handleSubmit}
                            className={`bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded-full shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:scale-105 transition-all ${isKiosk ? 'px-12 py-4 text-2xl' : 'px-8 py-3'}`}
                        >
                            FINALIZAR TRIAJE
                        </button>
                    </div>
                </div>
            );
        case 7:
            return (
                <div className="h-full flex flex-col items-center justify-center animate-fade-in">
                    {loading ? (
                         <div className="text-center space-y-6">
                            <div className="relative w-24 h-24 mx-auto">
                                <div className="absolute inset-0 border-4 border-chuc-dark rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-chuc-neon border-t-transparent rounded-full animate-spin"></div>
                                <div className="absolute inset-4 border-4 border-chuc-neon/30 border-b-transparent rounded-full animate-spin-reverse"></div>
                            </div>
                            <h3 className="text-xl font-bold animate-pulse text-white">Analizando gravedad...</h3>
                            <p className="text-chuc-neon font-mono text-sm">Consultando modelo HUC (Gemini 3 Pro)...</p>
                         </div>
                    ) : (
                        <div className={`w-full bg-chuc-dark/90 backdrop-blur-xl rounded-2xl border border-white/10 p-6 md:p-8 h-full overflow-y-auto shadow-2xl ${isKiosk ? 'max-w-4xl' : 'max-w-3xl'}`}>
                            <h2 className={`font-bold mb-6 text-center border-b border-white/10 pb-4 text-white ${isKiosk ? 'text-3xl' : 'text-2xl'}`}>RESULTADO DE VALORACIÓN</h2>
                            <div className={`prose prose-invert max-w-none prose-p:leading-relaxed prose-headings:text-chuc-neon ${isKiosk ? 'prose-xl' : ''}`}>
                                {/* Simple Markdown rendering replacement */}
                                {result?.split('###').map((section, idx) => {
                                    if (!section.trim()) return null;
                                    const [title, ...content] = section.split('\n');
                                    return (
                                        <div key={idx} className="mb-6 bg-black/20 p-4 rounded-xl border border-white/5">
                                            <h3 className="text-lg font-bold text-chuc-neon mb-2 uppercase tracking-wide">{title}</h3>
                                            <p className="whitespace-pre-wrap text-gray-200">{content.join('\n').trim()}</p>
                                        </div>
                                    )
                                })}
                            </div>
                            <div className="mt-8 flex flex-wrap justify-center gap-4">
                                <button 
                                    onClick={() => {
                                        setStep(1);
                                        setFormData({
                                            symptomCategory: '',
                                            symptom:'', 
                                            onsetTime:'', 
                                            onsetType:'', 
                                            evolution:'', 
                                            redFlags:'', 
                                            selectedRedFlags: [],
                                            riskFactors:[],
                                            vitals: {satO2: '', temp: '', breathing: '', conscience: '', bleeding: ''}
                                        });
                                        setResult(null);
                                    }}
                                    className={`border border-white/20 rounded-full hover:bg-white/10 text-white transition-colors ${isKiosk ? 'px-10 py-4 text-xl' : 'px-6 py-3'}`}
                                >
                                    Nueva Valoración
                                </button>
                                <button 
                                    onClick={onBack}
                                    className={`bg-chuc-blue rounded-full hover:bg-chuc-neon hover:text-chuc-dark transition-colors font-bold shadow-lg ${isKiosk ? 'px-10 py-4 text-xl' : 'px-6 py-3'}`}
                                >
                                    Volver al Inicio
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            );
    }
  };

  return (
    <div className="h-full w-full max-w-5xl mx-auto flex flex-col p-4">
        {step < 7 && (
            <div className="mb-8">
                <div className="flex justify-between text-xs uppercase tracking-widest text-gray-400 mb-2 font-mono">
                    <span>{isKiosk ? 'Admisión de Urgencias' : 'Progreso del Triaje'}</span>
                    <span>Paso {step} / {totalSteps}</span>
                </div>
                <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                    <div className="h-full bg-gradient-to-r from-chuc-neon to-blue-500 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(0,173,239,0.5)]" style={{width: `${(step/totalSteps)*100}%`}}></div>
                </div>
            </div>
        )}
        <div className="flex-1 flex flex-col justify-center">
            {renderStep()}
        </div>
    </div>
  );
};