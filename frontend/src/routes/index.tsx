import React, { Suspense } from 'react';
import { RouteObject, Navigate } from 'react-router-dom';
import AuthGuard from './AuthGuard';
import TacticalRouteSkeleton from '../components/ui/TacticalRouteSkeleton';

// Lazy-loaded route modules (Google Web.dev Core Web Vitals)
const LoginPage = React.lazy(() => import('../features/auth/pages/LoginPage'));
const IngestionPage = React.lazy(() => import('../features/incidents/pages/IngestionPage'));
const CitizenTrackingPage = React.lazy(() => import('../features/incidents/pages/CitizenTrackingPage'));
const OfficerDashboardPage = React.lazy(() => import('../features/officer/pages/OfficerDashboardPage'));
const OperationsCenterPage = React.lazy(() => import('../features/operations/pages/OperationsCenterPage'));

const LazyView: React.FC<{ component: React.ComponentType }> = ({ component: Component }) => (
  <Suspense fallback={<TacticalRouteSkeleton />}>
    <Component />
  </Suspense>
);

export const routes: RouteObject[] = [
  // Public Paths
  {
    path: '/login',
    element: <LazyView component={LoginPage} />
  },
  // Citizen Private Paths
  {
    path: '/citizen',
    element: <AuthGuard allowedRoles={['citizen', 'officer', 'admin']} />,
    children: [
      {
        path: 'report',
        element: <LazyView component={IngestionPage} />
      },
      {
        path: 'tracking',
        element: <LazyView component={CitizenTrackingPage} />
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
        element: <LazyView component={OfficerDashboardPage} />
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
        element: <LazyView component={OperationsCenterPage} />
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
