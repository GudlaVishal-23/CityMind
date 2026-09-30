import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import useUIStore from '@store/uiStore';
import { api } from '@config/api';
import { 
  LogOut, MapPin, Search, 
  Activity, Cpu, Layers, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import NotificationBell from '../../notifications/NotificationBell';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import XAIAuditTelemetryCard from '../components/XAIAuditTelemetryCard';

// Custom Leaflet Marker Icons mapping to threat severity levels
const getMarkerIcon = (severity: string) => {
  let color = 'bg-[#3b82f6]'; // Low -> Blue
  if (severity === 'Critical') color = 'bg-[#ef4444] animate-pulse border-red-500';
  else if (severity === 'High') color = 'bg-[#f97316] border-orange-500';
  else if (severity === 'Medium') color = 'bg-[#eab308] border-yellow-500';
  
  return L.divIcon({
    html: `<div class="relative flex items-center justify-center w-6 h-6">
             <div class="absolute w-5 h-5 rounded-full ${color} opacity-75"></div>
             <div class="relative w-3 h-3 rounded-full bg-white border border-black/30"></div>
           </div>`,
    className: 'custom-ops-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

// Map Recenter Component helper
const MapRecenter: React.FC<{ center: [number, number]; zoom?: number }> = ({ center, zoom = 14 }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true, duration: 0.8 });
  }, [center, zoom, map]);
  return null;
};

