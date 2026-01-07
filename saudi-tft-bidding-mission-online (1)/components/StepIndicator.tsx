
import React from 'react';
import { AppStep } from '../types';

interface StepIndicatorProps {
  currentStep: AppStep;
}

const steps = [
  { id: AppStep.INTRO, label: 'Briefing' },
  { id: AppStep.ANALYSIS, label: 'Data' },
  { id: AppStep.RECORDS, label: 'Records' },
  { id: AppStep.SIMULATION, label: 'Bidding' },
];

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
  const currentIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="flex items-center justify-center w-full px-4 mb-8">
      <div className="flex items-center bg-white/50 backdrop-blur-md px-6 py-3 rounded-full shadow-sm border border-slate-200">
        {steps.map((step, idx) => {
          const isActive = currentStep === step.id;
          const isPast = currentIndex > idx;
          
          return (
            <React.Fragment key={step.id}>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  isActive 
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 scale-110' 
                    : isPast 
                      ? 'bg-emerald-100 text-emerald-600' 
                      : 'bg-slate-100 text-slate-400'
                }`}>
                  {isPast ? '✓' : idx + 1}
                </div>
                <span className={`text-[10px] font-bold tracking-tight transition-colors duration-300 whitespace-nowrap hidden sm:block ${
                  isActive ? 'text-slate-900' : 'text-slate-400'
                }`}>
                  {step.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div className={`w-6 h-[2px] mx-3 rounded-full transition-colors duration-300 ${
                  isPast ? 'bg-emerald-200' : 'bg-slate-200'
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
