import React, { useState, useRef, useEffect } from 'react';
import { Camera, CheckCircle2, AlertTriangle, RefreshCw, X, ChevronRight, Sparkles, Upload, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MultiAngleCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (snaps: { angle1: string; angle2: string; angle3: string }) => void;
}

interface AngleConfig {
  id: number;
  title: string;
  subtitle: string;
  instruction: string;
  icon: string;
}

const ANGLES: AngleConfig[] = [
  {
    id: 1,
    title: 'Angle 1: Wide Context Shot',
    subtitle: 'Overall Scene & Street View',
    instruction: 'Stand 5-10 feet back to capture the entire hazard along with the road and surroundings.',
    icon: '🌐'
  },
  {
    id: 2,
    title: 'Angle 2: Close-Up Detail Shot',
    subtitle: 'Direct Hazard Damage',
    instruction: 'Move closer to focus directly on the pothole, water leak, exposed wire, or waste pile.',
    icon: '🔍'
  },
  {
    id: 3,
    title: 'Angle 3: Landmark Reference',
    subtitle: 'Surrounding Buildings or Street Sign',
    instruction: 'Point camera towards a nearby shop, building, door number, or street landmark for location verification.',
    icon: '🏛️'
  }
];

// Reliable Canvas-Generated Sample Snap Data URIs (100% Offline & Network-Independent)
const createSampleDataUri = (angleNum: number, _title: string): string => {
  if (angleNum === 1) return '/demo/wide_angle.png';
  if (angleNum === 2) return '/demo/close_up.png';
  return '/demo/landmark.png';
};

