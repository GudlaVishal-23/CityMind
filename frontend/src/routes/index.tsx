import { RouteObject, Navigate } from 'react-router-dom';
import AuthGuard from './AuthGuard';
import LoginPage from '../features/auth/pages/LoginPage';
import IngestionPage from '../features/incidents/pages/IngestionPage';
import CitizenTrackingPage from '../features/incidents/pages/CitizenTrackingPage';
import OfficerDashboardPage from '../features/officer/pages/OfficerDashboardPage';
import OperationsCenterPage from '../features/operations/pages/OperationsCenterPage';

export const routes: RouteObject[] = [
  // Public Paths
  {
    path: '/login',
    element: <LoginPage />
  },
  // Citizen Private Paths
  {
    path: '/citizen',
    element: <AuthGuard allowedRoles={['citizen', 'officer', 'admin']} />,
    children: [
      {
        path: 'report',
        element: <IngestionPage />
      },
      {
        path: 'tracking',
        element: <CitizenTrackingPage />
      },
      {
        path: '',
        element: <Navigate to="report" replace />
      }
    ]
  },
  // Municipal Officer Console Paths
  {
    path: '/officer',
    element: <AuthGuard allowedRoles={['officer', 'admin']} />,
    children: [
      {
        path: '',
        element: <OfficerDashboardPage />
      }
    ]
  },
  // Commissioner & Operator Operations Center Paths
  {
    path: '/ops',
    element: <AuthGuard allowedRoles={['admin']} />,
    children: [
      {
        path: '',
        element: <OperationsCenterPage />
      }
    ]
  },
  // Fallbacks
  {
    path: '*',
    element: <Navigate to="/login" replace />
  }
];

export default routes;
