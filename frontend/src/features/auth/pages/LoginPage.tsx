import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useUIStore from '@store/uiStore';
import { firebaseAuth } from '@config/firebase';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword } from 'firebase/auth';
import { api } from '@config/api';
import {
  Shield, User, Building2, CheckCircle2, ArrowRight,
  Lock, BadgeCheck, MapPin, Zap, Eye, FileSearch, ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';

/* ─── Google Multi-Color SVG ──────────────────────────────────── */
const GoogleIcon = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.07 5.07 0 0 1-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
  </svg>
);

/* ─── Feature Bullet ──────────────────────────────────────────── */
const FeatureItem: React.FC<{ icon: React.ReactNode; title: string; desc: string }> = ({ icon, title, desc }) => (
  <div className="flex items-start gap-3">
    <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
      {icon}
    </div>
    <div>
      <h4 className="text-[13px] font-semibold text-white">{title}</h4>
      <p className="text-[11px] text-sky-200/70 leading-relaxed">{desc}</p>
    </div>
  </div>
);

/* ─── Role Card ───────────────────────────────────────────────── */
const RoleCard: React.FC<{
  name: string; badge: string; color: string; bgGradient: string;
  icon: React.ReactNode; onClick: () => void;
}> = ({ name, badge, color, bgGradient, icon, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full p-4 rounded-2xl text-left flex items-center justify-between group transition-all duration-200 border ${bgGradient} hover:scale-[1.01] active:scale-[0.99]`}
  >
    <div className="flex items-center gap-3">
      <div className={`w-11 h-11 rounded-xl ${color} text-white flex items-center justify-center shadow-lg`}>
        {icon}
      </div>
      <div>
        <h4 className="text-sm font-bold text-slate-900">{name}</h4>
        <span className="text-[10px] font-mono font-semibold text-slate-500 mt-0.5 block">{badge}</span>
      </div>
    </div>
    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-slate-700 transition-all" />
  </button>
);

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const setAuthUser = useUIStore((s) => s.setAuthUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'google' | 'roles' | 'email'>('google');

  /* ── Auth handlers ─────────────────────────────── */
  const loginAsProfile = (user: { id: string; email: string; name: string; role: 'citizen' | 'officer' | 'admin' }) => {
    localStorage.setItem('aicity_user', JSON.stringify(user));
    localStorage.setItem('aicity_dev_token', `dev-${user.role}`);
    setAuthUser(user);
    navigate({ citizen: '/citizen/report', officer: '/officer', admin: '/ops' }[user.role]);
  };

  const loginAs = (role: 'citizen' | 'officer' | 'admin') => {
    const profiles = {
      citizen: { id: 'dev-citizen-vishal-id', email: 'vishal.gudla@citizen.ghmc.gov.in', name: 'Vishal Gudla', role: 'citizen' as const },
      officer: { id: 'dev-officer-id', email: 'officer@ghmc.gov.in', name: 'Inspector Ramesh Kumar', role: 'officer' as const },
      admin:   { id: 'dev-admin-id',   email: 'admin@ghmc.gov.in',   name: 'Commissioner Rajesh Kumar', role: 'admin' as const },
    };
    loginAsProfile(profiles[role]);
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    if (firebaseAuth) {
      try {
        const cred = await signInWithPopup(firebaseAuth, new GoogleAuthProvider());
        const token = await cred.user.getIdToken();
        const res = await api.post('/auth/sync', {}, { headers: { Authorization: `Bearer ${token}` } });
        const u = res.data.data;
        localStorage.setItem('aicity_user', JSON.stringify(u));
        setAuthUser(u);
        navigate({ citizen: '/citizen/report', officer: '/officer', admin: '/ops' }[u.role as string] || '/citizen/report');
        return;
      } catch (e: any) {
        if (e.code !== 'auth/popup-closed-by-user') setError(e.message || 'Authentication failed.');
      } finally { setLoading(false); }
    }
    // Fallback when Firebase keys aren't configured
    setTimeout(() => loginAs('citizen'), 400);
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Please enter email and password.'); return; }
    setLoading(true);
    setError(null);
    if (firebaseAuth) {
      try {
        const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
        const token = await cred.user.getIdToken();
        const res = await api.post('/auth/sync', {}, { headers: { Authorization: `Bearer ${token}` } });
        const u = res.data.data;
        localStorage.setItem('aicity_user', JSON.stringify(u));
        setAuthUser(u);
        navigate({ citizen: '/citizen/report', officer: '/officer', admin: '/ops' }[u.role as string] || '/citizen/report');
        return;
      } catch (e: any) { setError(e.message || 'Authentication failed.'); }
      finally { setLoading(false); }
    }
    loginAs(email.includes('officer') ? 'officer' : email.includes('admin') ? 'admin' : 'citizen');
  };

  /* ── Tab label styling ─────────────────────────── */
  const tabCls = (t: typeof tab) =>
    `flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
      tab === t
        ? 'bg-white text-sky-700 shadow-md border border-sky-100'
        : 'text-slate-500 hover:text-slate-700'
    }`;

  return (
    <div className="min-h-screen flex font-body">

      {/* ═══════════════════════════════════════════════ */}
      {/*  LEFT HERO PANEL                               */}
      {/* ═══════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden bg-gradient-to-br from-sky-700 via-blue-800 to-indigo-900 animated-gradient">
        {/* Decorative blobs */}
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-sky-400/20 blur-3xl float-animation" />
        <div className="absolute bottom-0 right-0 w-[450px] h-[450px] rounded-full bg-amber-400/15 blur-3xl" style={{ animationDelay: '3s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-emerald-400/10 blur-3xl" />

        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Top — Branding */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-xl">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-amber-300 tracking-widest uppercase">Greater Hyderabad Municipal Corporation</span>
                <h1 className="text-xl font-black font-display text-white tracking-tight -mt-0.5">CityMind AI CITY</h1>
              </div>
            </div>
          </div>

          {/* Middle — Tagline + Features */}
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-black font-display text-white leading-tight tracking-tight">
                Autonomous Civic<br />Governance <span className="text-amber-300">Platform</span>
              </h2>
              <p className="text-sm text-sky-200/80 mt-3 max-w-md leading-relaxed">
                AI-powered hazard reporting, real-time complaint tracking, and multi-agent decision intelligence for Hyderabad's 10 million citizens.
              </p>
            </div>

            <div className="space-y-4">
              <FeatureItem
                icon={<Eye className="w-4 h-4 text-sky-300" />}
                title="3-Angle Visual Verification"
                desc="AI validates every photo for blur, luminance, and civic relevance before submission."
              />
              <FeatureItem
                icon={<Zap className="w-4 h-4 text-amber-300" />}
                title="7-Node LangGraph Brain"
                desc="Gemini-powered cognitive pipeline classifies, routes, and explains every decision."
              />
              <FeatureItem
                icon={<MapPin className="w-4 h-4 text-emerald-300" />}
                title="Hyderabad Ward Resolution"
                desc="Geo-verified mapping to GHMC ward boundaries, zones, and department routing."
              />
              <FeatureItem
                icon={<FileSearch className="w-4 h-4 text-rose-300" />}
                title="PDF Audit Certificates"
                desc="Cryptographically signed enterprise audit reports with SHA-256 tamper seals."
              />
            </div>
          </div>

          {/* Bottom — Stat chips */}
          <div className="flex items-center gap-3 flex-wrap">
            {[
              { label: 'Zones', value: '6' },
              { label: 'Wards', value: '150' },
              { label: 'Departments', value: '4' },
              { label: 'AI Nodes', value: '7' },
            ].map((s) => (
              <div key={s.label} className="px-3.5 py-2 bg-white/8 border border-white/10 rounded-xl backdrop-blur-sm">
                <span className="block text-lg font-black font-display text-white">{s.value}</span>
                <span className="text-[9px] font-mono text-sky-300/70 uppercase tracking-wider">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/*  RIGHT AUTH PANEL                              */}
      {/* ═══════════════════════════════════════════════ */}
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 via-sky-50/30 to-white p-6 sm:p-10 relative overflow-hidden">
        {/* Subtle decorative glows */}
        <div className="absolute top-10 right-10 w-72 h-72 bg-sky-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-72 h-72 bg-amber-200/20 rounded-full blur-3xl" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md relative z-10"
        >
          {/* Mobile-only branding bar */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-2.5 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-600 to-blue-700 flex items-center justify-center shadow-lg">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <span className="text-[9px] font-mono font-bold text-amber-600 tracking-widest uppercase block">GHMC</span>
                <h1 className="text-lg font-black font-display text-slate-900 -mt-0.5">AI CITY</h1>
              </div>
            </div>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">Greater Hyderabad Municipal Corporation — Autonomous Civic Governance</p>
          </div>

          {/* Welcome */}
          <div className="mb-7">
            <h2 className="text-2xl font-black font-display text-slate-900 tracking-tight">Welcome Back</h2>
            <p className="text-sm text-slate-500 mt-1">Sign in to access the GHMC civic operations platform.</p>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl font-medium"
            >
              {error}
            </motion.div>
          )}

          {/* Tab Switcher */}
          <div className="flex gap-1.5 bg-slate-100 p-1.5 rounded-2xl mb-6 border border-slate-200/60">
            <button onClick={() => setTab('google')} className={tabCls('google')}>Google</button>
            <button onClick={() => setTab('roles')}  className={tabCls('roles')}>Role Profiles</button>
            <button onClick={() => setTab('email')}  className={tabCls('email')}>Email</button>
          </div>

          {/* ── TAB: Google Auth ─────────────────── */}
          {tab === 'google' && (
            <motion.div key="g" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <button
                onClick={handleGoogle}
                disabled={loading}
                className="w-full py-4 px-5 bg-white hover:bg-slate-50/80 border-2 border-slate-200 hover:border-sky-400 rounded-2xl shadow-sm hover:shadow-lg transition-all flex items-center justify-center gap-3 group"
              >
                <GoogleIcon />
                <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">
                  {loading ? 'Connecting to Google...' : 'Continue with Google'}
                </span>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-sky-500 group-hover:translate-x-1 transition-all" />
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-[10px] text-slate-400 font-mono uppercase">or select a role</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              <button
                onClick={() => setTab('roles')}
                className="w-full py-3 px-4 bg-gradient-to-r from-sky-50 to-blue-50 hover:from-sky-100 hover:to-blue-100 border border-sky-200 rounded-2xl text-sm font-semibold text-sky-700 transition-all"
              >
                Browse GHMC Role Profiles →
              </button>

              {/* Info chip */}
              <div className="p-3.5 bg-sky-50 border border-sky-100 rounded-xl flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-sky-800 leading-relaxed">
                  <strong>Secure Google SSO</strong> connects directly to your GHMC citizen profile for complaint filing, live tracking, and AI audit access.
                </p>
              </div>
            </motion.div>
          )}

          {/* ── TAB: Role Profiles ──────────────── */}
          {tab === 'roles' && (
            <motion.div key="r" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono mb-1">Citizen Profiles</div>
              <RoleCard
                name="Vishal Gudla"
                badge="Lead Citizen • Serilingampally / Hitec City"
                color="bg-emerald-600"
                bgGradient="bg-gradient-to-r from-emerald-50 to-teal-50/60 border-emerald-200/70 hover:border-emerald-300"
                icon={<User className="w-5 h-5" />}
                onClick={() => loginAsProfile({ id: 'dev-citizen-vishal-id', email: 'vishal.gudla@citizen.ghmc.gov.in', name: 'Vishal Gudla', role: 'citizen' })}
              />
              <RoleCard
                name="Ananya Reddy"
                badge="Citizen • Khairatabad / Banjara Hills"
                color="bg-teal-600"
                bgGradient="bg-gradient-to-r from-teal-50 to-cyan-50/60 border-teal-200/70 hover:border-teal-300"
                icon={<User className="w-5 h-5" />}
                onClick={() => loginAsProfile({ id: 'dev-citizen-ananya-id', email: 'ananya.reddy@citizen.ghmc.gov.in', name: 'Ananya Reddy', role: 'citizen' })}
              />
              <RoleCard
                name="Karthik Rao"
                badge="Citizen • Charminar / Old City"
                color="bg-indigo-600"
                bgGradient="bg-gradient-to-r from-indigo-50 to-sky-50/60 border-indigo-200/70 hover:border-indigo-300"
                icon={<User className="w-5 h-5" />}
                onClick={() => loginAsProfile({ id: 'dev-citizen-karthik-id', email: 'karthik.rao@citizen.ghmc.gov.in', name: 'Karthik Rao', role: 'citizen' })}
              />
              
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono mt-4 mb-1">Administrative & Field Roles</div>
              <RoleCard
                name="Inspector Ramesh Kumar"
                badge="Municipal Field Officer Console"
                color="bg-sky-600"
                bgGradient="bg-gradient-to-r from-sky-50 to-blue-50/60 border-sky-200/70 hover:border-sky-300"
                icon={<BadgeCheck className="w-5 h-5" />}
                onClick={() => loginAs('officer')}
              />
              <RoleCard
                name="Commissioner Rajesh Kumar"
                badge="GHMC Operations Control Center"
                color="bg-amber-500"
                bgGradient="bg-gradient-to-r from-amber-50 to-orange-50/60 border-amber-200/70 hover:border-amber-300"
                icon={<Shield className="w-5 h-5" />}
                onClick={() => loginAs('admin')}
              />
            </motion.div>
          )}

          {/* ── TAB: Email ──────────────────────── */}
          {tab === 'email' && (
            <motion.div key="e" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <form onSubmit={handleEmail} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="citizen@ghmc.gov.in"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white font-bold text-sm rounded-xl shadow-lg shadow-sky-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  {loading ? 'Authenticating...' : 'Sign In'}
                </button>
              </form>
            </motion.div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Official GHMC Civic Service Platform • Hyderabad, Telangana
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;
