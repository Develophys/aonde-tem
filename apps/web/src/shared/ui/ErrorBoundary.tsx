import { Component, type ReactNode } from "react";

interface Props {
  readonly children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: unknown) {
    console.error("[ErrorBoundary]", error);
  }

  override render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-error/10 flex items-center justify-center mb-4 animate-badge-in">
          <svg
            className="w-9 h-9 text-error"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h1 className="text-lg font-bold text-text mb-2">Algo deu errado</h1>
        <p className="text-text-muted text-sm mb-8 max-w-xs">
          Tivemos um problema inesperado. Tente recarregar a página.
        </p>
        <button
          type="button"
          onClick={() => {
            this.setState({ hasError: false });
            window.location.assign("/");
          }}
          className="bg-brand text-white font-semibold px-8 py-3 rounded-full min-h-11"
        >
          Recarregar
        </button>
      </div>
    );
  }
}