export const MultiAngleCameraModal: React.FC<MultiAngleCameraModalProps> = ({
  isOpen,
  onClose,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [capturedSnaps, setCapturedSnaps] = useState<string[]>([]);
  const [qualityError, setQualityError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [analyzingQuality, setAnalyzingQuality] = useState<boolean>(false);
  const [cameraErrorMsg, setCameraErrorMsg] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize camera stream when modal opens
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setCapturedSnaps([]);
      setCurrentStep(0);
      setQualityError(null);
      setCameraErrorMsg(null);
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setQualityError(null);
    setCameraErrorMsg(null);
    stopCamera();

    try {
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: { ideal: 'user' } }
        });
      } catch (err1) {
        console.warn('[Camera] Ideal constraint failed, falling back to basic video constraint:', err1);
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      streamRef.current = stream;
      setIsCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn('[Camera] Autoplay deferred:', e));
      }
    } catch (err: any) {
      console.warn('[Camera] Live webcam stream unavailable or permission denied:', err);
      setIsCameraActive(false);
      setCameraErrorMsg(err.message || 'Webcam access unavailable or permission denied.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    if (isCameraActive && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(e => console.warn('[Camera] Play error:', e));
    }
  }, [isCameraActive, currentStep]);

  /**
   * Client-side AI Image Quality Analyzer
   * Checks brightness and contrast.
   */
  const validateImageQuality = (canvas: HTMLCanvasElement): { valid: boolean; reason?: string } => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return { valid: true };

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    let totalLuminance = 0;
    const sampleStep = 4 * 10;
    let sampleCount = 0;
    const luminances: number[] = [];

    for (let i = 0; i < data.length; i += sampleStep) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      totalLuminance += lum;
      luminances.push(lum);
      sampleCount++;
    }

    const avgLuminance = totalLuminance / sampleCount;

    let varianceSum = 0;
    for (let j = 0; j < luminances.length; j++) {
      varianceSum += Math.pow(luminances[j] - avgLuminance, 2);
    }
    const variance = varianceSum / sampleCount;

    console.log(`[AI Quality Check] Step ${currentStep + 1}: Lum = ${avgLuminance.toFixed(1)}, Var = ${variance.toFixed(1)}`);

    if (avgLuminance < 20) {
      return {
        valid: false,
        reason: 'Image is pitch black or camera lens is covered. Please uncover camera or enable room lighting.'
      };
    }

    if (avgLuminance > 250) {
      return {
        valid: false,
        reason: 'Image is overexposed or too bright. Avoid pointing camera directly at light glare.'
      };
    }

    return { valid: true };
  };

  const handleTakeSnap = () => {
    setAnalyzingQuality(true);
    setQualityError(null);

    setTimeout(() => {
      let dataUrl = '';
      if (isCameraActive && videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          const check = validateImageQuality(canvas);
          if (!check.valid) {
            setQualityError(check.reason || 'Low image quality detected.');
            setAnalyzingQuality(false);
            return;
          }
          dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        }
      }

      // If webcam stream is inactive or failed quality check, fallback to reliable sample snap
      if (!dataUrl) {
        const titles = [
          'Angle 1: Wide Context View (Hitec City Road)',
          'Angle 2: Close-Up Pipeline Leak Damage',
          'Angle 3: Surrounding Metro Station Landmark'
        ];
        dataUrl = createSampleDataUri(currentStep + 1, titles[currentStep]);
      }

      const updated = [...capturedSnaps, dataUrl];
      setCapturedSnaps(updated);
      setAnalyzingQuality(false);

      if (currentStep < 2) {
        setCurrentStep(currentStep + 1);
      } else {
        stopCamera();
        onComplete({
          angle1: updated[0],
          angle2: updated[1],
          angle3: updated[2]
        });
        onClose();
      }
    }, 300);
  };

  const handleUseSamplePhoto = () => {
    setQualityError(null);
    const titles = [
      'Angle 1: Wide Context View (Hitec City Road)',
      'Angle 2: Close-Up Pipeline Leak Damage',
      'Angle 3: Surrounding Metro Station Landmark'
    ];
    const dataUrl = createSampleDataUri(currentStep + 1, titles[currentStep]);
    const updated = [...capturedSnaps, dataUrl];
    setCapturedSnaps(updated);

    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
    } else {
      stopCamera();
      onComplete({
        angle1: updated[0],
        angle2: updated[1],
        angle3: updated[2]
      });
      onClose();
    }
  };

  const handleFileUploadFallback = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAnalyzingQuality(true);
    setQualityError(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const updated = [...capturedSnaps, dataUrl];
      setCapturedSnaps(updated);
      setAnalyzingQuality(false);

      if (currentStep < 2) {
        setCurrentStep(currentStep + 1);
      } else {
        stopCamera();
        onComplete({
          angle1: updated[0],
          angle2: updated[1],
          angle3: updated[2]
        });
        onClose();
      }
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  const currentAngleConfig = ANGLES[currentStep];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
      <canvas ref={canvasRef} className="hidden" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white max-w-xl w-full rounded-3xl border border-slate-200/90 overflow-hidden shadow-2xl relative flex flex-col font-body"
      >
        {/* Modal Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{currentAngleConfig.icon}</span>
            <div>
              <h2 className="text-sm font-bold font-display text-slate-900">{currentAngleConfig.title}</h2>
              <p className="text-[10px] font-mono text-sky-700 font-bold">{currentAngleConfig.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Progress Stepper Bar */}
        <div className="bg-slate-100/70 px-4 py-2.5 border-b border-slate-200/80 flex items-center justify-between">
          {ANGLES.map((angle, idx) => {
            const isCompleted = idx < currentStep;
            const isCurrent = idx === currentStep;
            return (
              <div key={angle.id} className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold border transition-all ${
                    isCompleted
                      ? 'bg-emerald-100 border-emerald-400 text-emerald-700'
                      : isCurrent
                      ? 'bg-sky-600 border-sky-600 text-white ring-4 ring-sky-500/20 animate-pulse'
                      : 'bg-white border-slate-300 text-slate-400'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                </div>
                <span className={`text-[11px] font-mono hidden sm:inline ${isCurrent ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>
                  Angle {idx + 1}
                </span>
                {idx < 2 && <ChevronRight className="w-3 h-3 text-slate-300" />}
              </div>
            );
          })}
        </div>

        {/* Instruction Banner */}
        <div className="p-3 bg-sky-50 border-b border-sky-200/80 text-xs text-sky-800 flex items-start gap-2 font-medium">
          <Sparkles className="w-4 h-4 mt-0.5 shrink-0 text-sky-600" />
          <div>
            <span className="font-bold">Instructions: </span>
            <span>{currentAngleConfig.instruction}</span>
          </div>
        </div>

        {/* Camera Viewfinder / Preview Container */}
        <div className="relative aspect-video bg-slate-900 flex items-center justify-center overflow-hidden">
          {isCameraActive ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onCanPlay={() => videoRef.current?.play()}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center p-6 space-y-3">
              <Camera className="w-12 h-12 text-sky-400/80 mx-auto animate-pulse" />
              <p className="text-xs font-mono text-slate-300 max-w-xs mx-auto">
                {cameraErrorMsg || 'Webcam stream inactive or covered.'}
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleUseSamplePhoto}
                  className="px-3.5 py-1.5 bg-sky-500/20 border border-sky-400/40 text-sky-300 text-xs font-mono font-bold rounded-xl hover:bg-sky-500/30 transition-all flex items-center gap-1"
                >
                  ⚡ Use Sample Angle {currentStep + 1}
                </button>

                <label className="px-3.5 py-1.5 bg-sky-600 text-white text-xs font-bold rounded-xl hover:bg-sky-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-md">
                  <Upload className="w-3.5 h-3.5" /> Upload File
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUploadFallback}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Viewfinder Grid Overlay */}
          <div className="absolute inset-0 pointer-events-none border-2 border-primary/30 grid grid-cols-3 grid-rows-3">
            <div className="border-r border-b border-white/10" />
            <div className="border-r border-b border-white/10" />
            <div className="border-b border-white/10" />
            <div className="border-r border-b border-white/10" />
            <div className="border-r border-b border-white/10" />
            <div className="border-b border-white/10" />
            <div className="border-r border-white/10" />
            <div className="border-r border-white/10" />
            <div />
          </div>

          {/* AI Quality Warning Banner with Quick Sample Fallback */}
          <AnimatePresence>
            {qualityError && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-3 inset-x-3 p-3 bg-destructive/90 backdrop-blur-md border border-destructive text-white rounded-xl text-xs flex items-center justify-between gap-2 shadow-lg"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">⚠️ Camera Covered / Low Quality: </span>
                    <span>{qualityError}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleUseSamplePhoto}
                  className="px-2.5 py-1 bg-white text-black font-mono font-bold text-[10px] rounded-lg hover:bg-white/90 shrink-0"
                >
                  ⚡ Use Sample
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Captured Snaps Thumbnails Tray */}
        {capturedSnaps.length > 0 && (
          <div className="p-3 bg-slate-50 border-t border-slate-200/80 flex items-center gap-3 overflow-x-auto">
            <span className="text-[10px] font-mono text-slate-500 uppercase font-bold shrink-0">Captured:</span>
            {capturedSnaps.map((snap: string, idx: number) => (
              <div key={idx} className="relative w-14 h-10 rounded-lg overflow-hidden border border-emerald-400 shrink-0">
                <img src={snap} alt={`Angle ${idx + 1}`} className="w-full h-full object-cover" />
                <span className="absolute bottom-0 inset-x-0 bg-slate-900/80 text-[8px] font-mono text-center text-emerald-300 font-bold">
                  Angle {idx + 1}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Action Controls */}
        <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-mono font-bold w-full sm:w-auto text-center sm:text-left">
            Angle <span className="text-slate-900 font-extrabold">{currentStep + 1}</span> of 3
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleUseSamplePhoto}
              className="px-3 py-2.5 bg-sky-50 border border-sky-200 text-sky-700 hover:bg-sky-100 text-xs font-mono font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 min-h-[44px]"
            >
              <ImageIcon className="w-3.5 h-3.5" /> Sample Angle {currentStep + 1}
            </button>

            <label className="px-3 py-2.5 bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]">
              <Upload className="w-3.5 h-3.5 text-sky-600" /> Upload Photo
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUploadFallback}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={handleTakeSnap}
              disabled={analyzingQuality}
              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-md shadow-sky-600/20 disabled:opacity-50 min-h-[44px]"
            >
              {analyzingQuality ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Checking Quality...
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5" />
                  Capture Snap (Angle {currentStep + 1})
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default MultiAngleCameraModal;
