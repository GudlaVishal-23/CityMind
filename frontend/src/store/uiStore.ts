import { create } from 'zustand';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role: 'citizen' | 'officer' | 'admin';
}

export interface Notification {
  _id: string;
  incidentId: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface UIState {
  // Auth Session state
  authUser: AuthUser | null;
  setAuthUser: (user: AuthUser | null) => void;

  // Sidebar Layout state
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Map settings
  activeMapLayer: 'streets' | 'satellite' | 'heatmap';
  setMapLayer: (layer: 'streets' | 'satellite' | 'heatmap') => void;

  // Drawer / Telemetry selected target
  selectedIncidentId: string | null;
  setSelectedIncidentId: (id: string | null) => void;

  // Notifications
  notifications: Notification[];
  unreadCount: number;
  setNotifications: (notifications: Notification[], unreadCount: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
  authUser: null,
  setAuthUser: (user) => set({ authUser: user }),

  sidebarOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  activeMapLayer: 'streets',
  setMapLayer: (layer) => set({ activeMapLayer: layer }),

  selectedIncidentId: null,
  setSelectedIncidentId: (id) => set({ selectedIncidentId: id }),

  notifications: [],
  unreadCount: 0,
  setNotifications: (notifications, unreadCount) => set({ notifications, unreadCount }),
}));

export default useUIStore;
