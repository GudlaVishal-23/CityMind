import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './assets/index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Failed to find the root element to bootstrap application.');
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
