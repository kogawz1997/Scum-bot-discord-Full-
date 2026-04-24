import React from "react";
import { AlertTriangle } from "lucide-react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo,
    });
    console.error("ErrorBoundary caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-96 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/[0.05] p-6">
          <div className="text-center">
            <div className="flex justify-center">
              <AlertTriangle className="h-12 w-12 text-red-400" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-white">Something went wrong</h3>
            <p className="mt-2 text-sm text-zinc-400">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
              className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/20"
            >
              Try Again
            </button>
            {process.env.NODE_ENV === "development" && this.state.errorInfo && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-xs text-zinc-500">Error Details</summary>
                <pre className="mt-2 overflow-auto rounded bg-zinc-900 p-2 text-xs text-zinc-400">
                  {this.state.error?.toString()}
                  {"\n\n"}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
