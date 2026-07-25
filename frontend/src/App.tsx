import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import routes from './routes';

const router = createBrowserRouter(routes);

export const App: React.FC = () => {
  return <RouterProvider router={router} />;
};

export default App;
