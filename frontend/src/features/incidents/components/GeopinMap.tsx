import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Compass, Navigation, Loader2 } from 'lucide-react';

const customIcon = L.divIcon({
  html: `<div class="relative flex items-center justify-center w-7 h-7">
           <div class="absolute w-7 h-7 rounded-full bg-[#0284C7]/40 animate-ping"></div>
           <div class="relative w-4 h-4 rounded-full bg-[#0284C7] border-2 border-white shadow-lg"></div>
         </div>`,
  className: 'custom-pin-marker',
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

interface GeopinMapProps {
  onLocationSelect: (location: { lat: number; lng: number; locationName?: string; isExactGps?: boolean }) => void;
}

const HYDERABAD_LOCATIONS = [
  { name: 'Hitec City / Madhapur', lat: 17.4435, lng: 78.3772 },
  { name: 'Banjara Hills Road #12', lat: 17.4156, lng: 78.4347 },
  { name: 'Charminar Heritage Zone', lat: 17.3616, lng: 78.4747 },
  { name: 'Jubilee Hills Checkpost', lat: 17.4319, lng: 78.4071 },
  { name: 'Gachibowli Financial Dist', lat: 17.4401, lng: 78.3489 },
  { name: 'Begumpet Airport Zone', lat: 17.4448, lng: 78.4682 },
  { name: 'Secunderabad Station', lat: 17.4399, lng: 78.4983 }
];

const MapEventsHandler: React.FC<{ onClick: (lat: number, lng: number) => void }> = ({ onClick }) => {
  useMapEvents({ click(e) { onClick(e.latlng.lat, e.latlng.lng); } });
  return null;
};

const MapController: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  React.useEffect(() => { map.setView(center, 15, { animate: true }); }, [center, map]);
  return null;
};

export const GeopinMap: React.FC<GeopinMapProps> = ({ onLocationSelect }) => {
  const defaultPosition: [number, number] = [17.3850, 78.4867];
  const [markerPos, setMarkerPos] = useState<[number, number] | null>([17.4435, 78.3772]);
  const [activeLocName, setActiveLocName] = useState<string>('Hitec City / Madhapur, Hyderabad');
  const [locating, setLocating] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

  const handleMapClick = (lat: number, lng: number, locName?: string, isExactGps = false) => {
    setMarkerPos([lat, lng]);
    const name = locName || `Exact Pin (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    setActiveLocName(name);
    onLocationSelect({ lat, lng, locationName: name, isExactGps });
  };

  const handleUseExactLocation = () => {
    if (!navigator.geolocation) {
      alert('Browser geolocation is not supported on this device.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        setGpsAccuracy(Math.round(accuracy));
        setLocating(false);

        // Attempt reverse geocoding via Nominatim
        let resolvedName = `Exact GPS (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
          if (res.ok) {
            const data = await res.json();
            if (data.display_name) {
              const parts = data.display_name.split(',');
              resolvedName = `${parts.slice(0, 3).join(',')} [GPS Accurate]`;
            }
          }
        } catch {
          // fallback to coordinate string
        }

        handleMapClick(lat, lng, resolvedName, true);
      },
      (err) => {
        setLocating(false);
        console.warn('[GeopinMap] Geolocation error:', err);
        alert('Could not acquire your exact location. Please select a zone or click directly on the map.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="w-full space-y-3">
      {/* Top Bar with Use My Exact Location Button + Quick Selectors */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleUseExactLocation}
          disabled={locating}
          className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-[0.98] shrink-0 min-h-[44px]"
        >
          {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
          <span>{locating ? 'Acquiring GPS...' : '📍 Use My Exact Location'}</span>
        </button>

        {gpsAccuracy && (
          <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg font-bold text-center">
            GPS Accuracy: ±{gpsAccuracy}m
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 custom-scrollbar">
        <span className="text-[10px] font-mono text-slate-500 uppercase font-bold shrink-0 flex items-center gap-1">
          <Compass className="w-3 h-3 text-sky-600" /> Quick Zones:
        </span>
        {HYDERABAD_LOCATIONS.map((loc) => (
          <button
            key={loc.name}
            type="button"
            onClick={() => handleMapClick(loc.lat, loc.lng, `${loc.name}, Hyderabad`)}
            className={`px-3 py-1.5 text-[10px] font-mono rounded-lg border transition-all shrink-0 min-h-[32px] ${
              markerPos && markerPos[0] === loc.lat && markerPos[1] === loc.lng
                ? 'bg-sky-600 text-white border-sky-600 font-bold shadow-md shadow-sky-600/20'
                : 'bg-white border-slate-200 text-slate-600 hover:text-sky-700 hover:border-sky-300 hover:bg-sky-50'
            }`}
          >
            {loc.name}
          </button>
        ))}
      </div>

      {/* Map Container — Light Voyager Tile Layer */}
      <div className="w-full h-72 sm:h-96 rounded-2xl overflow-hidden border border-sky-200 relative z-0 shadow-lg">
        <MapContainer
          center={defaultPosition}
          zoom={13}
          style={{ width: '100%', height: '100%', background: '#F1F5F9' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapEventsHandler onClick={(lat, lng) => handleMapClick(lat, lng)} />
          {markerPos && <MapController center={markerPos} />}

          {markerPos && (
            <Marker position={markerPos} icon={customIcon}>
              <Popup className="custom-leaflet-popup">
                <div className="p-1 text-xs font-mono">
                  <strong className="text-sky-700 block">{activeLocName}</strong>
                  <span className="text-slate-500">GHMC Municipal Pin</span>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>

        <div className="absolute bottom-3 left-3 z-[400] bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-sky-200 text-[10px] font-mono text-slate-700 flex items-center gap-2 shadow-md max-w-[85%] truncate">
          <MapPin className="w-3.5 h-3.5 text-sky-600 animate-pulse shrink-0" />
          <span className="truncate">GHMC Pin: <strong className="text-sky-700">{activeLocName}</strong></span>
        </div>
      </div>
    </div>
  );
};

export default GeopinMap;
