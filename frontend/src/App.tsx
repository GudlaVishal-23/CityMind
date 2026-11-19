import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import routes from './routes';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ChunkErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 p-8 flex items-center justify-center text-slate-100 font-sans">
          <div className="max-w-md w-full bg-slate-900/90 backdrop-blur-xl border border-rose-500/30 p-6 rounded-2xl shadow-2xl flex flex-col gap-4 text-center">
            <div className="h-12 w-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400 text-xl font-mono">
              !
            </div>
            <h2 className="text-lg font-semibold text-rose-400">Tactical Module Load Failure</h2>
            <p className="text-sm text-slate-400">
              A network interruption or updated server deployment prevented this tactical module from loading.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-cyan-600/20 transition-all focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
            >
              Reload Operations Console
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const router = createBrowserRouter(routes);

export const App: React.FC = () => {
  return (
    <ChunkErrorBoundary>
      <RouterProvider router={router} />
      <Toaster
        theme="dark"
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          className: 'bg-slate-900/95 backdrop-blur-xl border border-white/[0.08] text-slate-100 font-sans shadow-2xl rounded-xl',
        }}
      />
    </ChunkErrorBoundary>
  );
};

export default App;
