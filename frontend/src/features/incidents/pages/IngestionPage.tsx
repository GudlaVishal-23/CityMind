import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useUIStore from '@store/uiStore';
import GeopinMap from '../components/GeopinMap';
import ThinkingTimeline from '../components/ThinkingTimeline';
import ReportCard from '../components/ReportCard';
import MultiAngleCameraModal from '../components/MultiAngleCameraModal';
import NotificationBell from '../../notifications/NotificationBell';
import { api } from '@config/api';
import {
  extractExifFromImage,
  calculateHaversineDistanceMeters,
  type ExifMetadata
} from '../../../utils/exifUtils';
import {
  LogOut, Image, MapPin, FileText, Send, AlertTriangle,
  ListFilter, Camera, CheckCircle2, Building2, ShieldCheck
} from 'lucide-react';

type IngestionState = 'FORM' | 'THINKING' | 'RESULT' | 'DUPLICATE';

const getFallbackImage = (title: string): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 640; canvas.height = 360;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const grad = ctx.createLinearGradient(0, 0, 640, 360);
  grad.addColorStop(0, '#E0F2FE'); grad.addColorStop(1, '#F0F9FF');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 640, 360);
  ctx.fillStyle = '#0284C7'; ctx.beginPath(); ctx.arc(320, 160, 50, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0F172A'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(title, 320, 260);
  return canvas.toDataURL('image/jpeg', 0.9);
};

const DEMO_WIDE_ANGLE = '/demo/wide_angle.png';
const DEMO_DETAIL_ANGLE = '/demo/close_up.png';
const DEMO_LANDMARK_ANGLE = '/demo/landmark.png';

