// Lightweight Sentry wrapper with no-op when DSN missing
let inited = false;
export function initSentry() {
  if (inited) return;
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
  if (!dsn) return; // no-op
  // Lazy import to avoid bundling when not configured
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sentry = require('@sentry/nextjs');
    Sentry.init({ dsn, tracesSampleRate: 0.1 });
    inited = true;
  } catch {}
}
export function captureException(err: any, context?: Record<string, any>) {
  try {
    const Sentry = require('@sentry/nextjs');
    if (Sentry?.captureException) {
      Sentry.captureException(err, { extra: context });
    }
  } catch {}
}