export const OperationsCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const { authUser, setAuthUser } = useUIStore();
  
  // Data lists state
  const [incidents, setIncidents] = useState<any[]>([]);
  const [healthData, setHealthData] = useState<any>({
    globalHealthIndex: 100,
    departments: { PWD: 100, ELECTRICITY: 100, WATER_BOARD: 100, SANITATION: 100 },
    activeIncidents: { Critical: 0, High: 0, Medium: 0, Low: 0 }
  });
  
  // Loading & Selection state
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [auditLog, setAuditLog] = useState<any | null>(null);
  const [loadingAudit, setLoadingAudit] = useState(false);
  
  // Search / Filters state
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Override Form state
  const [overrideSeverity, setOverrideSeverity] = useState<string>('');
  const [overrideDept, setOverrideDept] = useState<string>('');
  const [overrideReason, setOverrideReason] = useState('');
  const [submittingOverride, setSubmittingOverride] = useState(false);
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [overrideSuccess, setOverrideSuccess] = useState<string | null>(null);
  
  // Resolve Action state
  const [resolving, setResolving] = useState(false);

  // Fetch Dashboard Stats & Queue
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [incidentsRes, healthRes] = await Promise.all([
        api.get('/incidents?all=true&limit=100'),
        api.get('/analytics/health')
      ]);
      
      const loadedIncidents = incidentsRes.data.data.incidents || [];
      setIncidents(loadedIncidents);
      if (loadedIncidents.length > 0 && !selectedIncident) {
        setSelectedIncident(loadedIncidents[0]);
        fetchIncidentAudit(loadedIncidents[0]._id);
      }
      setHealthData(healthRes.data.data || {
        globalHealthIndex: 100,
        departments: { PWD: 100, ELECTRICITY: 100, WATER_BOARD: 100, SANITATION: 100 },
        activeIncidents: { Critical: 0, High: 0, Medium: 0, Low: 0 }
      });
    } catch (err) {
      console.error('[OperationsCenterPage] Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Fetch Audit Log for the Selected Incident
  const fetchIncidentAudit = async (id: string) => {
    try {
      setLoadingAudit(true);
      setAuditLog(null);
      setOverrideError(null);
      setOverrideSuccess(null);
      
      const res = await api.get(`/incidents/${id}/audit`);
      setAuditLog(res.data.data);
      
      // Seed default override values
      const incident = incidents.find(x => x._id === id);
      if (incident) {
        setOverrideSeverity(incident.severity);
        setOverrideDept(incident.department);
      }
    } catch (err: any) {
      console.error('[OperationsCenterPage] Error fetching incident audit:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleSelectIncident = (incident: any) => {
    setSelectedIncident(incident);
    setOverrideReason('');
    fetchIncidentAudit(incident._id);
  };

  // Submit Operator Override to Backend
  const handleApplyOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident) return;
    if (overrideReason.length < 15) {
      setOverrideError('Override justification must be at least 15 characters long.');
      return;
    }

    setSubmittingOverride(true);
    setOverrideError(null);
    setOverrideSuccess(null);

    try {
      const res = await api.patch(`/incidents/${selectedIncident._id}/override`, {
        severity: overrideSeverity,
        department: overrideDept,
        reason: overrideReason
      });

      if (res.data.success) {
        setOverrideSuccess('Incident successfully overridden and routed to In Progress.');
        setOverrideReason('');
        
        // Refresh local data
        await fetchDashboardData();
        
        // Update selected view
        const updated = incidents.find(x => x._id === selectedIncident._id);
        if (updated) {
          setSelectedIncident({
            ...selectedIncident,
            severity: overrideSeverity,
            department: overrideDept,
            status: 'In_Progress'
          });
        }
        
        // Re-fetch audit
        fetchIncidentAudit(selectedIncident._id);
      }
    } catch (err: any) {
      setOverrideError(err.response?.data?.error?.message || 'Failed to submit override.');
    } finally {
      setSubmittingOverride(false);
    }
  };

  // Resolve Incident Action
  const handleResolveIncident = async () => {
    if (!selectedIncident) return;
    setResolving(true);
    try {
      await api.patch(`/incidents/${selectedIncident._id}/status`, {
        status: 'Resolved'
      });
      setOverrideSuccess('Incident marked as Resolved.');
      
      // Close selected or refresh
      setSelectedIncident(null);
      setAuditLog(null);
      await fetchDashboardData();
    } catch (err: any) {
      setOverrideError(err.response?.data?.error?.message || 'Failed to update status.');
    } finally {
      setResolving(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setAuthUser(null);
    navigate('/login');
  };

  // Filters logic
  const filteredIncidents = incidents.filter((inc) => {
    const matchesSearch = 
      inc.title.toLowerCase().includes(search.toLowerCase()) || 
      inc.description.toLowerCase().includes(search.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || inc.severity === severityFilter;
    const matchesDept = deptFilter === 'all' || inc.department === deptFilter;
    const matchesStatus = statusFilter === 'all' || inc.status === statusFilter || (statusFilter === 'Assigned' && (inc.status === 'Assigned' || inc.status === 'AI_Assigned')) || (statusFilter === 'AI_Assigned' && (inc.status === 'Assigned' || inc.status === 'AI_Assigned'));
    return matchesSearch && matchesSeverity && matchesDept && matchesStatus;
  });

  // Calculate default position or center on selected incident
  const mapCenter: [number, number] = selectedIncident && selectedIncident.location
    ? [selectedIncident.location.coordinates[1], selectedIncident.location.coordinates[0]]
    : [17.4435, 78.3772];

  const severityColors = {
    Critical: 'text-[#ef4444] bg-[#ef4444]/10 border-[#ef4444]/20 shadow-[#ef4444]/10',
    High: 'text-[#f97316] bg-[#f97316]/10 border-[#f97316]/20 shadow-[#f97316]/10',
    Medium: 'text-[#eab308] bg-[#eab308]/10 border-[#eab308]/20 shadow-[#eab308]/10',
    Low: 'text-[#3b82f6] bg-[#3b82f6]/10 border-[#3b82f6]/20 shadow-[#3b82f6]/10'
  };

  const deptNames = {
    PWD: 'Public Works (PWD)',
    ELECTRICITY: 'Electricity Board',
    WATER_BOARD: 'Water Supply Board',
    SANITATION: 'Sanitation & Waste'
  };

  const healthScoreColor = (score: number) => {
    if (score >= 90) return 'text-[#22c55e]'; // Green
    if (score >= 70) return 'text-[#eab308]'; // Yellow
    return 'text-[#ef4444]'; // Red
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/40 to-slate-100 flex flex-col font-body text-slate-800">
      {/* Top Header */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-0 sm:h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center font-black text-white font-display text-xs sm:text-sm shadow-md shadow-sky-500/20 shrink-0">
              CM
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-xs sm:text-base font-black font-display text-slate-900 tracking-tight truncate">CityMind</span>
              <span className="text-[9px] sm:text-[10px] bg-sky-100 text-sky-800 border border-sky-200/80 px-1.5 py-0.5 rounded-lg font-mono uppercase font-bold truncate">
                Ops Control
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs">
              <User className="w-3.5 h-3.5 text-sky-600" />
              <span className="font-mono text-slate-700 font-semibold truncate max-w-[140px]">{authUser?.email || 'admin@ghmc.gov.in'}</span>
            </div>
            <button
              onClick={() => navigate('/citizen/report')}
              className="px-3 py-1.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
            >
              Citizen Node
            </button>
            <NotificationBell />
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Stats Banner */}
      <section className="bg-white/60 border-b border-slate-200/70 py-6 backdrop-blur-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <AnalyticsDashboard data={healthData} />

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 border-t border-slate-200/80 pt-6">
            
            {/* Global City Health Index */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-center items-center text-center">
              <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider font-bold mb-1">City Health Index</span>
              <div className={`text-3xl font-black font-display ${healthScoreColor(healthData.globalHealthIndex)}`}>
                {healthData.globalHealthIndex}%
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden border border-slate-200/50">
                <div 
                  className="h-full bg-sky-500 transition-all duration-500 rounded-full" 
                  style={{ width: `${healthData.globalHealthIndex}%` }}
                />
              </div>
            </div>

            {/* Department Indices */}
            <div className="md:col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.entries(healthData.departments || {}).map(([dept, val]: [string, any]) => (
                <div key={dept} className="p-3.5 bg-white border border-slate-200/80 rounded-2xl flex items-center justify-between shadow-xs">
                  <div>
                    <span className="block text-[9px] text-slate-400 uppercase font-mono font-bold">{dept}</span>
                    <span className="text-xs font-bold text-slate-800">{deptNames[dept as keyof typeof deptNames]}</span>
                  </div>
                  <span className={`text-base font-black font-mono ${healthScoreColor(val)}`}>
                    {val}%
                  </span>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* Primary Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Filter and Ingest Queue (Incident list) */}
        <section className="lg:col-span-5 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-extrabold font-display text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-600 animate-pulse" />
              Operations Ingest Queue
            </h2>
            <span className="text-[10px] bg-sky-50 border border-sky-200/80 text-sky-800 font-mono px-2.5 py-1 rounded-xl font-bold">
              {filteredIncidents.length} of {incidents.length} active
            </span>
          </div>

          {/* Search and Filters panel */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search incident descriptions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-sky-400 transition-colors font-medium"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[8px] text-slate-400 uppercase font-mono mb-1 font-bold">Severity</label>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-800 font-semibold focus:outline-none focus:border-sky-400"
                >
                  <option value="all">All</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-[8px] text-slate-400 uppercase font-mono mb-1 font-bold">Department</label>
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-800 font-semibold focus:outline-none focus:border-sky-400"
                >
                  <option value="all">All</option>
                  <option value="PWD">PWD</option>
                  <option value="ELECTRICITY">Electricity</option>
                  <option value="WATER_BOARD">Water Board</option>
                  <option value="SANITATION">Sanitation</option>
                </select>
              </div>

              <div>
                <label className="block text-[8px] text-slate-400 uppercase font-mono mb-1 font-bold">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-800 font-semibold focus:outline-none focus:border-sky-400"
                >
                  <option value="all">All</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Assigned">Assigned / AI Assigned</option>
                  <option value="In_Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>
            </div>
          </div>

          {/* Incidents List Cards */}
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {loading ? (
              <div className="text-center py-12 text-xs text-slate-500 font-mono">Loading active incident records...</div>
            ) : filteredIncidents.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-500 bg-white border border-dashed border-slate-300 rounded-2xl">
                No matching incidents in current grid filters.
              </div>
            ) : (
              filteredIncidents.map((inc) => {
                const isSelected = selectedIncident?._id === inc._id;
                return (
                  <div
                    key={inc._id}
                    onClick={() => handleSelectIncident(inc)}
                    className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex gap-4 ${
                      isSelected 
                        ? 'bg-sky-50/90 border-sky-400 shadow-md shadow-sky-500/10 ring-2 ring-sky-400/20' 
                        : 'bg-white border-slate-200/80 hover:border-sky-300 hover:shadow-xs'
                    }`}
                  >
                    <img 
                      src={inc.imageUrl} 
                      alt="asset preview" 
                      className="w-16 h-16 rounded-xl object-cover border border-slate-200 shadow-xs" 
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs font-bold text-slate-900 truncate">{inc.title}</h3>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 mb-2">
                        {inc.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`px-2 py-0.5 border text-[9px] font-bold rounded-lg font-mono ${severityColors[inc.severity as keyof typeof severityColors]}`}>
                          {inc.severity}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 text-[9px] font-bold rounded-lg font-mono">
                          {inc.department}
                        </span>
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded-lg font-mono ${
                          inc.status === 'Resolved' ? 'bg-emerald-100 border border-emerald-300 text-emerald-800' :
                          inc.status === 'In_Progress' ? 'bg-amber-100 border border-amber-300 text-amber-800' :
                          'bg-sky-100 border border-sky-300 text-sky-800'
                        }`}>
                          {inc.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Right Side: Map & AI Decision auditing & Overrides */}
        <section className="lg:col-span-7 space-y-6">
          <AnimatePresence mode="wait">
            {!selectedIncident ? (
              // Map Overview showing ALL incident pins in grid
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-bold font-display text-slate-900 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-sky-600" />
                    City Hazard Spatial Map
                  </h3>
                  <span className="text-[10px] text-slate-500 font-mono font-bold">
                    Overview of active pins
                  </span>
                </div>

                <div className="w-full h-96 rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs relative z-0">
                  <MapContainer
                    center={[17.4435, 78.3772]}
                    zoom={12}
                    style={{ width: '100%', height: '100%', background: '#f8fafc' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    
                    {filteredIncidents.map((inc) => (
                      <Marker 
                        key={inc._id}
                        position={[inc.location.coordinates[1], inc.location.coordinates[0]]} 
                        icon={getMarkerIcon(inc.severity)}
                      >
                        <Popup>
                          <div className="text-xs p-1 text-slate-900">
                            <p className="font-bold">{inc.title}</p>
                            <p className="text-[10px] text-slate-600 mt-0.5">{inc.department} | {inc.severity}</p>
                            <button
                              onClick={() => handleSelectIncident(inc)}
                              className="text-[10px] text-sky-600 font-bold mt-1 block hover:underline"
                            >
                              Inspect Details →
                            </button>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
              </motion.div>
            ) : (
              // Inspection and Telemetry Panel
              <motion.div
                key="inspection"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <button 
                    onClick={() => { setSelectedIncident(null); setAuditLog(null); }}
                    className="text-xs text-sky-600 font-bold hover:underline flex items-center gap-1"
                  >
                    ← Back to Spatial Overview
                  </button>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    TICKET REF: #{selectedIncident._id.substring(18)}
                  </span>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-md space-y-6">
                  {/* Headline */}
                  <div>
                    <h3 className="text-lg font-black font-display text-slate-900">{selectedIncident.title}</h3>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed font-medium">
                      {selectedIncident.description}
                    </p>
                  </div>

                  {/* Asset and Map split preview */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="h-56 rounded-xl overflow-hidden border border-slate-200 shadow-xs">
                      <img 
                        src={selectedIncident.imageUrl} 
                        alt="Visual evidence" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    <div className="h-56 rounded-xl overflow-hidden border border-slate-200 shadow-xs z-0">
                      <MapContainer
                        center={mapCenter}
                        zoom={14}
                        style={{ width: '100%', height: '100%', background: '#f8fafc' }}
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Marker position={mapCenter} icon={getMarkerIcon(selectedIncident.severity)} />
                        <MapRecenter center={mapCenter} />
                      </MapContainer>
                    </div>
                  </div>

                  {/* AI Brain Telemetry Log */}
                  <div className="border-t border-slate-200/80 pt-6">
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-sky-600 animate-pulse" />
                      AI CITY Decision Telemetry
                    </h4>

                    {loadingAudit ? (
                      <div className="text-center py-6 text-xs text-slate-500 animate-pulse font-mono">
                        Retrieving cognitive logs from AI CITY Brain...
                      </div>
                    ) : auditLog ? (
                      <XAIAuditTelemetryCard
                        auditLog={auditLog}
                        incident={selectedIncident}
                      />
                    ) : (
                      <div className="text-center py-4 text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl font-mono">
                        Telemetry logs unavailable for this record.
                      </div>
                    )}
                  </div>

                  {/* Overrides and status actions */}
                  <div className="border-t border-slate-200/80 pt-6">
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-sky-600" />
                      Administrative Overrides
                    </h4>

                    {overrideError && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl mb-4 font-medium">
                        {overrideError}
                      </div>
                    )}

                    {overrideSuccess && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl mb-4 font-semibold">
                        {overrideSuccess}
                      </div>
                    )}

                    {selectedIncident.status === 'Resolved' ? (
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-emerald-800 text-xs font-bold">
                        ✓ This incident has been marked as RESOLVED and operations are closed.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <form onSubmit={handleApplyOverride} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[9px] text-slate-400 uppercase font-mono mb-1 font-bold">Adjust Severity</label>
                            <select
                              value={overrideSeverity}
                              onChange={(e) => setOverrideSeverity(e.target.value)}
                              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:border-sky-400"
                            >
                              <option value="Low">Low</option>
                              <option value="Medium">Medium</option>
                              <option value="High">High</option>
                              <option value="Critical">Critical</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[9px] text-slate-400 uppercase font-mono mb-1 font-bold">Reroute Department</label>
                            <select
                              value={overrideDept}
                              onChange={(e) => setOverrideDept(e.target.value)}
                              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:border-sky-400"
                            >
                              <option value="PWD">PWD</option>
                              <option value="ELECTRICITY">ELECTRICITY</option>
                              <option value="WATER_BOARD">WATER_BOARD</option>
                              <option value="SANITATION">SANITATION</option>
                            </select>
                          </div>

                          <div className="sm:col-span-2">
                            <label className="flex justify-between text-[9px] text-slate-400 uppercase font-mono mb-1 font-bold">
                              <span>Override Reason (Min 15 chars)</span>
                              <span className={overrideReason.length >= 15 ? 'text-emerald-600' : 'text-amber-600'}>
                                {overrideReason.length} characters
                              </span>
                            </label>
                            <textarea
                              rows={2}
                              value={overrideReason}
                              onChange={(e) => setOverrideReason(e.target.value)}
                              placeholder="Describe the operational reason for modifying the AI routing allocation..."
                              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-sky-400 font-medium"
                            />
                          </div>

                          <div className="sm:col-span-2 flex gap-3">
                            <button
                              type="submit"
                              disabled={submittingOverride || overrideReason.length < 15}
                              className="flex-1 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
                            >
                              {submittingOverride ? 'Applying Override...' : '⚡ Apply Administrative Override'}
                            </button>

                            <button
                              type="button"
                              onClick={handleResolveIncident}
                              disabled={resolving}
                              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs"
                            >
                              {resolving ? 'Resolving...' : '✓ Resolve Incident'}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

      </main>
    </div>
  );
};

export default OperationsCenterPage;
