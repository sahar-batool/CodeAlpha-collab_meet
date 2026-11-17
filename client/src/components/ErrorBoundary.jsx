import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="grid h-full place-items-center p-6">
        <div className="max-w-md rounded-2xl border border-line bg-panel p-8 text-center">
          <h1 className="font-display text-xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-muted">The app hit an unexpected problem. Reloading usually fixes it.</p>
          {/* A full reload also releases the camera and microphone. */}
          <button
            onClick={() => window.location.assign('/')}
            className="mt-6 rounded-xl bg-accent px-5 py-2.5 font-medium text-accent-ink transition hover:brightness-110 active:scale-95"
          >
            Reload
          </button>
        </div>
      </main>
    );
  }
}