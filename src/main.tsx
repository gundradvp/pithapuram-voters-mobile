import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';
import { safeStorage } from './utils/safeStorage';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('RootErrorBoundary caught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleClearCacheAndReset = () => {
    try {
      safeStorage.clear();
      if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center justify-center font-sans space-y-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-600/20 text-red-400 border border-red-500/40 flex items-center justify-center text-3xl shadow-xl">
            ⚠️
          </div>
          <h2 className="text-lg font-black text-white">అప్లికేషన్ లోడింగ్ లో సమస్య ఏర్పడింది</h2>
          <p className="text-xs text-slate-400 max-w-sm">
            బూత్ డేటా లేదా బ్రౌజర్ క్యాష్ వల్ల ఈ లోపం సంభవించి ఉండవచ్చు. దయచేసి కింది బటన్ క్లిక్ చేసి క్యాష్ క్లియర్ చేసి రీలోడ్ చేయండి.
          </p>

          <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl max-w-md w-full text-left overflow-auto max-h-48 text-[11px] font-mono text-red-200">
            {this.state.error?.toString()}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={this.handleClearCacheAndReset}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black rounded-xl text-xs shadow-lg"
            >
              🔄 క్యాష్ క్లియర్ చేసి రీలోడ్ చేయండి (Reset App)
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs border border-slate-700"
            >
              రీఫ్రెష్
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>,
);
