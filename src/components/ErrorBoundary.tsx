import { Component, type ErrorInfo, type ReactNode } from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router';

/** A lazy chunk that no longer exists on the server (app updated while open): reloading fixes it. */
function isChunkLoadError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /dynamically imported module|Importing a module script failed|Failed to fetch|Loading chunk/i.test(
      error.message,
    )
  );
}

function ErrorScreen({ error }: { error: unknown }) {
  const chunk = isChunkLoadError(error);
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center py-10 pt-safe px-safe text-center">
      <h1 className="text-xl font-bold">
        {chunk ? 'Nouvelle version disponible' : 'Oups, un problème est survenu'}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {chunk
          ? 'Une mise à jour a été installée pendant que l’application était ouverte. Recharge pour continuer.'
          : 'Tes données sont intactes : elles sont enregistrées au fur et à mesure. Recharge l’application pour continuer.'}
      </p>
      <div className="mt-6 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="min-h-12 rounded-xl bg-accent-fill px-4 font-semibold text-accent-fg active:opacity-80"
        >
          Recharger
        </button>
        <a
          href="/"
          className="flex min-h-12 items-center justify-center rounded-xl font-semibold text-accent"
        >
          Retour à l’accueil
        </a>
      </div>
      {import.meta.env.DEV && error instanceof Error && (
        <pre className="mt-6 overflow-x-auto rounded-xl bg-surface p-3 text-left text-xs text-danger">
          {error.stack}
        </pre>
      )}
    </div>
  );
}

/** Route-level error element: render errors and failed lazy loads inside the router. */
export function RouteError() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404)
    return <ErrorScreen error={new Error('Not found')} />;
  return <ErrorScreen error={error} />;
}

interface Props {
  children: ReactNode;
}

/** Last-resort boundary around the whole app (errors outside the router's own handling). */
export class ErrorBoundary extends Component<Props, { error: unknown }> {
  override state: { error: unknown } = { error: undefined };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('Unhandled UI error', error, info.componentStack);
  }

  override render() {
    return this.state.error !== undefined ? <ErrorScreen error={this.state.error} /> : this.props.children;
  }
}
