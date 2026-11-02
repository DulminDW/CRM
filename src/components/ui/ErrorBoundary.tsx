import { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // In production, send to privacy-filtered error monitor without leaking PII or credentials
    console.error('Unhandled Application Error:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-crm-bg flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl border border-crm-border p-6 shadow-sm text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Application Interruption</h2>
            <p className="text-xs text-slate-500 mt-2">
              An unexpected error occurred in the CRM interface. In accordance with zero-trust design, application state has been safely suspended.
            </p>
            <div className="mt-6 flex justify-center">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-crm-blue text-white text-xs font-semibold hover:bg-crm-blue-hover transition-colors shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Return to Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
