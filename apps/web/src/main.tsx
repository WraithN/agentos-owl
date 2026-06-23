import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";
import "./index.css";

Sentry.init({
  dsn: import.meta.env['VITE_SENTRY_DSN'] as string | undefined,
  environment: import.meta.env.MODE,
});

function ErrorFallback({ error, resetError }: { error: unknown; resetError: () => void }) {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  if (import.meta.env.DEV) {
    return (
      <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        <h2 style={{ color: '#dc2626' }}>应用发生错误</h2>
        <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 8, overflow: 'auto' }}>
          {message}
          {'\n'}
          {error instanceof Error ? error.stack : ''}
        </pre>
        <button onClick={resetError} style={{ marginTop: 12 }}>重试</button>
      </div>
    );
  }
  return <p>应用发生错误，请刷新页面重试</p>;
}

createRoot(document.getElementById("root")!).render(
  <Sentry.ErrorBoundary fallback={ErrorFallback} showDialog={false}>
    <AppWrapper>
      <App />
    </AppWrapper>
  </Sentry.ErrorBoundary>
);
