import React from 'react';
import { SymptomCardData } from '../types';

const symptoms: SymptomCardData[] = [
  { id: '1', title: 'Dolor Torácico', icon: '🫀', redFlags: 'Posible IAM, Disección Aórtica, Embolia Pulmonar' },
  { id: '2', title: 'Dificultad Respiratoria', icon: '🫁', redFlags: 'Neumotórax, Asma severa, Edema agudo' },
  { id: '3', title: 'Fiebre / Escalofríos', icon: '🌡️', redFlags: 'Sepsis, Meningitis, Infección grave' },
  { id: '4', title: 'Mareo o Desmayo', icon: '😵‍💫', redFlags: 'Ictus, Arritmia, Hipoglucemia severa' },
  { id: '5', title: 'Dolor Abdominal', icon: '🤢', redFlags: 'Apendicitis, Perforación, Obstrucción' },
  { id: '6', title: 'Traumatismos', icon: '🤕', redFlags: 'Fractura expuesta, Hemorragia interna, TCE' },
];

interface Props {
  onSelect: (symptom: string) => void;
}

const SymptomGrid: React.FC<Props> = ({ onSelect }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 max-w-4xl mx-auto">
      {symptoms.map((card) => (
        <div
          key={card.id}
          className="group relative bg-[#002850] bg-opacity-60 backdrop-blur-md border border-[#00ADEF] border-opacity-30 rounded-xl p-6 hover:bg-[#003A70] hover:border-opacity-100 transition-all cursor-pointer h-40 flex flex-col items-center justify-center text-center overflow-hidden"
          onClick={() => onSelect(card.title)}
        >
          <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">{card.icon}</div>
          <h3 className="text-white font-semibold text-lg">{card.title}</h3>
          
          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-[#00ADEF] bg-opacity-90 translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex flex-col justify-center items-center p-4">
            <span className="text-white font-bold text-xs uppercase tracking-wider mb-1">Alertas (Red Flags)</span>
            <p className="text-white text-sm font-medium leading-tight">{card.redFlags}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SymptomGrid;