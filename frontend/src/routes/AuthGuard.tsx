import React from 'react';
import { ProtectedRoute, ProtectedRouteProps } from '../components/auth/ProtectedRoute';

export const AuthGuard: React.FC<ProtectedRouteProps> = (props) => {
  return <ProtectedRoute {...props} />;
};

export default AuthGuard;
