import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';

interface ThinkingTimelineProps {
  isServerComplete: boolean;
  onFinishAnimation: () => void;
}

const steps = [
  'Ingesting Photo & coordinates...',
  'Visual Intelligence Engine processing...',
  'Severity Assessment Engine resolving...',
  'Department Routing Node allocating...',
  'Decision Report Card compiling...'
];

export const ThinkingTimeline: React.FC<ThinkingTimelineProps> = ({
  isServerComplete,
  onFinishAnimation
}) => {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    // ponytail: run automatic simulated transitions through the first 3 nodes to manage visual rhythm
    if (activeStep < 3) {
      const timer = setTimeout(() => {
        setActiveStep((prev) => prev + 1);
      }, 700);
      return () => clearTimeout(timer);
    }
    
    // Once step 3 is reached, wait for the actual server response before triggering final step
    if (activeStep === 3 && isServerComplete) {
      const timer = setTimeout(() => {
        setActiveStep(4);
      }, 500);
      return () => clearTimeout(timer);
    }

    // Trigger completion to parent once final step finishes
    if (activeStep === 4) {
      const timer = setTimeout(() => {
        onFinishAnimation();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [activeStep, isServerComplete, onFinishAnimation]);

  return (
    <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200/80 shadow-2xl relative overflow-hidden font-body">
      {/* Pulse line representing processor energy */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-sky-500 to-blue-600 animate-pulse" />

      <h2 className="text-base font-extrabold font-display text-slate-900 mb-6 flex items-center gap-2.5">
        <Loader2 className="w-5 h-5 text-sky-600 animate-spin shrink-0" />
        <span>CityMind AI Brain™ Orchestrating...</span>
      </h2>

      <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
        <AnimatePresence>
          {steps.map((text, idx) => {
            const isCompleted = activeStep > idx;
            const isProcessing = activeStep === idx;
            const isPending = activeStep < idx;

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.1 }}
                className={`flex items-start gap-4 relative z-10 ${
                  isPending ? 'text-slate-400' : 'text-slate-800'
                }`}
              >
                {/* Stepper Status Indicators */}
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center border text-[10px] font-mono font-bold transition-all duration-300 ${
                    isCompleted
                      ? 'bg-emerald-100 border-emerald-400 text-emerald-700 shadow-xs'
                      : isProcessing
                      ? 'bg-sky-100 border-sky-500 text-sky-700 shadow-xs animate-pulse ring-4 ring-sky-500/20'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : isProcessing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    idx + 1
                  )}
                </div>

                <div className="flex-1 pt-0.5">
                  <p
                    className={`text-xs font-mono font-semibold tracking-tight transition-all duration-300 ${
                      isProcessing ? 'text-sky-700 font-bold' : isCompleted ? 'text-slate-900' : 'text-slate-400'
                    }`}
                  >
                    {text}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ThinkingTimeline;