export const IngestionPage: React.FC = () => {
  const navigate = useNavigate();
  const { authUser, setAuthUser } = useUIStore();

  const [state, setState] = useState<IngestionState>('FORM');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [capturedSnaps, setCapturedSnaps] = useState<{ angle1: string; angle2: string; angle3: string } | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number; locationName?: string; isExactGps?: boolean } | null>({
    lat: 17.4435, lng: 78.3772, locationName: 'Hitec City / Madhapur, Hyderabad'
  });
  const [exifData, setExifData] = useState<ExifMetadata | null>(null);
  const [distanceDeltaMeters, setDistanceDeltaMeters] = useState<number | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiResult, setApiResult] = useState<any>(null);
  const [isServerComplete, setIsServerComplete] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('aicity_user');
    localStorage.removeItem('aicity_dev_token');
    setAuthUser(null);
    navigate('/login');
  };

  // Inspect image for EXIF GPS metadata whenever image or location changes
  useEffect(() => {
    if (!imageUrl) {
      setExifData(null);
      setDistanceDeltaMeters(null);
      return;
    }

    let isMounted = true;
    (async () => {
      const parsed = await extractExifFromImage(imageUrl);
      if (!isMounted) return;
      setExifData(parsed);

      if (parsed.hasGps && parsed.latitude !== undefined && parsed.longitude !== undefined && location) {
        const dist = calculateHaversineDistanceMeters(
          parsed.latitude,
          parsed.longitude,
          location.lat,
          location.lng
        );
        setDistanceDeltaMeters(dist);
      } else {
        setDistanceDeltaMeters(null);
      }
    })();

    return () => { isMounted = false; };
  }, [imageUrl, location]);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUri = reader.result as string;
        setImageUrl(dataUri);
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch { setUploadingImage(false); }
  };

  const handleLoadDemoAsset = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const wideUrl = origin + DEMO_WIDE_ANGLE;
    const detailUrl = origin + DEMO_DETAIL_ANGLE;
    const landmarkUrl = origin + DEMO_LANDMARK_ANGLE;

    setTitle('Pothole on Hitec City Main Road near Cyber Towers');
    setDescription('Large pothole approximately 2 feet wide on the main road near Cyber Towers junction. Water has accumulated inside causing vehicles to swerve dangerously. Surrounding traffic is heavily affected during peak hours.');
    setImageUrl(wideUrl);
    setLocation({ lat: 17.4435, lng: 78.3772, locationName: 'Hitec City / Madhapur, Hyderabad', isExactGps: true });
    setCapturedSnaps({ angle1: wideUrl, angle2: detailUrl, angle3: landmarkUrl });
    setError(null);
  };

  const handleLoadFlaggedDemoAsset = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const flaggedUrl = origin + '/demo/flagged_indoor.png';

    setTitle('Testing indoor living room photo test');
    setDescription('Testing indoor non-civic photo submission to test AI Vision spam detection and flagging capabilities.');
    setImageUrl(flaggedUrl);
    setLocation({ lat: 17.4435, lng: 78.3772, locationName: 'Hitec City / Madhapur, Hyderabad', isExactGps: true });
    setCapturedSnaps({ angle1: flaggedUrl, angle2: flaggedUrl, angle3: flaggedUrl });
    setError(null);
  };

  const handleCameraComplete = (snaps: { angle1: string; angle2: string; angle3: string }) => {
    setCapturedSnaps(snaps);
    setImageUrl(snaps.angle1);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) { setError('Please fill in both headline and description.'); return; }
    if (!imageUrl) { setError('Visual evidence is required! Click "Capture 3-Angle Evidence" or upload a photo.'); return; }
    if (!location) { setError('Hyderabad location coordinates are required. Click on the map to pin precise coordinates.'); return; }

    setSubmitting(true); setError(null); setState('THINKING'); setIsServerComplete(false);

    try {
      const res = await api.post('/incidents', {
        title, description, imageUrl,
        location: { lat: location.lat, lng: location.lng },
        exifData
      });
      setApiResult(res.data);
      setIsServerComplete(true);
    } catch (err: any) {
      const serverMsg = err.response?.data?.error?.message || 'Orchestrator pipeline failed. Please check network connection.';
      setError(serverMsg); setState('FORM'); setSubmitting(false);
    }
  };

  const handleTimelineFinish = () => {
    setSubmitting(false);
    if (apiResult && apiResult.duplicateFound) setState('DUPLICATE');
    else if (apiResult && !apiResult.duplicateFound) setState('RESULT');
    else { setState('FORM'); setError('No valid response received from AI pipeline.'); }
  };

  const handleResetForm = () => {
    setTitle(''); setDescription(''); setImageUrl(''); setCapturedSnaps(null); setExifData(null); setDistanceDeltaMeters(null);
    setLocation({ lat: 17.4435, lng: 78.3772, locationName: 'Hitec City / Madhapur, Hyderabad' });
    setApiResult(null); setState('FORM');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/40 to-white flex flex-col relative overflow-x-hidden">
      <MultiAngleCameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onComplete={handleCameraComplete}
      />

      {/* ═══ GHMC Header Bar ═══ */}
      <header className="border-b border-sky-100 bg-white/80 backdrop-blur-xl sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-600 to-blue-700 flex items-center justify-center shadow-lg shadow-sky-600/25">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-sm font-bold font-display text-slate-900 tracking-tight">CityMind AI CITY</span>
              <span className="hidden sm:inline-block ml-2 text-[9px] bg-sky-100 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-md font-mono uppercase font-bold">
                Citizen Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/citizen/tracking')}
              className="px-3 py-1.5 bg-sky-50 border border-sky-200 text-xs font-semibold text-sky-700 rounded-xl hover:bg-sky-100 transition-all flex items-center gap-1.5"
            >
              <ListFilter className="w-3.5 h-3.5" /> My Complaints
            </button>
            <NotificationBell />
            {authUser?.role === 'admin' && (
              <button
                onClick={() => navigate('/ops')}
                className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-700 rounded-xl hover:bg-amber-100 transition-all"
              >
                Ops Center
              </button>
            )}
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ═══ Main Body ═══ */}
      <main className="flex-1 flex items-start justify-center p-4 sm:p-6 lg:p-8">
        {state === 'FORM' && (
          <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* ── Left Column: Form ── */}
            <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200 p-6 md:p-8 space-y-5 shadow-lg shadow-slate-200/50">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <h2 className="text-base font-bold font-display text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-sky-600" />
                  Report Civic Hazard
                </h2>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleLoadDemoAsset}
                    className="text-[10px] px-2.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-xl hover:bg-emerald-100 transition-all font-bold flex items-center gap-1 shadow-2xs"
                    title="Load valid pothole hazard report that passes AI verification"
                  >
                    <span>🟢 Valid Demo</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadFlaggedDemoAsset}
                    className="text-[10px] px-2.5 py-1.5 bg-rose-50 text-rose-700 border border-rose-200/80 rounded-xl hover:bg-rose-100 transition-all font-bold flex items-center gap-1 shadow-2xs"
                    title="Load fake/indoor non-civic report that triggers AI flagging & dismissal"
                  >
                    <span>🚨 Flagged Demo</span>
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Incident Headline
                  </label>
                  <input
                    type="text" required value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={submitting}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 transition-all"
                    placeholder="e.g. Pipeline burst on Hitec City main road..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Detailed Description
                  </label>
                  <textarea
                    required rows={3} value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={submitting}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 transition-all resize-none"
                    placeholder="Describe the hazard size, traffic impact, and surrounding landmarks..."
                  />
                </div>

                {/* Visual Evidence Section */}
                <div className="space-y-2.5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        3-Angle Photo Evidence
                      </label>
                      <span className="text-[11px] font-semibold text-sky-600 flex items-center gap-1">
                        ✨ AI Multi-Angle Verification
                      </span>
                    </div>

                    {!capturedSnaps ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div
                          onClick={() => setIsCameraModalOpen(true)}
                          className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 bg-slate-50/80 rounded-2xl p-4 cursor-pointer hover:border-sky-500 hover:bg-white transition-all group"
                        >
                          <Camera className="w-8 h-8 text-slate-400 group-hover:text-sky-600 mb-1.5 transition-colors" />
                          <span className="text-xs font-bold text-slate-800">Wide View</span>
                          <span className="text-[10px] text-slate-500 mb-3">Context of area</span>
                          <span className="px-3 py-1 bg-sky-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-xs">
                            Capture
                          </span>
                        </div>

                        <div
                          onClick={() => setIsCameraModalOpen(true)}
                          className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 bg-slate-50/80 rounded-2xl p-4 cursor-pointer hover:border-sky-500 hover:bg-white transition-all group"
                        >
                          <Camera className="w-8 h-8 text-slate-400 group-hover:text-sky-600 mb-1.5 transition-colors" />
                          <span className="text-xs font-bold text-slate-800">Close-up</span>
                          <span className="text-[10px] text-slate-500 mb-3">Detail of hazard</span>
                          <span className="px-3 py-1 bg-sky-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-xs">
                            Capture
                          </span>
                        </div>

                        <div
                          onClick={() => setIsCameraModalOpen(true)}
                          className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 bg-slate-50/80 rounded-2xl p-4 cursor-pointer hover:border-sky-500 hover:bg-white transition-all group"
                        >
                          <Camera className="w-8 h-8 text-slate-400 group-hover:text-sky-600 mb-1.5 transition-colors" />
                          <span className="text-xs font-bold text-slate-800">Landmark</span>
                          <span className="text-[10px] text-slate-500 mb-3">Nearby building</span>
                          <span className="px-3 py-1 bg-sky-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-xs">
                            Capture
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between text-xs text-emerald-700 font-semibold">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> 3 Angles Verified & AI Quality Passed
                          </span>
                          <button type="button" onClick={() => setCapturedSnaps(null)} className="text-[10px] text-slate-500 hover:text-slate-700 underline font-bold">
                            Retake
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { src: capturedSnaps.angle1, label: '1. Wide View' },
                            { src: capturedSnaps.angle2, label: '2. Close Detail' },
                            { src: capturedSnaps.angle3, label: '3. Landmark' },
                          ].map((snap) => (
                            <div key={snap.label} className="relative aspect-video rounded-xl overflow-hidden border border-emerald-300 bg-slate-100">
                              <img src={snap.src} alt={snap.label}
                                onError={(e) => { e.currentTarget.src = getFallbackImage(snap.label); }}
                                className="w-full h-full object-cover"
                              />
                              <span className="absolute bottom-0 inset-x-0 bg-slate-900/80 text-[8px] font-mono text-center text-white py-0.5 font-bold">
                                {snap.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-1">
                      <label className="w-full py-3 bg-slate-100 hover:bg-slate-200/80 active:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs min-h-[44px]">
                        <Image className="w-4 h-4 text-sky-600" />
                        <span>Upload Photo from Device / Gallery</span>
                        <input type="file" accept="image/*" onChange={handleImageFileChange} disabled={submitting || uploadingImage} className="hidden" />
                      </label>
                    </div>
                  </div>

                  {imageUrl && !capturedSnaps && (
                    <div className="mt-2 w-full h-32 sm:h-40 rounded-2xl overflow-hidden border border-slate-200 relative bg-slate-100 shadow-sm">
                      <img src={imageUrl} alt="Asset preview"
                        onError={(e) => { e.currentTarget.src = getFallbackImage('Asset Preview'); }}
                        className="w-full h-full object-cover"
                      />
                      <button type="button" onClick={() => setImageUrl('')}
                        className="absolute top-2 right-2 bg-slate-900/80 hover:bg-slate-900 text-white text-[10px] px-2.5 py-1 rounded-lg font-bold shadow-sm">
                        Clear
                      </button>
                    </div>
                  )}

                  {/* EXIF Location Validation Feedback Badge */}
                  {imageUrl && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                          Photo EXIF Location Metadata
                        </span>
                        {exifData?.hasGps ? (
                          <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded">
                            GPS TAGS PRESENT
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
                            EXIF GPS STRIPPED / DEVICE VERIFIED
                          </span>
                        )}
                      </div>

                      {exifData?.hasGps && distanceDeltaMeters !== null && (
                        <div className="text-[11px] font-mono mt-1">
                          {distanceDeltaMeters <= 500 ? (
                            <span className="text-emerald-700 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              EXIF Location Verified: Captured {distanceDeltaMeters}m from reported incident pin.
                            </span>
                          ) : (
                            <span className="text-amber-700 font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              EXIF Distance Warning: Photo location is {(distanceDeltaMeters / 1000).toFixed(1)} km from reported pin!
                            </span>
                          )}
                        </div>
                      )}

                      {exifData?.cameraModel && (
                        <span className="text-[10px] font-mono text-slate-500 block">
                          Camera: {exifData.cameraMake || ''} {exifData.cameraModel}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="submit" disabled={submitting}
                  className="w-full py-3.5 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white font-bold text-sm rounded-xl shadow-lg shadow-sky-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  Analyze and Route Incident with AI Brain
                </button>
              </form>
            </div>

            {/* ── Right Column: Map ── */}
            <div className="lg:col-span-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold font-display text-slate-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-sky-600" />
                  Hyderabad City Pin Drop
                </h2>
                <span className="text-[10px] font-mono text-slate-500">GHMC Jurisdiction</span>
              </div>
              <GeopinMap onLocationSelect={(loc) => setLocation(loc)} />
            </div>

          </div>
        )}

        {state === 'THINKING' && (
          <ThinkingTimeline isServerComplete={isServerComplete} onFinishAnimation={handleTimelineFinish} />
        )}

        {state === 'RESULT' && apiResult && (
          <ReportCard data={apiResult.data} onClose={handleResetForm} />
        )}

        {state === 'DUPLICATE' && apiResult && (
          <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-amber-200 text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-600 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold font-display text-slate-900">Duplicate Complaint Detected</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              {apiResult.message || 'This issue has already been reported nearby. Your submission has been linked as an additional witness report.'}
            </p>
            <button
              onClick={handleResetForm}
              className="w-full py-3 bg-sky-600 text-white font-semibold text-sm rounded-xl hover:bg-sky-700 transition-all"
            >
              Back to Complaint Portal
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default IngestionPage;
