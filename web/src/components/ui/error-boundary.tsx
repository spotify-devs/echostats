"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-accent-amber" />
          <h2 className="text-xl font-semibold text-white">Something went wrong</h2>
          <p className="text-sm text-white/40 max-w-md">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <RefreshCw className="w-4 h-4" /> Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
