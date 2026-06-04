import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  handleRetry = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4">
        <div className="w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-950 p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-white">
            Sh*t broke, my bad...
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Something went wrong on our end. Give it another shot.
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-6 inline-flex h-9 w-full items-center justify-center rounded-md bg-violet-500 px-4 text-sm font-medium text-white transition-colors hover:bg-violet-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-400"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
