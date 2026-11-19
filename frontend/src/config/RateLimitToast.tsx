import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

export interface RateLimitCountdownToastProps {
  initialSeconds: number;
  message: string;
  toastId: string | number;
}

export const RateLimitCountdownToast: React.FC<RateLimitCountdownToastProps> = ({
  initialSeconds,
  message,
  toastId,
}) => {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    if (seconds <= 0) {
      toast.dismiss(toastId);
      return;
    }
    const timer = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          toast.dismiss(toastId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [seconds, toastId]);

  return (
    <div className="flex items-center gap-3 w-full max-w-md p-4 rounded-xl bg-slate-900/95 backdrop-blur-xl border border-amber-500/30 shadow-2xl shadow-amber-950/40 text-amber-400">
      <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 shrink-0">
        <AlertTriangle className="w-5 h-5 text-amber-400 animate-pulse" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold uppercase tracking-wider text-amber-300 font-display">
          Rate Limit Exceeded (429)
        </div>
        <div className="text-xs text-amber-200/80 mt-0.5 line-clamp-2">
          {message}
        </div>
      </div>
      <div className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 font-mono tabular-nums text-sm font-bold text-amber-400 shrink-0 shadow-inner">
        {seconds}s
      </div>
    </div>
  );
};

export interface PayloadTooLargeToastProps {
  serverMsg: string;
  toastId: string | number;
}

export const PayloadTooLargeToast: React.FC<PayloadTooLargeToastProps> = ({
  serverMsg,
  toastId,
}) => {
  return (
    <div className="flex items-center gap-3 w-full max-w-md p-4 rounded-xl bg-slate-900/95 backdrop-blur-xl border border-amber-500/30 shadow-2xl shadow-amber-950/40 text-amber-400">
      <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 shrink-0">
        <ShieldAlert className="w-5 h-5 text-amber-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold uppercase tracking-wider text-amber-300 font-display">
          Payload Too Large (413)
        </div>
        <div className="text-xs text-amber-200/80 mt-0.5">
          {serverMsg}
        </div>
      </div>
      <button
        type="button"
        onClick={() => toast.dismiss(toastId)}
        className="text-xs text-amber-400 hover:text-amber-200 font-mono font-bold px-2 py-1"
      >
        Dismiss
      </button>
    </div>
  );
};
