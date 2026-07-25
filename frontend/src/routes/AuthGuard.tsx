import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useUIStore from '@store/uiStore';
import { isAuthBypassed } from '@config/firebase';

interface AuthGuardProps {
  allowedRoles: ('citizen' | 'officer' | 'admin')[];
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ allowedRoles }) => {
  const { authUser, setAuthUser } = useUIStore();

  useEffect(() => {
    // Attempt local state recovery on reload
    if (!authUser) {
      const storedUser = localStorage.getItem('aicity_user');
      if (storedUser) {
        try {
          setAuthUser(JSON.parse(storedUser));
        } catch (e) {
          localStorage.removeItem('aicity_user');
        }
      } else if (isAuthBypassed) {
        // Auto-login citizen in developer bypass mode if no session is set
        const defaultDevUser = {
          id: 'dev-citizen-vishal-id',
          email: 'vishal.gudla@citizen.ghmc.gov.in',
          name: 'Vishal Gudla',
          role: 'citizen' as const
        };
        localStorage.setItem('aicity_user', JSON.stringify(defaultDevUser));
        localStorage.setItem('aicity_dev_token', 'dev-citizen');
        setAuthUser(defaultDevUser);
      }
    }
  }, [authUser, setAuthUser]);

  if (!authUser) {
    const hasStoredSession = !!localStorage.getItem('aicity_user');
    if (hasStoredSession) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 text-sm font-mono font-semibold">
          Connecting to city grid...
        </div>
      );
    }
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(authUser.role)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/40 to-slate-100 flex flex-col items-center justify-center p-6 text-center font-body">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl max-w-md w-full space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-red-100 border border-red-200 text-red-600 flex items-center justify-center mx-auto shadow-sm">
            🔒
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-1">GHMC Security Policy</span>
            <h1 className="text-xl font-black font-display text-slate-900 tracking-tight">Access Unauthorized</h1>
          </div>
          <p className="text-slate-500 text-xs leading-relaxed max-w-xs mx-auto">
            Your account role <span className="font-mono font-bold text-slate-800">[{authUser.role}]</span> is not authorized to access this municipal console.
          </p>
          <button
            onClick={() => {
              localStorage.clear();
              setAuthUser(null);
              window.location.href = '/login';
            }}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all"
          >
            Reset Session & Switch Role Profile
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
};

export default AuthGuard;
